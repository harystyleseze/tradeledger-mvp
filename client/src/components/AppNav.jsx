import { Link } from "react-router-dom";

export default function AppNav({ navLinks, right }) {
  return (
    <nav className="border-b border-rule bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg text-ink tracking-tight">
            <img src="/favicon.svg" alt="TradeLedger Logo" className="w-6 h-6" />
            <span>TradeLedger</span>
          </Link>
          {navLinks && (
            <div className="hidden md:flex items-center gap-4">
              {navLinks}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">{right}</div>
      </div>
    </nav>
  );
}
