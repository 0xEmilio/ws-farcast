import https from 'https';
import { CROSSMINT_CONFIG } from '@/app/config/crossmint';

interface CrossmintRequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
}

export async function makeCrossmintRequest(
  endpoint: string,
  options: CrossmintRequestOptions = {}
) {
  const { method = 'GET', headers = {}, body } = options;
  const API_KEY = process.env.CROSSMINT_API_KEY;

  if (!API_KEY) {
    throw new Error('Crossmint API key not configured');
  }

  // Create a custom agent that ignores SSL certificate validation in development
  const agent = new https.Agent({
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  });

  const url = `${CROSSMINT_CONFIG.baseUrl}${endpoint}`;
  console.log(`Making Crossmint API request to: ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      // @ts-ignore - agent is valid but TypeScript doesn't recognize it
      agent,
    });

    const data = await response.json();
    console.log(`Crossmint API response status: ${response.status}`);
    console.log('Crossmint API response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.message || `Crossmint API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Crossmint API request failed:', error);
    if (error instanceof Error) {
      if (error.message.includes('certificate has expired')) {
        throw new Error('SSL certificate error - please check Crossmint API endpoint');
      }
      throw error;
    }
    throw new Error('Unknown error occurred while making Crossmint API request');
  }
} 