'use client';

import { useState } from 'react';
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
    selectedCurrency: 'credit' | 'usdc';
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

export default function BuyButton({ product, onOrderCreated }: BuyButtonProps) {
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

      <CheckoutModal
        isOpen={isOpen}
        onClose={handleClose}
        product={product}
        onOrderCreated={onOrderCreated}
      />
    </>
  );
} 