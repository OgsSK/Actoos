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
  TRANSFER_PENDING: 'transfer_pending', // Pour non-inscrits
  CORPORATE_TOPUP: 'corporate_topup',
};

// Statuts de transaction
export const TRANSACTION_STATUS = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  PENDING_REGISTRATION: 'pending_registration', // En attente d'inscription
  FAILED: 'failed',
};

// Types de wallet
export const WALLET_TYPES = {
  PERSONAL: 'personal',
  CORPORATE: 'corporate',
  EMPLOYEE: 'employee',
  SUB_WALLET: 'sub_wallet', // Sous-wallet (enfant/employé)
};

// Mock initial wallet data
const INITIAL_WALLET = {
  id: 'wallet-001',
  user_id: 'user-001',
  balance: 15000,
  currency: 'XOF',
  is_active: true,
  wallet_type: WALLET_TYPES.PERSONAL,
  parent_wallet_id: null,
  wallet_name: null, // Ex: "Cantine Karim"
  // Smart Rules (pour sous-wallets)
  daily_spend_limit: null,
  allowed_time_start: null, // Ex: '11:00'
  allowed_time_end: null, // Ex: '15:00'
  allowed_categories: null, // Ex: ['restaurant']
  company_name: null,
  pin_hash: '1234',
  created_at: new Date().toISOString(),
};

// Sous-wallets mockés
const INITIAL_SUB_WALLETS = [
  {
    id: 'sub-wallet-001',
    parent_wallet_id: 'wallet-001',
    wallet_name: 'Cantine Karim',
    linked_phone: '+223 76 12 34 56',
    balance: 5000, // Partagé depuis le parent
    daily_spend_limit: 3000,
    allowed_time_start: '11:00',
    allowed_time_end: '15:00',
    allowed_categories: ['restaurant'],
    is_active: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock transactions history
const INITIAL_TRANSACTIONS = [
  {
    id: 'txn-001',
    wallet_id: 'wallet-001',
    transaction_type: TRANSACTION_TYPES.TOPUP,
    amount: 20000,
    balance_before: 0,
    balance_after: 20000,
    description: 'Recharge TouchPay',
    reference: 'TP-2024-001',
    status: TRANSACTION_STATUS.COMPLETED,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'txn-002',
    wallet_id: 'wallet-001',
    transaction_type: TRANSACTION_TYPES.PAYMENT,
    amount: -5000,
    balance_before: 20000,
    balance_after: 15000,
    description: 'Commande #1245 - Maquis Chez Tanti',
    reference: 'ORD-1245',
    status: TRANSACTION_STATUS.COMPLETED,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock utilisateurs ACTOOS (inscrits)
const MOCK_USERS = {
  '+22370123456': { name: 'Mamadou Diallo', wallet_id: 'wallet-002', isRegistered: true },
  '+22366987654': { name: 'Fatoumata Keita', wallet_id: 'wallet-003', isRegistered: true },
  '+22376554433': { name: 'Ibrahim Sanogo', wallet_id: 'wallet-004', isRegistered: true },
};

// Transferts en attente (vers non-inscrits)
const INITIAL_PENDING_TRANSFERS = [];

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(INITIAL_WALLET);
  const [subWallets, setSubWallets] = useState(INITIAL_SUB_WALLETS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [pendingTransfers, setPendingTransfers] = useState(INITIAL_PENDING_TRANSFERS);
  const [isLoading, setIsLoading] = useState(false);

  // Calculer les dépenses du jour (pour wallet employee/sub_wallet)
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

  // Vérifier les Smart Rules d'un sous-wallet
  const checkSmartRules = useCallback((subWallet, amount, category = 'restaurant') => {
    const errors = [];

    // 1. Vérifier limite journalière
    if (subWallet.daily_spend_limit) {
      const todaySpent = getTodaySpending();
      if (todaySpent + amount > subWallet.daily_spend_limit) {
        errors.push(`Limite journalière atteinte (${subWallet.daily_spend_limit.toLocaleString()} FCFA)`);
      }
    }

    // 2. Vérifier heures autorisées
    if (subWallet.allowed_time_start && subWallet.allowed_time_end) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      if (currentTime < subWallet.allowed_time_start || currentTime > subWallet.allowed_time_end) {
        errors.push(`Hors des heures autorisées (${subWallet.allowed_time_start} - ${subWallet.allowed_time_end})`);
      }
    }

    // 3. Vérifier catégories autorisées
    if (subWallet.allowed_categories && subWallet.allowed_categories.length > 0) {
      if (!subWallet.allowed_categories.includes(category.toLowerCase())) {
        errors.push(`Catégorie non autorisée (autorisé: ${subWallet.allowed_categories.join(', ')})`);
      }
    }

    return {
      allowed: errors.length === 0,
      errors,
    };
  }, [getTodaySpending]);

  // Vérifier limite corporate (pour employee)
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
      status: TRANSACTION_STATUS.COMPLETED,
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
  const pay = useCallback(async (amount, orderId, description, category = 'restaurant') => {
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
      status: TRANSACTION_STATUS.COMPLETED,
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

  // Vérifier si un numéro est inscrit sur ACTOOS
  const checkRecipient = useCallback((phone) => {
    const cleanPhone = phone.replace(/\s/g, '');
    const user = MOCK_USERS[cleanPhone];
    
    return {
      isRegistered: !!user,
      user: user || null,
    };
  }, []);

  // Transfert P2P (avec support non-inscrits)
  const transfer = useCallback(async (recipientPhone, amount, description) => {
    const phone = recipientPhone.replace(/\s/g, '');
    
    if (wallet.balance < amount) {
      throw new Error('Solde insuffisant');
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Vérifier si destinataire est inscrit
    const recipientCheck = checkRecipient(phone);
    
    const transactionId = `TRF-${Date.now()}`;
    const newBalance = wallet.balance - amount;

    if (recipientCheck.isRegistered) {
      // Transfert instantané vers utilisateur inscrit
      const newTransaction = {
        id: `txn-${Date.now()}`,
        wallet_id: wallet.id,
        transaction_type: TRANSACTION_TYPES.TRANSFER_OUT,
        amount: -amount,
        balance_before: wallet.balance,
        balance_after: newBalance,
        description: description || `Envoi à ${recipientCheck.user.name}`,
        reference: transactionId,
        recipient_phone: phone,
        recipient_name: recipientCheck.user.name,
        status: TRANSACTION_STATUS.COMPLETED,
        created_at: new Date().toISOString(),
      };
      
      setWallet(prev => ({ ...prev, balance: newBalance }));
      setTransactions(prev => [newTransaction, ...prev]);
      setIsLoading(false);
      
      return {
        success: true,
        transaction_id: transactionId,
        amount: amount,
        receiver_phone: phone,
        receiver_name: recipientCheck.user.name,
        new_balance: newBalance,
        status: 'completed',
        is_pending_registration: false,
      };
    } else {
      // Transfert vers non-inscrit → pending_registration
      const newTransaction = {
        id: `txn-${Date.now()}`,
        wallet_id: wallet.id,
        transaction_type: TRANSACTION_TYPES.TRANSFER_PENDING,
        amount: -amount,
        balance_before: wallet.balance,
        balance_after: newBalance,
        description: `Envoi en attente à ${phone}`,
        reference: transactionId,
        recipient_phone: phone,
        recipient_name: null,
        status: TRANSACTION_STATUS.PENDING_REGISTRATION,
        created_at: new Date().toISOString(),
      };

      // Ajouter aux transferts en attente
      const pendingTransfer = {
        id: transactionId,
        sender_wallet_id: wallet.id,
        recipient_phone: phone,
        amount: amount,
        status: 'pending_registration',
        sms_sent: true, // Simuler envoi SMS
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
      };
      
      setWallet(prev => ({ ...prev, balance: newBalance }));
      setTransactions(prev => [newTransaction, ...prev]);
      setPendingTransfers(prev => [...prev, pendingTransfer]);
      setIsLoading(false);
      
      return {
        success: true,
        transaction_id: transactionId,
        amount: amount,
        receiver_phone: phone,
        receiver_name: null,
        new_balance: newBalance,
        status: 'pending_registration',
        is_pending_registration: true,
        sms_preview: `Vous avez reçu ${amount.toLocaleString()} FCFA sur ACTOOS Pay. Téléchargez l'app pour récupérer votre argent: https://actoos.app/dl`,
      };
    }
  }, [wallet, checkRecipient]);

  // Créer un sous-wallet
  const createSubWallet = useCallback(async (config) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newSubWallet = {
      id: `sub-wallet-${Date.now()}`,
      parent_wallet_id: wallet.id,
      wallet_name: config.name,
      linked_phone: config.phone,
      balance: 0, // Le solde est partagé depuis le parent
      daily_spend_limit: config.dailyLimit || null,
      allowed_time_start: config.timeStart || null,
      allowed_time_end: config.timeEnd || null,
      allowed_categories: config.categories || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setSubWallets(prev => [...prev, newSubWallet]);
    setIsLoading(false);

    return newSubWallet;
  }, [wallet]);

  // Recharger un sous-wallet
  const topUpSubWallet = useCallback(async (subWalletId, amount) => {
    if (wallet.balance < amount) {
      throw new Error('Solde insuffisant');
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Débiter le wallet parent
    setWallet(prev => ({
      ...prev,
      balance: prev.balance - amount,
    }));

    // Créditer le sous-wallet
    setSubWallets(prev => prev.map(sw => 
      sw.id === subWalletId 
        ? { ...sw, balance: sw.balance + amount }
        : sw
    ));

    setIsLoading(false);
    return { success: true, amount };
  }, [wallet]);

  // Supprimer un sous-wallet
  const deleteSubWallet = useCallback(async (subWalletId) => {
    const subWallet = subWallets.find(sw => sw.id === subWalletId);
    if (!subWallet) {
      throw new Error('Sous-wallet non trouvé');
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Rembourser le solde restant au parent
    if (subWallet.balance > 0) {
      setWallet(prev => ({
        ...prev,
        balance: prev.balance + subWallet.balance,
      }));
    }

    setSubWallets(prev => prev.filter(sw => sw.id !== subWalletId));
    setIsLoading(false);

    return { success: true, refunded: subWallet.balance };
  }, [subWallets]);

  // Supprimer une transaction de l'historique
  const deleteTransaction = useCallback((transactionId) => {
    setTransactions(prev => prev.filter(txn => txn.id !== transactionId));
  }, []);

  const hasEnoughBalance = useCallback((amount) => {
    return wallet.balance >= amount;
  }, [wallet.balance]);

  const value = {
    // Wallet principal
    balance: wallet.balance,
    wallet,
    walletType: wallet.wallet_type,
    dailySpendLimit: wallet.daily_spend_limit,
    companyName: wallet.company_name,
    
    // Sous-wallets
    subWallets,
    createSubWallet,
    topUpSubWallet,
    deleteSubWallet,
    checkSmartRules,
    
    // Transactions
    transactions,
    pendingTransfers,
    deleteTransaction,
    
    // Actions
    topUp,
    pay,
    transfer,
    checkRecipient,
    hasEnoughBalance,
    checkCorporateLimit,
    getTodaySpending,
    
    // État
    isLoading,
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
