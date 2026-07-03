export default function AdvanceOffer({ offer, onApply, applying, error }) {
  return (
    <div className="bg-ink text-white rounded-2xl p-6">
      <p className="text-sm font-semibold text-green-200 uppercase tracking-widest mb-1">
        Pre-approved advance
      </p>
      <p className="font-display text-4xl font-bold mb-1 tnum">
        ₦{offer.amountNaira.toLocaleString()}
      </p>
      <p className="text-sm text-green-100/80 mb-4">
        Repayable at 15% of weekly revenue · No fixed installments
      </p>

      <div className="bg-white/10 rounded-xl p-4 mb-4 text-sm text-green-50 space-y-1.5">
        <p>✓ Funds disbursed within minutes</p>
        <p>✓ Repayment pauses automatically if revenue drops</p>
        <p>✓ No collateral, no paperwork, no branch visit</p>
      </div>

      {error && (
        <p className="text-sm text-red-100 bg-red-500/30 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <button
        onClick={onApply}
        disabled={applying}
        className="w-full bg-white hover:bg-green-50 disabled:bg-gray-300 text-ink font-semibold py-3 rounded-lg transition-colors"
      >
        {applying ? "Processing..." : "Apply for advance →"}
      </button>
    </div>
  );
}
