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

    for (const asset of token.allocations) {
      const livePrice = parseFloat(await getAlpacaStockPrice(asset.tokenSymbol));
      
      if (!asset.initialPrice || asset.initialPrice === 0) {
        asset.initialPrice = livePrice;
        databaseNeedsUpdate = true;
      }

      const priceRatio = livePrice / asset.initialPrice;
      const initialValueContribution = asset.percentage / 100;
      const currentValueContribution = initialValueContribution * priceRatio;

      assetValues[asset.tokenSymbol] = currentValueContribution;
      currentTotalNAV += currentValueContribution;
    }
    
    currentTotalNAV += (token.usdAllocation / 100);

    if (databaseNeedsUpdate) {
      await token.save();
    }

    const driftedAllocations = token.allocations.map((asset: any) => {
      const liveAssetValue = assetValues[asset.tokenSymbol] || 0;
      const currentWeight = currentTotalNAV > 0 ? (liveAssetValue / currentTotalNAV) * 100 : 0;
      return {
        tokenSymbol: asset.tokenSymbol,
        percentage: Math.round(currentWeight)
      };
    });

    const driftedUsdAllocation = Math.max(0, 100 - driftedAllocations.reduce((sum: number, a: any) => sum + a.percentage, 0));

    const basePriceMultiplier = token.basePrice || 1.0;
    const finalScaledContinuousPrice = currentTotalNAV * basePriceMultiplier;

    return NextResponse.json({ 
      price: finalScaledContinuousPrice,
      name: token.name,
      symbol: token.symbol,
      logoBase64: token.logoBase64,
      contractAddress: token.contractAddress,
      driftedAllocations,
      driftedUsdAllocation
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}