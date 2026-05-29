import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Token from '@/models/Token';
import { getAlpacaStockPrice } from '@/lib/alpaca';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, name, symbol, logoBase64, creatorAddress, allocations, usdAllocation, contractAddress } = body;

    // Fetch the latest Alpaca prices to set as the new baseline for each asset
    const allocationsWithBaselines = await Promise.all(
      allocations.map(async (asset: any) => {
        const currentMktPrice = parseFloat(await getAlpacaStockPrice(asset.tokenSymbol));
        return {
          tokenSymbol: asset.tokenSymbol,
          percentage: asset.percentage,
          initialPrice: currentMktPrice
        };
      })
    );

    if (id) {
      // 🚀 Creator is reallocating: Update the existing token and reset baselines
      const updatedToken = await Token.findByIdAndUpdate(
        id,
        {
          allocations: allocationsWithBaselines,
          usdAllocation
        },
        { new: true }
      );
      return NextResponse.json({ success: true, tokenId: updatedToken._id });
    } else {
      // Creator is generating a brand new token
      const newToken = await Token.create({
        name,
        symbol,
        logoBase64,
        creatorAddress: creatorAddress.toLowerCase(),
        contractAddress,
        allocations: allocationsWithBaselines,
        usdAllocation
      });
      return NextResponse.json({ success: true, tokenId: newToken._id });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}