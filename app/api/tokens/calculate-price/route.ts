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

    // Calculate the current value contribution of each stock position
    for (const asset of token.allocations) {
      const livePrice = parseFloat(await getAlpacaStockPrice(asset.tokenSymbol));
      
      // Value multiplier change: Current Price / Price at Creation
      const priceRatio = asset.initialPrice > 0 ? livePrice / asset.initialPrice : 1;
      const initialValueContribution = asset.percentage / 100;
      const currentValueContribution = initialValueContribution * priceRatio;

      assetValues[asset.tokenSymbol] = currentValueContribution;
      currentTotalNAV += currentValueContribution;
    }
    
    // Add the stable cash allocation contribution (always valued at $1.00)
    const cashValueContribution = token.usdAllocation / 100;
    currentTotalNAV += cashValueContribution;

    // Convert values back into percentages to show the drifted allocation mix
    const driftedAllocations = token.allocations.map((asset: any) => {
      const currentWeight = (assetValues[asset.tokenSymbol] / currentTotalNAV) * 100;
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