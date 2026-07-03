import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Onboard from "./pages/Onboard.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Admin from "./pages/Admin.jsx";
import Consent from "./pages/Consent.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboard" element={<Onboard />} />
      <Route path="/dashboard/:merchantId" element={<Dashboard />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/consent" element={<Consent />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
