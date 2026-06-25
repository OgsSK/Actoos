export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-white">
      <div className="text-center bg-white rounded-2xl p-8 shadow-lg max-w-md w-full">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-black text-slate-900">Paiement réussi !</h1>
        <p className="text-slate-600 mt-3">
          Merci pour votre paiement. L’équipe Actoos va mettre à jour votre projet très bientôt.
        </p>
        <a
          href="/"
          className="inline-block mt-6 px-5 py-2 bg-[#D4AF37] text-white font-bold rounded-xl hover:bg-amber-500 transition"
        >
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}