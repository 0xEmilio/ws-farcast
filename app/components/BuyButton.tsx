'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Loader2 } from 'lucide-react';
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useAccount, useWalletClient, useSignMessage, useSendTransaction, useChainId } from 'wagmi';
import { parseTransaction } from 'viem';
import { useBalanceContext } from '../contexts/BalanceContext';
import { base } from 'wagmi/chains';
import CheckoutModal from './CheckoutModal';

interface BuyButtonProps {
  product: {
    title: string;
    variant?: string;
    price: number | string;
    thumbnail: string;
    asin: string;
  };
  onOrderCreated?: (data: {
    orderData: any;
    quote: any;
    selectedCurrency: 'usdc';
    email: string;
    shippingAddress: {
      name: string;
      address1: string;
      address2: string;
      city: string;
      province: string;
      postalCode: string;
      country: string;
    };
  }) => void;
}

export function BuyButton({ product, onOrderCreated }: BuyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full bg-black text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Buy Now
      </button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg rounded-lg bg-white p-6 w-full relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
            <CheckoutModal
              isOpen={isOpen}
              onClose={handleClose}
              product={product}
              onOrderCreated={onOrderCreated}
            />
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
} 