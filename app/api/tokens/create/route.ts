import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
// import Token from '@/models/Token';
import Token from '@/models/Token';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const newToken = await Token.create(body);
    return NextResponse.json({ success: true, tokenId: newToken._id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}