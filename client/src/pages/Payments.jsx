import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import DashboardLayout from "../components/DashboardLayout.jsx";
import BuyerLedger from "../components/BuyerLedger.jsx";
import PaymentLinks from "../components/PaymentLinks.jsx";

export default function Payments() {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const [merchantName, setMerchantName] = useState(null);
  const [activeTab, setActiveTab] = useState("dva"); // "dva" or "links"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/merchants/${merchantId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d) return navigate("/onboard");
        if (d.name) setMerchantName(d.name);
      })
      .catch(() => navigate("/onboard"))
      .finally(() => setLoading(false));
  }, [merchantId, navigate]);

  if (loading) {
    return (
      <DashboardLayout merchantId={merchantId} merchantName={merchantName}>
        <div className="space-y-6 animate-pulse">
          <div className="h-72 bg-white border border-rule rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout merchantId={merchantId} merchantName={merchantName}>
      <div>
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
              <BuyerLedger merchantId={merchantId} />
            </div>
          )}
          {activeTab === "links" && (
            <div className="animate-in fade-in duration-300">
              <PaymentLinks merchantId={merchantId} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
