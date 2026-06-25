export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-white">
      <div className="text-center bg-white rounded-2xl p-8 shadow-lg max-w-md w-full">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-black text-slate-900">Payment Successful</h1>
        <p className="text-slate-600 mt-3">
          Thank you for your payment. The Actoos team will update your project shortly.
        </p>
        <a
          href="/"
          className="inline-block mt-6 px-5 py-2 bg-[#D4AF37] text-white font-bold rounded-xl hover:bg-amber-500 transition"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}