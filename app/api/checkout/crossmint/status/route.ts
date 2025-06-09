import { NextResponse } from 'next/server';
import https from 'https';
import { CROSSMINT_CONFIG } from '@/app/config/crossmint';

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
    const API_KEY = process.env.CROSSMINT_API_KEY;
    if (!API_KEY) {
      console.error('Crossmint API - API key not configured');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Create a custom agent that ignores SSL certificate validation in development
    const agent = new https.Agent({
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    });

    const response = await fetch(
      `${CROSSMINT_CONFIG.baseUrl}/api/2022-06-09/orders/${orderId}`,
      {
        headers: {
          'X-API-KEY': API_KEY,
          'origin': 'https://farcaster.xyz'
        },
        // @ts-ignore - agent is valid but TypeScript doesn't recognize it
        agent
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch order status');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching order status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order status' },
      { status: 500 }
    );
  }
} 