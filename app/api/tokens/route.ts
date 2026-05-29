import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Token from '@/models/Token';
import { getAlpacaStockPrice } from '@/lib/alpaca';

export async function GET() {
  try {
    await connectToDatabase();
    const rawTokens = await Token.find({});
    const compiledTokens = [];

    for (const token of rawTokens) {
      let currentTotalNAV = 0;

      for (const asset of token.allocations) {
        const livePrice = parseFloat(await getAlpacaStockPrice(asset.tokenSymbol));
        const priceRatio = asset.initialPrice > 0 ? livePrice / asset.initialPrice : 1;
        currentTotalNAV += ((asset.percentage / 100) * priceRatio);
      }
      currentTotalNAV += (token.usdAllocation / 100);

      const percentageChange = (currentTotalNAV - 1.00) * 100;

      compiledTokens.push({
        id: token._id,
        name: token.name,
        symbol: token.symbol,
        logoBase64: token.logoBase64,
        creatorAddress: token.creatorAddress,
        contractAddress: token.contractAddress,
        price: currentTotalNAV,
        percentageChange: percentageChange
      });
    }

    return NextResponse.json({ success: true, tokens: compiledTokens });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}