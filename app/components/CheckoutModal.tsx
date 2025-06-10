'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { X, Loader2 } from 'lucide-react';
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useAccount, useWalletClient, useSignMessage, useSendTransaction, useChainId, useDisconnect, useBalance } from 'wagmi';
import { parseTransaction } from 'viem';
import { useBalanceContext } from '../contexts/BalanceContext';
import { base } from 'wagmi/chains';
import { Name, Identity, Address, Avatar, EthBalance } from "@coinbase/onchainkit/identity";
import { Wallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    title: string;
    variant?: string;
    price: number | string;
    thumbnail: string;
    asin: string;
  };
  initialOrderData?: {
    orderId: string;
    quote: Quote;
    selectedCurrency: Currency;
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
  };
  onOrderCreated?: (data: {
    orderData: any;
    quote: any;
    selectedCurrency: Currency;
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

type CheckoutPhase = 'details' | 'review' | 'signing' | 'processing' | 'success' | 'error';

type Currency = 'usdc';

interface OrderData {
  orderId: string;
  payment: {
    status: string;
    preparation?: {
      serializedTransaction: string;
      payerAddress: string;
      chain: string;
    };
  };
}

interface Quote {
  status: string;
  quotedAt: string;
  expiresAt: string;
  totalPrice: {
    amount: string;
    currency: string;
  };
}

interface Balance {
  token: Currency;
  decimals: number;
  balances: {
    [key: string]: string;
  };
}

export default function CheckoutModal({ isOpen, onClose, product, initialOrderData, onOrderCreated }: CheckoutModalProps) {
  const [phase, setPhase] = useState<'details' | 'review' | 'signing' | 'processing' | 'success' | 'error'>('details');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    address1: '',
    address2: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'US'
  });
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('usdc');
  const { address: walletAddress } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();
  const { sendTransaction, isPending, isError, error: txError } = useSendTransaction();
  const { balances } = useBalanceContext();
  const [email, setEmail] = useState(initialOrderData?.email || '');
  const { data: balance, refetch: refetchBalance } = useBalance({
    address: walletAddress,
    token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC token address
  });
  const [isConfirming, setIsConfirming] = useState(false);

  // Get chain name from chainId
  const getChainName = (id: number) => {
    return 'base';
  };

  // Get current chain name
  const currentChainName = getChainName(chainId);

  // Get current balance for selected currency and chain
  const getCurrentBalance = () => {
    const balance = balances?.find(b => b.token === selectedCurrency);
    if (!balance) return '0';
    return balance.balances[currentChainName] || '0';
  };

  // Get formatted balance for selected currency and chain
  const getFormattedBalance = () => {
    const balance = balances?.find(b => b.token === selectedCurrency);
    if (!balance) return '0';
    const value = balance.balances[currentChainName] || '0';
    // Convert to number and divide by 10^decimals
    const decimalValue = Number(value) / Math.pow(10, balance.decimals);
    return decimalValue.toFixed(2);
  };

  // Convert decimal amount to proper decimal places for comparison
  const convertToRawAmount = (amount: string | number) => {
    const balance = balances.find(b => b.token === selectedCurrency);
    if (!balance) return '0';
    const amountStr = amount.toString();
    const [whole, fraction = ''] = amountStr.split('.');
    const paddedFraction = fraction.padEnd(balance.decimals, '0');
    return `${whole}${paddedFraction}`;
  };

  // Compare raw balance values
  const hasEnoughBalance = (requiredAmount: string | number) => {
    const currentBalance = getCurrentBalance();
    const rawRequiredAmount = convertToRawAmount(requiredAmount);
    return BigInt(currentBalance) >= BigInt(rawRequiredAmount);
  };

  const hasInsufficientFunds = quote ? !hasEnoughBalance(quote.totalPrice.amount) : false;

  const formatPrice = (price: string | number) => {
    return `${price} ${selectedCurrency.toUpperCase()}`;
  };

  const formatQuoteExpiration = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));
    return `${diffInMinutes} minutes`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Helper function to uppercase string values
  const uppercaseValue = (value: string) => value.toUpperCase();

  const resetModal = () => {
    setLoading(false);
    setError(null);
    setEmail('');
    setShippingAddress({
      name: '',
      address1: '',
      address2: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'US'
    });
    setPhase('details');
    setOrderId(null);
    setQuote(null);
    setOrderData(null);
    setSelectedCurrency('usdc');
  };

  const handleDetailsSubmit = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!email || !shippingAddress.name || !shippingAddress.address1 || !shippingAddress.city || !shippingAddress.province || !shippingAddress.postalCode || !shippingAddress.country) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert all string values to uppercase
      const uppercasedEmail = email.toUpperCase();
      const uppercasedShippingAddress = {
        name: shippingAddress.name.toUpperCase(),
        address1: shippingAddress.address1.toUpperCase(),
        address2: shippingAddress.address2?.toUpperCase() || '',
        city: shippingAddress.city.toUpperCase(),
        province: shippingAddress.province.toUpperCase(),
        postalCode: shippingAddress.postalCode.toUpperCase(),
        country: shippingAddress.country.toUpperCase()
      };

      console.log('handleDetailsSubmit - Sending request to:', '/api/checkout/crossmint');
      console.log('Request data:', {
        product,
        email: uppercasedEmail,
        shippingAddress: uppercasedShippingAddress,
        selectedCurrency,
      });

      const response = await fetch('/api/checkout/crossmint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...product,
          email: uppercasedEmail,
          shippingAddress: uppercasedShippingAddress,
          walletAddress,
          chain: getChainName(chainId),
          currency: selectedCurrency
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        throw new Error(errorData.error || 'Failed to create order');
      }

      const data = await response.json();
      console.log('API Response:', data);

      setOrderData(data.order);
      setQuote(data.order.quote);
      setPhase('review');
    } catch (err) {
      console.error('Order creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    console.log('handleReview called with state:', {
      walletAddress,
      chainId,
      email,
      shippingAddress,
      selectedCurrency
    });

    if (!walletAddress) {
      console.log('No wallet address found');
      setError('Please connect your wallet first');
      return;
    }

    if (!chainId) {
      console.log('No chain ID found');
      setError('Please select a network first');
      return;
    }

    if (!email) {
      console.log('No email provided');
      setError('Please enter your email');
      return;
    }

    if (!shippingAddress.name || !shippingAddress.address1 || !shippingAddress.city || 
        !shippingAddress.province || !shippingAddress.postalCode) {
      console.log('Incomplete shipping address:', shippingAddress);
      setError('Please fill in all required shipping address fields');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const chainName = getChainName(chainId);
      const requestData = {
        ...product,
        email,
        shippingAddress,
        walletAddress,
        chain: chainName,
        currency: selectedCurrency
      };
      
      console.log('Sending request to Crossmint with data:', requestData);
      console.log('API Endpoint:', '/api/checkout/crossmint');

      const response = await fetch('/api/checkout/crossmint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('Crossmint API Response:', data);

      if (!response.ok) {
        console.error('Crossmint API Error:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        if (data.error?.includes('SELLER_CONFIG_INVALID')) {
          throw new Error('Please double check your shipping address and try again');
        }
        throw new Error(data.error || 'Failed to get quote');
      }

      console.log('Setting order data:', {
        orderId: data.order.orderId,
        quote: data.order.quote,
        payment: data.order.payment
      });

      setQuote(data.order.quote);
      setOrderId(data.order.orderId);
      setOrderData({
        orderId: data.order.orderId,
        payment: data.order.payment
      });
      setPhase('review');
    } catch (err) {
      console.error('Quote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get quote');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    console.log('handleFinalize called with state:', {
      walletClient: !!walletClient,
      orderData,
      selectedCurrency
    });

    if (!walletClient || !orderData?.payment?.preparation?.serializedTransaction) {
      console.error('Invalid order data:', orderData);
      setError('Unable to process your order. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { serializedTransaction } = orderData.payment.preparation;
      const txHex = serializedTransaction.startsWith('0x') ? serializedTransaction : `0x${serializedTransaction}`;
      const tx = parseTransaction(txHex as `0x${string}`);
      
      console.log('Parsed transaction:', tx);

      await sendTransaction({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: BigInt(0),
        chainId: Number(tx.chainId)
      });

      // Note: We don't need to handle success/error here as the useEffect will handle it
      setPhase('processing');

    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process checkout');
      setPhase('error');
      setIsConfirming(false);
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Reset order-related state
    setOrderData(null);
    setQuote(null);
    setOrderId(null);
    // Return to details phase
    setPhase('details');
  };

  const handleClose = () => {
    console.log('Modal closing, resetting state');
    resetModal();
    onClose();
  };

  // Function to check if balance is sufficient
  const hasSufficientBalance = () => {
    if (!balance || !quote) return false;
    return Number(balance.formatted) >= Number(quote.totalPrice.amount);
  };

  // Function to handle balance refresh
  const handleBalanceRefresh = async () => {
    await refetchBalance();
    // If balance becomes sufficient, update the quote
    if (hasSufficientBalance()) {
      setOrderData(null); // Reset order data to allow new quote
    }
  };

  // Watch for transaction state changes
  useEffect(() => {
    if (isPending) {
      setPhase('signing');
      setIsConfirming(true);
    } else if (isError) {
      console.log('Transaction error:', txError);
      // Check if it's a user rejection
      const errorMessage = txError?.message?.toLowerCase() || '';
      const isUserRejected = 
        txError?.code === 4001 || 
        errorMessage.includes('user denied') || 
        errorMessage.includes('user rejected') ||
        errorMessage.includes('rejected') ||
        errorMessage.includes('denied');

      if (isUserRejected) {
        console.log('🛑 User rejected the transaction');
        setIsConfirming(false);
        setLoading(false);
        setPhase('review');
      } else {
        setError(txError?.message || 'Transaction failed');
        setPhase('error');
        setIsConfirming(false);
        setLoading(false);
      }
    }
  }, [isPending, isError, txError]);

  const renderDetailsContent = () => {
    return (
      <div className="space-y-6 bg-white">
        {!walletAddress && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">Please connect your wallet to continue</p>
            <div className="mt-4">
              <ConnectWallet />
            </div>
          </div>
        )}

        {walletAddress && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-900">Connected</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                <button
                  onClick={() => {
                    // Reset the form state
                    setPhase('details');
                    setOrderId(null);
                    setQuote(null);
                    setOrderData(null);
                    // Properly disconnect using wagmi
                    disconnect();
                  }}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product Information */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-24 h-24 bg-gray-50 rounded-lg flex items-center justify-center">
            <img
              src={product.thumbnail}
              alt={product.title}
              className="w-full h-full object-contain p-2"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">{product.title}</h3>
            {product.variant && (
              <p className="text-sm text-gray-500">Variant: {product.variant}</p>
            )}
            <p className="text-lg font-medium text-gray-900 mt-2">
              {product.price} {selectedCurrency.toUpperCase()}
            </p>
          </div>
        </div>

        {walletAddress && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Currency</label>
            <div className="relative mt-1">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
                className="w-full appearance-none rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <option value="usdc">USDC</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 bg-white text-black shadow-sm focus:border-black focus:ring-2 focus:ring-black focus:ring-opacity-50 pl-4"
            required
          />
        </div>

        {/* Shipping Address */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Shipping Address</label>
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={shippingAddress.name}
                onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))}
                className="block w-full rounded-md border-2 border-gray-300 bg-white text-black shadow-sm focus:border-black focus:ring-2 focus:ring-black focus:ring-opacity-50 pl-4"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input
                type="text"
                placeholder="Street address, P.O. box"
                value={shippingAddress.address1}
                onChange={(e) => setShippingAddress(prev => ({ ...prev, address1: e.target.value }))}
                className="block w-full rounded-md border-2 border-gray-300 bg-white text-black shadow-sm focus:border-black focus:ring-2 focus:ring-black focus:ring-opacity-50 pl-4"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (Optional)</label>
              <input
                type="text"
                placeholder="Apartment, suite, unit, building, floor, etc."
                value={shippingAddress.address2}
                onChange={(e) => setShippingAddress(prev => ({ ...prev, address2: e.target.value }))}
                className="block w-full rounded-md border-2 border-gray-300 bg-white text-black shadow-sm focus:border-black focus:ring-2 focus:ring-black focus:ring-opacity-50 pl-4"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  placeholder="Enter city"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                  className="block w-full rounded-md border-2 border-gray-300 bg-white text-black shadow-sm focus:border-black focus:ring-2 focus:ring-black focus:ring-opacity-50 pl-4"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province/State</label>
                <input
                  type="text"
                  placeholder="Enter province/state"
                  value={shippingAddress.province}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, province: e.target.value }))}
                  className="block w-full rounded-md border-2 border-gray-300 bg-white text-black shadow-sm focus:border-black focus:ring-2 focus:ring-black focus:ring-opacity-50 pl-4"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
              <input
                type="text"
                placeholder="Enter postal code"
                value={shippingAddress.postalCode}
                onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                className="block w-full rounded-md border-2 border-gray-300 bg-white text-black shadow-sm focus:border-black focus:ring-2 focus:ring-black focus:ring-opacity-50 pl-4"
                required
              />
            </div>
          </div>
        </div>

        
        {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleDetailsSubmit}
            disabled={loading || !walletAddress}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Review Order'}
            
          </button>
        </div>
      </div>
    );
  };

  const renderReviewContent = () => {
    if (!orderData || !walletAddress) return null;

    // Check for insufficient funds error in the order response
    const hasInsufficientFunds = orderData.payment?.status === 'crypto-payer-insufficient-funds';
    const canFinalize = hasSufficientBalance();

    if (isConfirming) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="text-lg font-medium text-gray-900">
            {phase === 'signing' ? 'Confirming transaction...' : 'Processing transaction...'}
          </p>
          <p className="text-sm text-gray-500">
            {phase === 'signing' 
              ? 'Please check your wallet to approve the transaction'
              : 'Please wait while we process your transaction'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Product Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Product Details</h3>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-24 h-24 bg-gray-50 rounded-lg flex items-center justify-center">
              <img
                src={product.thumbnail}
                alt={product.title}
                className="w-full h-full object-contain p-2"
              />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-medium text-gray-900">{product.title}</h4>
              {product.variant && (
                <p className="text-sm text-gray-500">Variant: {product.variant}</p>
              )}
            </div>
          </div>
        </div>

        {/* Quote Details */}
        {quote && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Quote Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Price:</span>
                  <span className="text-gray-900">{formatPrice(quote.totalPrice.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Expires in:</span>
                  <span className="text-gray-900">{formatQuoteExpiration(quote.expiresAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Your Balance:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-900">
                      {balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}
                    </span>
                    <button
                      onClick={handleReview}
                      className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                      title="Refresh balance"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-gray-900">{formatPrice(quote.totalPrice.amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {hasInsufficientFunds && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Insufficient {selectedCurrency.toUpperCase()} balance. Please go back to change your wallet, currency, or top up your balance.</span>
              </div>
            )}
          </div>
        )}

        {/* Shipping Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Shipping Information</h3>
          <div className="space-y-2 text-sm text-gray-500">
            <p>{shippingAddress.name.toUpperCase()}</p>
            <p>{shippingAddress.address1.toUpperCase()}</p>
            {shippingAddress.address2 && <p>{shippingAddress.address2.toUpperCase()}</p>}
            <p>{`${shippingAddress.city.toUpperCase()}, ${shippingAddress.province.toUpperCase()} ${shippingAddress.postalCode.toUpperCase()}`}</p>
            <p>{shippingAddress.country.toUpperCase()}</p>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{selectedCurrency.toUpperCase()}</span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-500">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
          </div>
        </div>

        <div className="flex justify-between space-x-4">
          <div className="flex space-x-4">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Back
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cancel
            </button>
          </div>
          <button
            onClick={canFinalize ? handleFinalize : handleDetailsSubmit}
            disabled={loading || hasInsufficientFunds}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
              loading || hasInsufficientFunds
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black'
            }`}
          >
            {loading ? 'Processing...' : canFinalize ? 'Finalize Order' : 'Update Quote'}
          </button>
        </div>
      </div>
    );
  };

  const renderSuccessContent = () => {
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="mt-4 text-lg font-medium text-gray-900">Order Successful!</p>
        <p className="mt-2 text-sm text-gray-500">Thank you for your purchase</p>
        <button
          onClick={handleClose}
          className="mt-6 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800"
        >
          Close
        </button>
      </div>
    );
  };

  const renderContent = () => {
    switch (phase) {
      case 'details':
        return renderDetailsContent();
      case 'review':
        return renderReviewContent();
      case 'success':
        return renderSuccessContent();
      default:
        return null;
    }
  };

  useEffect(() => {
    console.log('CheckoutModal mounted with props:', {
      isOpen,
      product,
      initialOrderData
    });
  }, []);

  useEffect(() => {
    console.log('initialOrderData changed:', initialOrderData);
    if (initialOrderData) {
      console.log('Setting initial order data:', {
        email: initialOrderData.email,
        shippingAddress: initialOrderData.shippingAddress,
        orderId: initialOrderData.orderId,
        quote: initialOrderData.quote,
        selectedCurrency: initialOrderData.selectedCurrency
      });
      setEmail(initialOrderData.email);
      setShippingAddress(initialOrderData.shippingAddress);
      setOrderId(initialOrderData.orderId);
      setQuote(initialOrderData.quote);
      setSelectedCurrency(initialOrderData.selectedCurrency);
      setPhase('review');
    }
  }, [initialOrderData]);

  useEffect(() => {
    console.log('Phase changed:', phase);
  }, [phase]);

  useEffect(() => {
    console.log('Quote updated:', quote);
  }, [quote]);

  useEffect(() => {
    console.log('Order data updated:', orderData);
  }, [orderData]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {phase === 'signing' || phase === 'processing' ? 'Confirming Transaction' : 'Checkout'}
          </DialogTitle>
        </DialogHeader>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        {phase === 'details' && renderDetailsContent()}
        {phase === 'review' && renderReviewContent()}
        {phase === 'signing' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="text-lg font-medium text-gray-900">Confirming transaction...</p>
            <p className="text-sm text-gray-500">Please check your wallet to approve the transaction</p>
          </div>
        )}
        {phase === 'processing' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="text-lg font-medium text-gray-900">Processing transaction...</p>
            <p className="text-sm text-gray-500">Please wait while we process your transaction</p>
          </div>
        )}
        {phase === 'success' && (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Order Successful!</h3>
            <p className="text-sm text-gray-500">Your order has been placed successfully.</p>
          </div>
        )}
        {phase === 'error' && (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Order Failed</h3>
            <p className="text-sm text-gray-500">{error || 'There was an error processing your order.'}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 