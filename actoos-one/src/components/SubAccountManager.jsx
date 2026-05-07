import { useState } from 'react';
import { 
  Users, 
  Plus, 
  Settings, 
  Lock, 
  Unlock,
  Clock,
  DollarSign,
  Calendar,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Edit3
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';

// Sub-wallet with constraints
const DEFAULT_CONSTRAINTS = {
  max_balance: null,       // Maximum balance allowed (null = unlimited)
  daily_limit: null,       // Daily spending limit (null = unlimited)
  weekly_limit: null,      // Weekly spending limit
  time_restriction: null,  // { start: '08:00', end: '22:00' } or null
  allowed_days: [0, 1, 2, 3, 4, 5, 6], // 0 = Sunday, 6 = Saturday
  is_blocked: false,
  blocked_by: null,        // 'self' | 'parent' | 'system'
  blocked_reason: null,
};

export function SubAccountManager({ 
  subWallets = [], 
  onCreateSubWallet,
  onUpdateSubWallet,
  onDeleteSubWallet,
  onBlockSubWallet,
  onUnblockSubWallet,
}) {
  const [selectedSubWallet, setSelectedSubWallet] = useState(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showManageSheet, setShowManageSheet] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  return (
    <div className="space-y-4" data-testid="sub-account-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Sous-comptes</h2>
          <p className="text-sm text-gray-500">{subWallets.length} sous-compte(s)</p>
        </div>
        <button
          onClick={() => setShowCreateSheet(true)}
          className="w-10 h-10 bg-[#FF5A00] text-white rounded-xl flex items-center justify-center"
          data-testid="create-subwallet-btn"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Sub-wallets List */}
      {subWallets.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Aucun sous-compte</p>
          <p className="text-xs text-gray-400 mt-1">
            Créez des sous-comptes pour vos proches avec des limites personnalisées
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {subWallets.map(wallet => (
            <SubWalletCard
              key={wallet.id}
              wallet={wallet}
              onManage={() => {
                setSelectedSubWallet(wallet);
                setShowManageSheet(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Sub-Wallet Sheet */}
      <CreateSubWalletSheetEnhanced
        isOpen={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onCreate={(data) => {
          if (onCreateSubWallet) onCreateSubWallet(data);
          setShowCreateSheet(false);
        }}
      />

      {/* Manage Sub-Wallet Sheet */}
      <ManageSubWalletSheet
        isOpen={showManageSheet}
        onClose={() => {
          setShowManageSheet(false);
          setSelectedSubWallet(null);
        }}
        wallet={selectedSubWallet}
        onUpdate={(updates) => {
          if (onUpdateSubWallet && selectedSubWallet) {
            onUpdateSubWallet(selectedSubWallet.id, updates);
          }
        }}
        onBlock={() => setShowBlockConfirm(true)}
        onUnblock={() => {
          if (onUnblockSubWallet && selectedSubWallet) {
            onUnblockSubWallet(selectedSubWallet.id);
          }
        }}
        onDelete={() => {
          if (onDeleteSubWallet && selectedSubWallet) {
            onDeleteSubWallet(selectedSubWallet.id);
          }
          setShowManageSheet(false);
        }}
      />

      {/* Block Confirmation */}
      <BottomSheet
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        title="Bloquer le sous-compte"
      >
        <div className="py-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">
            Bloquer {selectedSubWallet?.name} ?
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            Ce sous-compte ne pourra plus effectuer de transactions. 
            Vous pourrez le débloquer à tout moment.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowBlockConfirm(false)}
              className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (onBlockSubWallet && selectedSubWallet) {
                  onBlockSubWallet(selectedSubWallet.id, 'parent');
                }
                setShowBlockConfirm(false);
                setShowManageSheet(false);
              }}
              className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-semibold"
            >
              Bloquer
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

// Sub-wallet card component
function SubWalletCard({ wallet, onManage }) {
  const hasConstraints = wallet.constraints && (
    wallet.constraints.max_balance ||
    wallet.constraints.daily_limit ||
    wallet.constraints.time_restriction
  );

  return (
    <button
      onClick={onManage}
      className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 active:bg-gray-50"
      data-testid={`subwallet-${wallet.id}`}
    >
      {/* Avatar */}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
        wallet.constraints?.is_blocked ? 'bg-red-400' : 'bg-gradient-to-br from-purple-500 to-indigo-500'
      }`}>
        {wallet.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900">{wallet.name}</p>
          {wallet.constraints?.is_blocked && (
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Bloqué
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{wallet.phone || 'Pas de téléphone'}</p>
        {hasConstraints && (
          <div className="flex items-center gap-2 mt-1">
            {wallet.constraints.daily_limit && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Max {wallet.constraints.daily_limit.toLocaleString()}/jour
              </span>
            )}
            {wallet.constraints.time_restriction && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 inline mr-1" />
                Horaires
              </span>
            )}
          </div>
        )}
      </div>

      {/* Balance & Arrow */}
      <div className="text-right">
        <p className="font-bold text-gray-900">{wallet.balance?.toLocaleString() || 0} F</p>
        <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
      </div>
    </button>
  );
}

// Enhanced Create Sub-Wallet Sheet with constraints
function CreateSubWalletSheetEnhanced({ isOpen, onClose, onCreate }) {
  const [step, setStep] = useState('info'); // 'info', 'constraints'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [constraints, setConstraints] = useState({
    max_balance: '',
    daily_limit: '',
    time_start: '',
    time_end: '',
    has_time_restriction: false,
  });

  const handleCreate = () => {
    const data = {
      name,
      phone,
      initial_balance: parseInt(initialBalance) || 0,
      constraints: {
        max_balance: constraints.max_balance ? parseInt(constraints.max_balance) : null,
        daily_limit: constraints.daily_limit ? parseInt(constraints.daily_limit) : null,
        time_restriction: constraints.has_time_restriction && constraints.time_start && constraints.time_end
          ? { start: constraints.time_start, end: constraints.time_end }
          : null,
        is_blocked: false,
      },
    };
    onCreate(data);
    // Reset
    setStep('info');
    setName('');
    setPhone('');
    setInitialBalance('');
    setConstraints({ max_balance: '', daily_limit: '', time_start: '', time_end: '', has_time_restriction: false });
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'info' ? 'Nouveau sous-compte' : 'Définir les limites'}
    >
      <div className="py-4">
        {step === 'info' && (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Nom du bénéficiaire</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mamadou (Fils)"
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                  data-testid="subwallet-name-input"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Téléphone (optionnel)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+223 70 00 00 00"
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Solde initial (FCFA)</label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                />
              </div>
            </div>

            <button
              onClick={() => setStep('constraints')}
              disabled={!name}
              className={`w-full py-4 rounded-2xl font-semibold ${
                name ? 'bg-[#FF5A00] text-white' : 'bg-gray-200 text-gray-400'
              }`}
            >
              Suivant: Définir les limites
            </button>
          </>
        )}

        {step === 'constraints' && (
          <>
            <p className="text-gray-500 text-sm mb-6">
              Définissez des limites pour contrôler les dépenses. Laissez vide pour pas de limite.
            </p>

            <div className="space-y-4 mb-6">
              {/* Max Balance */}
              <div>
                <label className="text-sm text-gray-500 mb-2 block flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Solde maximum (FCFA)
                </label>
                <input
                  type="number"
                  value={constraints.max_balance}
                  onChange={(e) => setConstraints({ ...constraints, max_balance: e.target.value })}
                  placeholder="Illimité"
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                />
              </div>

              {/* Daily Limit */}
              <div>
                <label className="text-sm text-gray-500 mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Limite journalière (FCFA)
                </label>
                <input
                  type="number"
                  value={constraints.daily_limit}
                  onChange={(e) => setConstraints({ ...constraints, daily_limit: e.target.value })}
                  placeholder="Illimité"
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                />
              </div>

              {/* Time Restriction */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Restriction horaire
                  </label>
                  <button
                    onClick={() => setConstraints({ ...constraints, has_time_restriction: !constraints.has_time_restriction })}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      constraints.has_time_restriction ? 'bg-[#FF5A00]' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      constraints.has_time_restriction ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {constraints.has_time_restriction && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">De</label>
                      <input
                        type="time"
                        value={constraints.time_start}
                        onChange={(e) => setConstraints({ ...constraints, time_start: e.target.value })}
                        className="w-full bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">À</label>
                      <input
                        type="time"
                        value={constraints.time_end}
                        onChange={(e) => setConstraints({ ...constraints, time_end: e.target.value })}
                        className="w-full bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('info')}
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold"
              >
                Retour
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold"
                data-testid="create-subwallet-confirm"
              >
                Créer
              </button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

// Manage Sub-Wallet Sheet
function ManageSubWalletSheet({ isOpen, onClose, wallet, onUpdate, onBlock, onUnblock, onDelete }) {
  const [editMode, setEditMode] = useState(false);
  const [constraints, setConstraints] = useState(wallet?.constraints || DEFAULT_CONSTRAINTS);

  if (!wallet) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`Gérer: ${wallet.name}`}>
      <div className="py-4">
        {/* Status */}
        {wallet.constraints?.is_blocked && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">Compte bloqué</p>
              <p className="text-sm text-red-600">
                {wallet.constraints.blocked_by === 'self' 
                  ? 'Bloqué par l\'utilisateur'
                  : wallet.constraints.blocked_by === 'system'
                    ? 'Bloqué par le système (3 échecs PIN)'
                    : 'Bloqué par vous'
                }
              </p>
            </div>
          </div>
        )}

        {/* Balance */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl p-6 text-white mb-4">
          <p className="text-white/80 text-sm mb-1">Solde actuel</p>
          <p className="text-3xl font-bold">{wallet.balance?.toLocaleString() || 0} FCFA</p>
        </div>

        {/* Current Constraints */}
        <div className="space-y-3 mb-6">
          <h4 className="font-semibold text-gray-900">Limites actuelles</h4>
          
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-gray-600">Solde maximum</span>
            <span className="font-medium text-gray-900">
              {wallet.constraints?.max_balance 
                ? `${wallet.constraints.max_balance.toLocaleString()} F`
                : 'Illimité'
              }
            </span>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-gray-600">Limite journalière</span>
            <span className="font-medium text-gray-900">
              {wallet.constraints?.daily_limit 
                ? `${wallet.constraints.daily_limit.toLocaleString()} F/jour`
                : 'Illimité'
              }
            </span>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-gray-600">Horaires autorisés</span>
            <span className="font-medium text-gray-900">
              {wallet.constraints?.time_restriction 
                ? `${wallet.constraints.time_restriction.start} - ${wallet.constraints.time_restriction.end}`
                : 'Toujours'
              }
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => {
              // In production: open edit sheet
              alert('Modifier les limites (à implémenter)');
            }}
            className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            <Edit3 className="w-5 h-5" />
            Modifier les limites
          </button>

          {wallet.constraints?.is_blocked ? (
            <button
              onClick={onUnblock}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2"
            >
              <Unlock className="w-5 h-5" />
              Débloquer le compte
            </button>
          ) : (
            <button
              onClick={onBlock}
              className="w-full py-4 bg-yellow-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" />
              Bloquer le compte
            </button>
          )}

          <button
            onClick={onDelete}
            className="w-full py-4 bg-red-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Supprimer le sous-compte
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
