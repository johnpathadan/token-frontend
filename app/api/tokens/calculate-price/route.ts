import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Token from '@/models/Token';
import { getAlpacaStockPrice } from '@/lib/alpaca';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const token = await Token.findById(id);
    
    if (!token) return NextResponse.json({ error: "Token data missing" }, { status: 404 });

    let currentTotalNAV = 0;
    const assetValues: { [key: string]: number } = {};
    let databaseNeedsUpdate = false;

    // Loop through each asset allocation to calculate the current performance ratio
    for (const asset of token.allocations) {
      const livePrice = parseFloat(await getAlpacaStockPrice(asset.tokenSymbol));
      
      // 🚀 Fix: If an old document is missing a baseline, save it to the DB permanently ONCE
      if (!asset.initialPrice || asset.initialPrice === 0) {
        asset.initialPrice = livePrice;
        databaseNeedsUpdate = true;
      }

      // Calculate the true price ratio based on the fixed baseline
      const priceRatio = livePrice / asset.initialPrice;
      const initialValueContribution = asset.percentage / 100;
      const currentValueContribution = initialValueContribution * priceRatio;

      assetValues[asset.tokenSymbol] = currentValueContribution;
      currentTotalNAV += currentValueContribution;
    }
    
    // Add the cash portion (always worth $1.00)
    currentTotalNAV += (token.usdAllocation / 100);

    // If we patched any legacy baselines, save the changes to MongoDB
    if (databaseNeedsUpdate) {
      await token.save();
    }

    // Calculate the drifted allocation weights to return to the reallocation sliders
    const driftedAllocations = token.allocations.map((asset: any) => {
      const liveAssetValue = assetValues[asset.tokenSymbol] || 0;
      const currentWeight = currentTotalNAV > 0 ? (liveAssetValue / currentTotalNAV) * 100 : 0;
      return {
        tokenSymbol: asset.tokenSymbol,
        percentage: Math.round(currentWeight)
      };
    });

    const driftedUsdAllocation = Math.max(0, 100 - driftedAllocations.reduce((sum: number, a: any) => sum + a.percentage, 0));

    return NextResponse.json({ 
      price: currentTotalNAV,
      driftedAllocations,
      driftedUsdAllocation
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}