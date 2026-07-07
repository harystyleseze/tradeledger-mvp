import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import AppNav from "../components/AppNav.jsx";

export default function Wallet() {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Withdrawal State
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);

  // VAS / Bills State
  const [activeTab, setActiveTab] = useState("airtime"); // airtime, data, electricity, cabletv
  const [billStatus, setBillStatus] = useState({ loading: false, error: null, success: null });

  // Common Bill fields
  const [amount, setAmount] = useState("");
  
  // Airtime specific
  const [phoneNumber, setPhoneNumber] = useState("");
  const [network, setNetwork] = useState("MTN");

  // Data specific
  const [dataPlans, setDataPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  // Electricity specific
  const [electricityProviders, setElectricityProviders] = useState([]);
  const [disco, setDisco] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [meterType, setMeterType] = useState("PREPAID");
  const [customerName, setCustomerName] = useState(null);

  // Cable TV specific
  const [cableProviders, setCableProviders] = useState([]);
  const [cableProvider, setCableProvider] = useState("");
  const [smartcardNumber, setSmartcardNumber] = useState("");

  useEffect(() => {
    fetchData();
    fetchProviders();
  }, [merchantId, navigate]);

  // When network changes for Data, fetch data plans
  useEffect(() => {
    if (activeTab === "data") {
      fetchDataPlans(network);
    }
  }, [activeTab, network]);

  async function fetchData() {
    try {
      const mRes = await api(`/merchants/${merchantId}`);
      if (!mRes.ok) return navigate("/onboard");
      const mData = await mRes.json();
      setMerchant(mData);

      const bRes = await api(`/wallet/balance/${merchantId}`);
      if (bRes.ok) {
        const bData = await bRes.json();
        setBalance(bData.balance ?? 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProviders() {
    try {
      const elRes = await api(`/wallet/providers/electricity`);
      if (elRes.ok) {
        const p = await elRes.json();
        setElectricityProviders(p.data || []);
        if (p.data && p.data.length > 0) setDisco(p.data[0].id || p.data[0].providerCode);
      }

      const cbRes = await api(`/wallet/providers/cabletv`);
      if (cbRes.ok) {
        const p = await cbRes.json();
        setCableProviders(p.data || []);
        if (p.data && p.data.length > 0) setCableProvider(p.data[0].id || p.data[0].providerCode);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchDataPlans(net) {
    try {
      const res = await api(`/wallet/plans/data/${net}`);
      if (res.ok) {
        const p = await res.json();
        setDataPlans(p.data || []);
        if (p.data && p.data.length > 0) {
          setSelectedPlanId(p.data[0].planId);
          setAmount(p.data[0].amount.toString());
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function validateElectricity() {
    if (!disco || !meterNumber) return;
    setBillStatus({ loading: true, error: null, success: null });
    try {
      const res = await api(`/wallet/validate/electricity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disco, meterNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomerName(data.data.customerName);
      setBillStatus({ loading: false, error: null, success: null });
    } catch (err) {
      setCustomerName(null);
      setBillStatus({ loading: false, error: "Validation failed", success: null });
    }
  }

  async function validateCable() {
    if (!cableProvider || !smartcardNumber) return;
    setBillStatus({ loading: true, error: null, success: null });
    try {
      const res = await api(`/wallet/validate/cabletv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: cableProvider, smartcardNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomerName(data.data.customerName);
      setBillStatus({ loading: false, error: null, success: null });
    } catch (err) {
      setCustomerName(null);
      setBillStatus({ loading: false, error: "Validation failed", success: null });
    }
  }

  async function handleWithdraw(e) {
    e.preventDefault();
    setWithdrawing(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);

    try {
      const res = await api(`/wallet/withdraw/${merchantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(withdrawAmount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");
      
      setWithdrawSuccess(`Successfully initiated withdrawal of ₦${Number(withdrawAmount).toLocaleString()}`);
      setWithdrawAmount("");
      fetchData(); // Refresh balance
    } catch (err) {
      setWithdrawError(err.message);
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleBillPayment(e) {
    e.preventDefault();
    setBillStatus({ loading: true, error: null, success: null });

    try {
      let endpoint = "";
      let payload = {};

      if (activeTab === "airtime") {
        endpoint = "airtime";
        payload = { amount: Number(amount), phoneNumber, network };
      } else if (activeTab === "data") {
        endpoint = "data";
        payload = { amount: Number(amount), phoneNumber, network, planId: selectedPlanId };
      } else if (activeTab === "electricity") {
        if (!customerName) throw new Error("Please validate meter number first.");
        endpoint = "electricity";
        payload = { amount: Number(amount), disco, meterNumber, meterType };
      } else if (activeTab === "cabletv") {
        if (!customerName) throw new Error("Please validate smartcard first.");
        endpoint = "cabletv";
        // Assuming planId is just 1 for custom amounts or if we need to fetch bouquets, we'll simplify
        // since the API requires a planId. Let's send the amount.
        payload = { amount: Number(amount), provider: cableProvider, smartcardNumber, planId: "custom" };
      }

      const res = await api(`/wallet/${endpoint}/${merchantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transaction failed");
      
      setBillStatus({ loading: false, error: null, success: `Successfully processed ₦${Number(amount).toLocaleString()} payment` });
      
      // Reset form
      if (activeTab === "electricity" || activeTab === "cabletv") {
        setCustomerName(null);
      }
      setAmount("");
      setPhoneNumber("");
      fetchData(); // Refresh balance
    } catch (err) {
      setBillStatus({ loading: false, error: err.message, success: null });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <AppNav />
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6 animate-pulse">
          <div className="h-40 bg-white border border-rule rounded-2xl" />
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
            <Link to={`/dashboard/${merchantId}/payments`} className="text-gray-500 hover:text-ink transition-colors">Payments</Link>
            <Link to={`/dashboard/${merchantId}/wallet`} className="text-ink font-medium">Wallet</Link>
            <Link to={`/dashboard/${merchantId}/settings`} className="text-gray-500 hover:text-ink transition-colors">Settings</Link>
          </>
        }
        right={
          <>
            {merchant?.name && (
              <span className="text-gray-500 hidden sm:block">{merchant.name}</span>
            )}
            <Link to="/admin" className="text-gray-400 hover:text-ink">
              Lender portal →
            </Link>
          </>
        }
      />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-ink">Wallet & Services</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your platform balance, withdraw funds, and pay bills.</p>
        </div>

        {/* Balance Card */}
        <div className="bg-ink rounded-2xl p-8 text-white mb-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-green-500/20 rounded-full blur-3xl" />
          <div className="relative z-10">
            <p className="text-green-100/80 text-sm font-medium mb-1 tracking-wide uppercase">Available Balance</p>
            <h2 className="font-display text-5xl font-bold tracking-tight">
              <span className="text-green-400 text-4xl mr-1">₦</span>
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Withdrawal Card */}
          <div className="bg-white border border-rule rounded-2xl p-6">
            <div className="mb-5">
              <h3 className="font-display font-semibold text-lg text-ink">Withdraw Funds</h3>
              <p className="text-sm text-gray-500">Transfer to your registered bank account.</p>
            </div>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Destination Bank</p>
                <p className="font-medium text-ink mt-0.5">{merchant?.accountName}</p>
                <p className="text-sm text-gray-500 font-mono mt-0.5">{merchant?.accountNumber}</p>
              </div>
              <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 border border-gray-100">
                🏦
              </div>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  min="1"
                  max={balance}
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                  disabled={withdrawing}
                />
              </div>

              {withdrawError && <p className="text-red-500 text-xs bg-red-50 p-2 rounded">{withdrawError}</p>}
              {withdrawSuccess && <p className="text-green-600 text-xs bg-green-50 p-2 rounded">{withdrawSuccess}</p>}

              <button
                type="submit"
                disabled={withdrawing || balance <= 0}
                className="w-full bg-ink hover:bg-green-900 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
              >
                {withdrawing ? "Processing..." : "Withdraw to Bank"}
              </button>
            </form>
          </div>

          {/* VAS / Pay Bills Card */}
          <div className="bg-white border border-rule rounded-2xl p-6">
            <div className="mb-4">
              <h3 className="font-display font-semibold text-lg text-ink">Pay Bills</h3>
              <p className="text-sm text-gray-500">Instant top-ups from your balance.</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 p-1 bg-gray-50 border border-gray-100 rounded-lg mb-6">
              {[
                { id: "airtime", label: "Airtime" },
                { id: "data", label: "Data" },
                { id: "electricity", label: "Power" },
                { id: "cabletv", label: "TV" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setBillStatus({ loading: false, error: null, success: null });
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeTab === tab.id ? "bg-white text-ink shadow-sm" : "text-gray-500 hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleBillPayment} className="space-y-4">
              
              {/* AIRTIME & DATA SHARED: Network & Phone */}
              {(activeTab === "airtime" || activeTab === "data") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Network</label>
                    <select
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                      disabled={billStatus.loading}
                    >
                      <option value="MTN">MTN</option>
                      <option value="AIRTEL">Airtel</option>
                      <option value="GLO">Glo</option>
                      <option value="9MOBILE">9mobile</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 08012345678"
                      className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                      disabled={billStatus.loading}
                    />
                  </div>
                </div>
              )}

              {/* DATA SPECIFIC: Plans */}
              {activeTab === "data" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data Plan</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => {
                      setSelectedPlanId(e.target.value);
                      const p = dataPlans.find(d => d.planId === e.target.value);
                      if (p) setAmount(p.amount.toString());
                    }}
                    className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                    disabled={billStatus.loading}
                  >
                    {dataPlans.map(p => (
                      <option key={p.planId} value={p.planId}>{p.name} - ₦{p.amount}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ELECTRICITY SPECIFIC */}
              {activeTab === "electricity" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Provider (Disco)</label>
                    <select
                      value={disco}
                      onChange={(e) => {
                        setDisco(e.target.value);
                        setCustomerName(null);
                      }}
                      className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                      disabled={billStatus.loading}
                    >
                      {electricityProviders.map(p => (
                        <option key={p.id || p.providerCode} value={p.id || p.providerCode}>{p.name || p.providerName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Meter Number</label>
                      <input
                        type="text"
                        required
                        value={meterNumber}
                        onChange={(e) => {
                          setMeterNumber(e.target.value);
                          setCustomerName(null);
                        }}
                        className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                        disabled={billStatus.loading}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={validateElectricity}
                      className="px-3 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                    >
                      Validate
                    </button>
                  </div>
                  {customerName && (
                    <div className="p-2 bg-green-50 rounded-lg text-green-800 text-xs">
                      Verified: <strong>{customerName}</strong>
                    </div>
                  )}
                </>
              )}

              {/* CABLE TV SPECIFIC */}
              {activeTab === "cabletv" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
                    <select
                      value={cableProvider}
                      onChange={(e) => {
                        setCableProvider(e.target.value);
                        setCustomerName(null);
                      }}
                      className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                      disabled={billStatus.loading}
                    >
                      {cableProviders.map(p => (
                        <option key={p.id || p.providerCode} value={p.id || p.providerCode}>{p.name || p.providerName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Smartcard Number</label>
                      <input
                        type="text"
                        required
                        value={smartcardNumber}
                        onChange={(e) => {
                          setSmartcardNumber(e.target.value);
                          setCustomerName(null);
                        }}
                        className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                        disabled={billStatus.loading}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={validateCable}
                      className="px-3 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                    >
                      Validate
                    </button>
                  </div>
                  {customerName && (
                    <div className="p-2 bg-green-50 rounded-lg text-green-800 text-xs">
                      Verified: <strong>{customerName}</strong>
                    </div>
                  )}
                </>
              )}
              
              {/* AMOUNT (Hide if data, since data uses planId amount) */}
              {activeTab !== "data" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₦)</label>
                  <input
                    type="number"
                    min="50"
                    max={balance}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                    disabled={billStatus.loading}
                  />
                </div>
              )}

              {billStatus.error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded">{billStatus.error}</p>}
              {billStatus.success && <p className="text-green-600 text-xs bg-green-50 p-2 rounded">{billStatus.success}</p>}

              <button
                type="submit"
                disabled={
                  billStatus.loading || 
                  balance <= 0 || 
                  ((activeTab === 'electricity' || activeTab === 'cabletv') && !customerName)
                }
                className="w-full bg-leaf hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
              >
                {billStatus.loading ? "Processing..." : `Pay ₦${amount || "0"}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
