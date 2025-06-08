import { NextResponse } from 'next/server';
import { makeCrossmintRequest } from '@/app/utils/crossmint';

// Helper function to uppercase string values in an object
const uppercaseObjectValues = (obj: Record<string, any>): Record<string, any> => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = value.toUpperCase();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc[key] = uppercaseObjectValues(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Crossmint API - Request body:', JSON.stringify(body, null, 2));

    const { title, price, thumbnail, asin, email, shippingAddress, walletAddress, chain, currency } = body;

    if (!title || !price || !asin || !email || !shippingAddress || !walletAddress || !chain || !currency) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Uppercase email and shipping address
    const uppercasedEmail = email.toUpperCase();
    const uppercasedShippingAddress = uppercaseObjectValues(shippingAddress);

    const data = await makeCrossmintRequest('/api/2022-06-09/orders', {
      method: 'POST',
      body: {
        recipient: {
          email: uppercasedEmail,
          physicalAddress: {
            name: uppercasedShippingAddress.name,
            line1: uppercasedShippingAddress.address1,
            line2: uppercasedShippingAddress.address2 || "",
            city: uppercasedShippingAddress.city,
            postalCode: uppercasedShippingAddress.postalCode,
            country: uppercasedShippingAddress.country,
            state: uppercasedShippingAddress.province
          }
        },
        locale: "en-US",
        payment: {
          receiptEmail: uppercasedEmail,
          method: chain,
          currency: currency,
          payerAddress: walletAddress
        },
        lineItems: [
          {
            productLocator: `amazon:${asin}`
          }
        ]
      }
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Crossmint API - Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 