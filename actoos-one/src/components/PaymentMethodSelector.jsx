import { Wallet, Banknote, Check, CreditCard, Clock } from 'lucide-react';

const paymentMethods = [
  {
    id: 'wallet',
    name: 'ACTOOS Wallet',
    description: 'Paiement instantané depuis votre solde',
    icon: Wallet,
    requiresCash: false,
    isWallet: true,
    isBNPL: false,
  },
  {
    id: 'bnpl',
    name: 'Payer plus tard',
    description: 'Mangez maintenant, payez dans 7 jours',
    icon: Clock,
    requiresCash: false,
    isWallet: false,
    isBNPL: true,
  },
  {
    id: 'mobile_money',
    name: 'Mobile Money',
    description: 'Orange Money, Moov Money',
    icon: CreditCard,
    requiresCash: false,
    isWallet: false,
    isBNPL: false,
  },
  {
    id: 'cash',
    name: 'Cash à la livraison',
    description: 'Payer en espèces au livreur',
    icon: Banknote,
    requiresCash: true,
    isWallet: false,
    isBNPL: false,
  },
];

export function PaymentMethodSelector({ selectedMethod, onSelect, acceptsCash = false, walletBalance = 0, bnplEligible = false, bnplMessage = '' }) {
  const availableMethods = paymentMethods.filter((method) => {
    if (method.requiresCash && !acceptsCash) return false;
    if (method.isBNPL && !bnplEligible) return false;
    return true;
  });

  return (
    <div className="space-y-3" data-testid="payment-methods">
      {availableMethods.map((method) => {
        const Icon = method.icon;
        const isSelected = selectedMethod === method.id;
        const isBNPL = method.isBNPL;

        return (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
              isSelected
                ? isBNPL 
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-primary bg-primary/5'
                : 'border-gray-200 bg-white active:bg-gray-50'
            }`}
            data-testid={`payment-method-${method.id}`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isSelected 
                  ? isBNPL 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Icon className="w-6 h-6" />
            </div>
            
            <div className="flex-1 text-left">
              <p className={`font-semibold ${
                isSelected 
                  ? isBNPL ? 'text-purple-600' : 'text-primary' 
                  : 'text-gray-900'
              }`}>
                {method.name}
                {isBNPL && (
                  <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                    NOUVEAU
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {method.isWallet 
                  ? `Solde: ${walletBalance.toLocaleString()} FCFA`
                  : method.description
                }
              </p>
            </div>

            {isSelected && (
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isBNPL ? 'bg-purple-500' : 'bg-primary'
              }`}>
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        );
      })}

      {!acceptsCash && (
        <p className="text-xs text-gray-400 text-center mt-2">
          Ce restaurant n'accepte pas le paiement en espèces
        </p>
      )}
    </div>
  );
}
