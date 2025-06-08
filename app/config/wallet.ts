'use client';

import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { createConfig, http } from 'wagmi';
import { mainnet, base } from 'wagmi/chains';

export const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY || '';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

const { connectors } = getDefaultWallets({
  appName: 'Worldstore',
  projectId,
});

export const config = createConfig({
  chains: [mainnet, base],
  connectors,
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
});

export const walletConnectors = config.connectors.map((connector) => connector); 