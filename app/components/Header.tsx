'use client';

import { ConnectWallet } from "@coinbase/onchainkit/wallet";

export function Header() {
  return (
    <header className="flex items-center justify-between p-4 bg-white shadow-sm">
      <div className="flex items-center space-x-2">
        <img src="/logo.png" alt="Logo" className="h-8 w-8" />
        <h1 className="text-xl font-bold">WorldStore</h1>
      </div>
      <ConnectWallet />
    </header>
  );
} 