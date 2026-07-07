import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function DashboardLayout({ merchantId, merchantName, children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: "Dashboard", path: `/dashboard/${merchantId}` },
    { name: "Payments", path: `/dashboard/${merchantId}/payments` },
    { name: "Wallet", path: `/dashboard/${merchantId}/wallet` },
    { name: "Settings", path: `/dashboard/${merchantId}/settings` },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("merchantId");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 h-16 bg-white border-b border-rule sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg text-ink tracking-tight">
          <img src="/favicon.svg" alt="TradeLedger Logo" className="w-6 h-6" />
          <span>TradeLedger</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -mr-2 text-charcoal hover:bg-gray-100 rounded-lg focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-64 bg-white shadow-xl flex flex-col">
            <div className="p-4 flex items-center justify-end">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-charcoal hover:bg-gray-100 rounded-lg focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                      isActive ? "bg-green-50 text-ink" : "text-gray-600 hover:bg-gray-50 hover:text-ink"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
            <div className="p-4 border-t border-rule space-y-4">
              {merchantName && (
                <div className="px-4 text-sm font-medium text-gray-500 truncate">
                  {merchantName}
                </div>
              )}
              <Link
                to="/admin"
                className="block px-4 py-2 text-sm text-gray-500 hover:text-ink transition-colors"
              >
                Lender portal →
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-white border-r border-rule fixed inset-y-0 left-0 z-10">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl text-ink tracking-tight">
            <img src="/favicon.svg" alt="TradeLedger Logo" className="w-7 h-7" />
            <span>TradeLedger</span>
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`block px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive ? "bg-green-50 text-ink" : "text-gray-600 hover:bg-gray-50 hover:text-ink"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-rule">
          {merchantName && (
            <div className="px-4 py-2 text-sm font-medium text-charcoal truncate">
              {merchantName}
            </div>
          )}
          <Link
            to="/admin"
            className="block px-4 py-2 text-sm text-gray-500 hover:text-ink transition-colors"
          >
            Lender portal →
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {/* Add left margin on desktop to account for the fixed sidebar */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
