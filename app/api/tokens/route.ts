import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Token from '@/models/Token';
import { getAlpacaStockPrice } from '@/lib/alpaca';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch all active token parameters out of the database registry
    const tokens = await Token.find({}).sort({ createdAt: -1 });

    const updatedTokensList = await Promise.all(
      tokens.map(async (token: any) => {
        let currentTotalNAV = 0;

        // Run the dynamic performance drift loop for each asset row
        for (const asset of token.allocations) {
          try {
            const livePrice = parseFloat(await getAlpacaStockPrice(asset.tokenSymbol));
            const initialPrice = asset.initialPrice || livePrice;
            
            const priceRatio = livePrice / initialPrice;
            currentTotalNAV += (asset.percentage / 100) * priceRatio;
          } catch (priceError) {
            console.error(`Failed to ingest price stream for ${asset.tokenSymbol}:`, priceError);
            currentTotalNAV += (asset.percentage / 100); // Fallback to baseline weight if API drops
          }
        }

        // Add the residual USD liquidity anchor
        currentTotalNAV += (token.usdAllocation / 100);

        // 🚀 THE CORE FIX: Grab the basePrice scaling factor from the token document
        // Defaults cleanly to 1.0 if the token hasn't been reallocated yet
        const basePriceMultiplier = token.basePrice || 1.0;
        const finalScaledPrice = currentTotalNAV * basePriceMultiplier;

        // Calculate a dummy percentage tracker against its initial seed value
        const percentageChange = (finalScaledPrice - basePriceMultiplier) * 100;

        return {
          id: token._id.toString(),
          name: token.name,
          symbol: token.symbol,
          logoBase64: token.logoBase64,
          creatorAddress: token.creatorAddress,
          contractAddress: token.contractAddress,
          price: finalScaledPrice, // 🚀 Now perfectly matches your individual view price!
          percentageChange: percentageChange
        };
      })
    );

    return NextResponse.json({ success: true, tokens: updatedTokensList });
  } catch (error: any) {
    console.error("Directory array calculations crashed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}