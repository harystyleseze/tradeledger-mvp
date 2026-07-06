import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import AppNav from "../components/AppNav.jsx";
import BuyerLedger from "../components/BuyerLedger.jsx";
import PaymentLinks from "../components/PaymentLinks.jsx";

export default function Payments() {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const [merchantName, setMerchantName] = useState(null);
  const [buyers, setBuyers] = useState([]);
  const [activeTab, setActiveTab] = useState("dva"); // "dva" or "links"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/merchants/${merchantId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d) return navigate("/onboard");
        if (d.name) setMerchantName(d.name);
        if (d.buyerAccounts) {
          setBuyers(
            d.buyerAccounts.map((ba) => ({
              id: ba.id,
              buyerName: ba.customerReference,
              accountNumber: ba.accountNumber,
              bankCode: ba.bankCode,
              paymentCount: ba.payments?.length ?? 0,
              totalReceivedNaira: (ba.payments ?? []).reduce((s, p) => s + p.amount / 100, 0),
              payments: (ba.payments ?? []).map((p) => ({
                amount: p.amount,
                amountNaira: p.amount / 100,
                payer: p.payer,
                receivedAt: p.receivedAt,
              })),
            }))
          );
        }
      })
      .catch(() => navigate("/onboard"))
      .finally(() => setLoading(false));
  }, [merchantId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <AppNav />
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6 animate-pulse">
          <div className="h-72 bg-white border border-rule rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppNav
        navLinks={
          <>
            <Link to={`/dashboard/${merchantId}`} className="text-gray-500 hover:text-ink transition-colors">Dashboard</Link>
            <Link to={`/dashboard/${merchantId}/payments`} className="text-ink font-medium">Payments</Link>
            <Link to={`/dashboard/${merchantId}/wallet`} className="text-gray-500 hover:text-ink transition-colors">Wallet</Link>
            <Link to={`/dashboard/${merchantId}/settings`} className="text-gray-500 hover:text-ink transition-colors">Settings</Link>
          </>
        }
        right={
          <>
            {merchantName && (
              <span className="text-gray-500 hidden sm:block">{merchantName}</span>
            )}
            <Link to="/admin" className="text-gray-400 hover:text-ink">
              Lender portal →
            </Link>
          </>
        }
      />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-ink">Payment Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage reusable buyer accounts and one-time payment links.</p>
        </div>

        {/* Custom Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("dva")}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "dva" 
                ? "border-ink text-ink" 
                : "border-transparent text-gray-500 hover:text-ink"
            }`}
          >
            Reusable Accounts (DVA)
          </button>
          <button
            onClick={() => setActiveTab("links")}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "links" 
                ? "border-ink text-ink" 
                : "border-transparent text-gray-500 hover:text-ink"
            }`}
          >
            Payment Links (Checkout)
          </button>
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {activeTab === "dva" && (
            <div className="animate-in fade-in duration-300">
              <BuyerLedger merchantId={merchantId} initialBuyers={buyers} />
            </div>
          )}
          {activeTab === "links" && (
            <div className="animate-in fade-in duration-300">
              <PaymentLinks merchantId={merchantId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
