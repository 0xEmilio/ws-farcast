'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface Balance {
  token: string;
  decimals: number;
  balances: {
    [chain: string]: string;
  };
}

interface FormattedBalances {
  [token: string]: string;
}

interface BalanceContextType {
  balances: Balance[];
  formattedBalances: FormattedBalances;
  refetchBalances: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType>({
  balances: [],
  formattedBalances: {},
  refetchBalances: async () => {},
});

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [formattedBalances, setFormattedBalances] = useState<FormattedBalances>({});
  const { address } = useAccount();

  const refetchBalances = async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/checkout/balance?address=${address}`);
      const data = await response.json();
      
      if (data.error) {
        console.error('Error fetching balances:', data.error);
        return;
      }

      setBalances(data.balances);

      // Format balances for display
      const formatted: FormattedBalances = {};
      data.balances.forEach((balance: Balance) => {
        const value = balance.balances['ethereum-sepolia'] || '0';
        const decimalValue = Number(value) / Math.pow(10, balance.decimals);
        formatted[balance.token] = decimalValue.toFixed(2);
      });
      setFormattedBalances(formatted);
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  useEffect(() => {
    if (address) {
      refetchBalances();
    }
  }, [address]);

  return (
    <BalanceContext.Provider value={{ balances, formattedBalances, refetchBalances }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalanceContext() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalanceContext must be used within a BalanceProvider');
  }
  return context;
} 