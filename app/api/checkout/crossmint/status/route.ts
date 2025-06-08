import { NextResponse } from 'next/server';
import { makeCrossmintRequest } from '@/app/utils/crossmint';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json(
      { error: 'Order ID is required' },
      { status: 400 }
    );
  }

  try {
    const data = await makeCrossmintRequest(
      `/api/2022-06-09/orders/${orderId}`
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching order status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch order status' },
      { status: 500 }
    );
  }
} 