import { NextResponse } from 'next/server';
import { makeCrossmintRequest } from '@/app/utils/crossmint';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  try {
    const data = await makeCrossmintRequest(
      `/api/v1-alpha2/wallets/${walletAddress}/balances?tokens=credit,usdc`
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching balances:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch balances' },
      { status: 500 }
    );
  }
} 