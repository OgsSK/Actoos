import { createContext, useContext, useState, useCallback } from 'react';

const WalletContext = createContext(null);

// Types de transactions
export const TRANSACTION_TYPES = {
  TOPUP: 'topup',
  PAYMENT: 'payment',
  REFUND: 'refund',
  EARNING: 'earning', // Pour les livreurs
};

// Mock initial wallet data
const INITIAL_WALLET = {
  id: 'wallet-001',
  user_id: 'user-001',
  balance: 2500, // Solde initial en FCFA
  currency: 'XOF',
  is_active: true,
  created_at: new Date().toISOString(),
};

// Mock transactions history
const INITIAL_TRANSACTIONS = [
  {
    id: 'txn-001',
    wallet_id: 'wallet-001',
    transaction_type: TRANSACTION_TYPES.TOPUP,
    amount: 5000,
    balance_before: 0,
    balance_after: 5000,
    description: 'Recharge TouchPay',
    reference: 'TP-2024-001',
    status: 'completed',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'txn-002',
    wallet_id: 'wallet-001',
    transaction_type: TRANSACTION_TYPES.PAYMENT,
    amount: -2500,
    balance_before: 5000,
    balance_after: 2500,
    description: 'Commande #1245 - Maquis Chez Tanti',
    reference: 'ORD-1245',
    status: 'completed',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(INITIAL_WALLET);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [isLoading, setIsLoading] = useState(false);

  // Recharger le wallet (TopUp)
  const topUp = useCallback(async (amount, paymentMethod = 'touchpay') => {
    setIsLoading(true);
    
    // Simuler le délai de paiement TouchPay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newTransaction = {
      id: `txn-${Date.now()}`,
      wallet_id: wallet.id,
      transaction_type: TRANSACTION_TYPES.TOPUP,
      amount: amount,
      balance_before: wallet.balance,
      balance_after: wallet.balance + amount,
      description: `Recharge ${paymentMethod === 'touchpay' ? 'TouchPay' : paymentMethod}`,
      reference: `TP-${Date.now()}`,
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    
    setWallet(prev => ({
      ...prev,
      balance: prev.balance + amount,
    }));
    
    setTransactions(prev => [newTransaction, ...prev]);
    setIsLoading(false);
    
    return newTransaction;
  }, [wallet]);

  // Payer une commande
  const pay = useCallback(async (amount, orderId, description) => {
    if (wallet.balance < amount) {
      throw new Error('Solde insuffisant');
    }
    
    setIsLoading(true);
    
    // Simuler le traitement
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newTransaction = {
      id: `txn-${Date.now()}`,
      wallet_id: wallet.id,
      transaction_type: TRANSACTION_TYPES.PAYMENT,
      amount: -amount,
      balance_before: wallet.balance,
      balance_after: wallet.balance - amount,
      description: description || `Commande ${orderId}`,
      reference: orderId,
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    
    setWallet(prev => ({
      ...prev,
      balance: prev.balance - amount,
    }));
    
    setTransactions(prev => [newTransaction, ...prev]);
    setIsLoading(false);
    
    return newTransaction;
  }, [wallet]);

  // Rembourser
  const refund = useCallback(async (amount, orderId, description) => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newTransaction = {
      id: `txn-${Date.now()}`,
      wallet_id: wallet.id,
      transaction_type: TRANSACTION_TYPES.REFUND,
      amount: amount,
      balance_before: wallet.balance,
      balance_after: wallet.balance + amount,
      description: description || `Remboursement ${orderId}`,
      reference: orderId,
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    
    setWallet(prev => ({
      ...prev,
      balance: prev.balance + amount,
    }));
    
    setTransactions(prev => [newTransaction, ...prev]);
    setIsLoading(false);
    
    return newTransaction;
  }, [wallet]);

  // Vérifier si le solde est suffisant
  const hasEnoughBalance = useCallback((amount) => {
    return wallet.balance >= amount;
  }, [wallet.balance]);

  const value = {
    wallet,
    balance: wallet.balance,
    transactions,
    isLoading,
    topUp,
    pay,
    refund,
    hasEnoughBalance,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
