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

    let netAssetValue = 0;
    for (const asset of token.allocations) {
      const livePrice = parseFloat(await getAlpacaStockPrice(asset.tokenSymbol));
      netAssetValue += (livePrice * (asset.percentage / 100));
    }
    netAssetValue += (1.00 * (token.usdAllocation / 100));

    return NextResponse.json({ price: netAssetValue });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}