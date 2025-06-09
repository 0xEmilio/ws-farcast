'use client';

import { base } from 'wagmi/chains';

export const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY || '';

export const config = {
  chain: base,
  apiKey: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
  appearance: {
    mode: "auto",
    theme: "mini-app-theme",
    name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
    logo: process.env.NEXT_PUBLIC_ICON_URL,
  }
}; 