import { useState, useEffect } from 'react';
import { 
  Users, 
  Gift, 
  Copy, 
  Share2, 
  CheckCircle, 
  Wallet,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { 
  getUserReferralCode, 
  generateReferralCode, 
  referralConfig 
} from '../data/promotionsData';

export function ReferralSection({ userId, userName, userPhone }) {
  const [referralCode, setReferralCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Charger ou générer le code parrainage
    const existingCode = getUserReferralCode(userId);
    if (existingCode) {
      setReferralCode(existingCode);
    }
  }, [userId]);

  const handleGenerateCode = () => {
    if (referralCode) return;
    
    setIsGenerating(true);
    setTimeout(() => {
      const newCode = generateReferralCode(userId, userName, userPhone);
      setReferralCode(newCode);
      setIsGenerating(false);
    }, 500);
  };

  const handleCopy = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralCode.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!referralCode) return;
    
    const shareText = `Rejoins ACTOOS et obtiens ${referralConfig.referee_bonus.toLocaleString()} FCFA de réduction sur ta première commande avec mon code : ${referralCode.code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoins ACTOOS !',
          text: shareText,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  if (!referralConfig.is_enabled) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-[#FF5A00] to-[#FF8C00] rounded-3xl p-5 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Parrainez vos amis</h3>
          <p className="text-white/80 text-sm">
            Gagnez {referralConfig.referrer_bonus.toLocaleString()} FCFA par ami
          </p>
        </div>
      </div>

      {!referralCode ? (
        // No code yet - show generate button
        <div className="bg-white/10 rounded-2xl p-4 text-center">
          <Gift className="w-10 h-10 mx-auto mb-3 text-white/80" />
          <p className="text-white/90 mb-3">
            Partagez votre code et gagnez des crédits !
          </p>
          <button
            onClick={handleGenerateCode}
            disabled={isGenerating}
            className="w-full py-3 bg-white text-[#FF5A00] font-semibold rounded-xl active:bg-white/90 disabled:opacity-50"
            data-testid="generate-referral-btn"
          >
            {isGenerating ? 'Génération...' : 'Obtenir mon code'}
          </button>
        </div>
      ) : (
        // Show referral code and stats
        <div className="space-y-4">
          {/* Code display */}
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-white/70 text-xs uppercase tracking-wide mb-2">Votre code parrainage</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold tracking-wider" data-testid="referral-code">
                {referralCode.code}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    copied ? 'bg-green-500' : 'bg-white/20 active:bg-white/30'
                  }`}
                  data-testid="copy-referral-btn"
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center active:bg-white/30"
                  data-testid="share-referral-btn"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-white/70 text-xs uppercase tracking-wide mb-3">Comment ça marche ?</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <p className="text-sm text-white/90">Partagez votre code avec un ami</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <p className="text-sm text-white/90">
                  Il reçoit <strong>-{referralConfig.referee_bonus.toLocaleString()} FCFA</strong> sur sa 1ère commande
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <p className="text-sm text-white/90">
                  Vous gagnez <strong>+{referralConfig.referrer_bonus.toLocaleString()} FCFA</strong> en wallet
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{referralCode.successful_referrals}</p>
              <p className="text-xs text-white/70">Parrainages</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{referralCode.total_earned.toLocaleString()}</p>
              <p className="text-xs text-white/70">FCFA gagnés</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Version compacte pour afficher dans le profil
export function ReferralBadge({ userId }) {
  const referralCode = getUserReferralCode(userId);
  
  if (!referralConfig.is_enabled || !referralCode) {
    return null;
  }

  return (
    <div className="bg-[#FF5A00]/10 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#FF5A00] rounded-xl flex items-center justify-center">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {referralCode.successful_referrals} parrainages
          </p>
          <p className="text-sm text-[#FF5A00]">
            +{referralCode.total_earned.toLocaleString()} FCFA gagnés
          </p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </div>
  );
}
