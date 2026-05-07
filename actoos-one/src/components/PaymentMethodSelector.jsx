import { Wallet, Banknote, Check, CreditCard } from 'lucide-react';

const paymentMethods = [
  {
    id: 'wallet',
    name: 'ACTOOS Wallet',
    description: 'Paiement instantané depuis votre solde',
    icon: Wallet,
    requiresCash: false,
    isWallet: true,
  },
  {
    id: 'mobile_money',
    name: 'Mobile Money',
    description: 'Orange Money, Moov Money',
    icon: CreditCard,
    requiresCash: false,
    isWallet: false,
  },
  {
    id: 'cash',
    name: 'Cash à la livraison',
    description: 'Payer en espèces au livreur',
    icon: Banknote,
    requiresCash: true,
    isWallet: false,
  },
];

export function PaymentMethodSelector({ selectedMethod, onSelect, acceptsCash = false, walletBalance = 0 }) {
  const availableMethods = paymentMethods.filter(
    (method) => !method.requiresCash || acceptsCash
  );

  return (
    <div className="space-y-3" data-testid="payment-methods">
      {availableMethods.map((method) => {
        const Icon = method.icon;
        const isSelected = selectedMethod === method.id;

        return (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 bg-white active:bg-gray-50'
            }`}
            data-testid={`payment-method-${method.id}`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Icon className="w-6 h-6" />
            </div>
            
            <div className="flex-1 text-left">
              <p className={`font-semibold ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                {method.name}
              </p>
              <p className="text-xs text-gray-500">
                {method.isWallet 
                  ? `Solde: ${walletBalance.toLocaleString()} FCFA`
                  : method.description
                }
              </p>
            </div>

            {isSelected && (
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
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
