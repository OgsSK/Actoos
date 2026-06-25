export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-white">
      <div className="text-center bg-white rounded-2xl p-8 shadow-lg max-w-md w-full">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-2xl font-black text-slate-900">Paiement annulé</h1>
        <p className="text-slate-600 mt-3">
          Vous avez annulé le paiement. Aucun montant n’a été débité.
        </p>
        <a
          href="/"
          className="inline-block mt-6 px-5 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition"
        >
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}