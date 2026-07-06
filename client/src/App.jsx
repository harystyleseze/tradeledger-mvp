import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Onboard from "./pages/Onboard.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Payments from "./pages/Payments.jsx";
import Wallet from "./pages/Wallet.jsx";
import Admin from "./pages/Admin.jsx";
import Consent from "./pages/Consent.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboard" element={<Onboard />} />
      <Route path="/dashboard/:merchantId" element={<Dashboard />} />
      <Route path="/dashboard/:merchantId/payments" element={<Payments />} />
      <Route path="/dashboard/:merchantId/wallet" element={<Wallet />} />
      <Route path="/dashboard/:merchantId/settings" element={<Settings />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/consent" element={<Consent />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
