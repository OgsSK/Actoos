import { createContext, useContext, useState, useCallback } from 'react';

const WalletContext = createContext(null);

// Types de transactions
export const TRANSACTION_TYPES = {
  TOPUP: 'topup',
  PAYMENT: 'payment',
  REFUND: 'refund',
  EARNING: 'earning',
  TRANSFER_OUT: 'transfer_out',
  TRANSFER_IN: 'transfer_in',
  CORPORATE_TOPUP: 'corporate_topup',
};

// Types de wallet
export const WALLET_TYPES = {
  PERSONAL: 'personal',
  CORPORATE: 'corporate',
  EMPLOYEE: 'employee',
};

// Mock initial wallet data
const INITIAL_WALLET = {
  id: 'wallet-001',
  user_id: 'user-001',
  balance: 2500,
  currency: 'XOF',
  is_active: true,
  wallet_type: WALLET_TYPES.PERSONAL, // personal, corporate, employee
  parent_wallet_id: null,
  daily_spend_limit: null, // null = pas de limite
  company_name: null,
  pin_hash: '1234', // Mock PIN (en prod: hash bcrypt)
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
    created_at: new Date().toISOString(),
  },
];

// Mock utilisateurs pour P2P
const MOCK_USERS = {
  '+22370123456': { name: 'Mamadou Diallo', wallet_id: 'wallet-002' },
  '+22366987654': { name: 'Fatoumata Keita', wallet_id: 'wallet-003' },
  '+22376554433': { name: 'Ibrahim Sanogo', wallet_id: 'wallet-004' },
};

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(INITIAL_WALLET);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [isLoading, setIsLoading] = useState(false);

  // Calculer les dépenses du jour (pour wallet employee)
  const getTodaySpending = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return transactions
      .filter(txn => {
        const txnDate = new Date(txn.created_at);
        return txn.transaction_type === TRANSACTION_TYPES.PAYMENT && txnDate >= today;
      })
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
  }, [transactions]);

  // Vérifier limite corporate
  const checkCorporateLimit = useCallback((amount) => {
    if (wallet.wallet_type !== WALLET_TYPES.EMPLOYEE || !wallet.daily_spend_limit) {
      return { allowed: true };
    }

    const todaySpent = getTodaySpending();
    const remaining = wallet.daily_spend_limit - todaySpent;

    if (todaySpent + amount > wallet.daily_spend_limit) {
      return {
        allowed: false,
        daily_limit: wallet.daily_spend_limit,
        today_spent: todaySpent,
        remaining: remaining,
        requested: amount,
        error: 'Limite journalière atteinte',
      };
    }

    return {
      allowed: true,
      daily_limit: wallet.daily_spend_limit,
      today_spent: todaySpent,
      remaining: remaining,
    };
  }, [wallet, getTodaySpending]);

  // Recharger le wallet (TopUp)
  const topUp = useCallback(async (amount, paymentMethod = 'touchpay') => {
    setIsLoading(true);
    
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
    // Vérifier limite corporate
    const limitCheck = checkCorporateLimit(amount);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.error);
    }

    if (wallet.balance < amount) {
      throw new Error('Solde insuffisant');
    }
    
    setIsLoading(true);
    
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
  }, [wallet, checkCorporateLimit]);

  // Transfert P2P
  const transfer = useCallback(async (recipientPhone, amount, description) => {
    const phone = recipientPhone.replace(/\s/g, '');
    
    // Vérifier destinataire (mock)
    const recipient = MOCK_USERS[phone];
    if (!recipient) {
      throw new Error('Destinataire non trouvé');
    }

    if (wallet.balance < amount) {
      throw new Error('Solde insuffisant');
    }
    
    setIsLoading(true);
    
    // Simuler le délai de transaction
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const txnId = `txn-${Date.now()}`;
    const newBalance = wallet.balance - amount;
    
    const newTransaction = {
      id: txnId,
      wallet_id: wallet.id,
      transaction_type: TRANSACTION_TYPES.TRANSFER_OUT,
      amount: -amount,
      balance_before: wallet.balance,
      balance_after: newBalance,
      description: description || `Envoi à ${recipient.name}`,
      reference: `P2P-${Date.now()}`,
      counterpart_wallet_id: recipient.wallet_id,
      receiver_name: recipient.name,
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    
    setWallet(prev => ({
      ...prev,
      balance: newBalance,
    }));
    
    setTransactions(prev => [newTransaction, ...prev]);
    setIsLoading(false);
    
    return {
      success: true,
      transaction_id: txnId,
      receiver_name: recipient.name,
      amount: amount,
      new_balance: newBalance,
    };
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

  // Valider le PIN
  const validatePIN = useCallback((pin) => {
    return pin === wallet.pin_hash;
  }, [wallet.pin_hash]);

  // Vérifier si le solde est suffisant
  const hasEnoughBalance = useCallback((amount) => {
    return wallet.balance >= amount;
  }, [wallet.balance]);

  // Passer en mode Corporate/Employee (pour démo)
  const setWalletType = useCallback((type, options = {}) => {
    setWallet(prev => ({
      ...prev,
      wallet_type: type,
      daily_spend_limit: options.daily_limit || null,
      parent_wallet_id: options.parent_wallet_id || null,
      company_name: options.company_name || null,
    }));
  }, []);

  const value = {
    wallet,
    balance: wallet.balance,
    walletType: wallet.wallet_type,
    dailySpendLimit: wallet.daily_spend_limit,
    companyName: wallet.company_name,
    transactions,
    isLoading,
    topUp,
    pay,
    transfer,
    refund,
    validatePIN,
    hasEnoughBalance,
    checkCorporateLimit,
    getTodaySpending,
    setWalletType,
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
