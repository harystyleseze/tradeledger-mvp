import { useState, useRef, useEffect, useMemo } from "react";

export default function SearchableSelect({ options, value, onChange, placeholder = "Select...", required = false, id }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  // Find the currently selected option
  const selectedOption = options.find(opt => opt.code === value);

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    if (!query) return options;
    const lowerQuery = query.toLowerCase();
    return options.filter(opt => opt.name.toLowerCase().includes(lowerQuery));
  }, [options, query]);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Hidden select for native form validation if required */}
      {required && (
        <select 
          id={id}
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="absolute opacity-0 w-full h-full pointer-events-none" 
          required
        >
          <option value="" disabled></option>
          {options.map(opt => (
            <option key={opt.code} value={opt.code}>{opt.name}</option>
          ))}
        </select>
      )}

      {/* Main trigger button */}
      <div 
        onClick={() => { setIsOpen(!isOpen); setQuery(""); }}
        className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm bg-paper/50 cursor-pointer flex justify-between items-center"
      >
        <span className={selectedOption ? "text-ink" : "text-gray-500"}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <span className="text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-rule rounded-lg shadow-lg overflow-hidden max-h-60 flex flex-col">
          <div className="p-2 border-b border-rule">
            <input
              type="text"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-rule rounded-md focus:outline-none focus:border-leaf"
              placeholder="Search banks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">No banks found</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.code}
                  className={`px-3 py-2.5 text-sm cursor-pointer rounded-md transition-colors ${
                    value === opt.code ? "bg-leaf/10 text-leaf font-medium" : "hover:bg-gray-50 text-ink"
                  }`}
                  onClick={() => {
                    onChange(opt.code);
                    setIsOpen(false);
                    setQuery("");
                  }}
                >
                  {opt.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
