import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://www.crossmint.com/api/v1-alpha2/wallets/${address}/balances?tokens=usdc`,
      {
        headers: {
          'X-API-KEY': process.env.CROSSMINT_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch balance from Crossmint');
    }

    const data = await response.json();
    const usdcBalance = data[0]?.balances?.base || '0';

    // Convert from 6 decimals to 2 decimals for display
    const formattedBalance = (Number(usdcBalance) / 1000000).toString();

    return NextResponse.json({ balance: formattedBalance });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
} 