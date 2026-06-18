"use client";

import { useEffect, useRef, useState } from "react";

export type DropdownOption = {
  id: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
};

type SearchableDropdownProps = {
  id: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
};

export function SearchableDropdown({
  id,
  options,
  value,
  onChange,
  placeholder,
  label,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter options based on search query
  const filteredOptions = options.filter((option) => {
    const query = searchQuery.toLowerCase();
    return (
      option.label.toLowerCase().includes(query) ||
      (option.sublabel && option.sublabel.toLowerCase().includes(query))
    );
  });

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.id === value);

  // Reset search query when dropdown closes or opens
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative space-y-2">
      <label htmlFor={`${id}-search-input`} className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
        {label}
      </label>

      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 py-3 px-4 text-left text-zinc-150 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 font-medium"
      >
        {selectedOption ? (
          <span className="flex items-center justify-between w-full pr-2">
            <span className="text-white truncate">{selectedOption.label}</span>
            {selectedOption.sublabel && (
              <span className="text-xs font-semibold text-violet-300 ml-2 shrink-0">{selectedOption.sublabel}</span>
            )}
          </span>
        ) : (
          <span className="text-zinc-500 truncate">{placeholder}</span>
        )}
        <span className="text-zinc-500 shrink-0">
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown Options Panel */}
      {isOpen && (
        <div
          className="absolute left-0 mt-1 w-full flex flex-col max-h-[300px] rounded-2xl border border-zinc-850 bg-zinc-900 shadow-2xl shadow-black/80 backdrop-blur-md overflow-hidden animate-fadeIn"
          style={{ zIndex: 9999 }}
        >
          {/* Search Input Box */}
          <div className="relative border-b border-zinc-800 p-2.5 shrink-0">
            <span className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-zinc-550">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              id={`${id}-search-input`}
              type="text"
              placeholder="Type to filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-violet-500 transition placeholder:text-zinc-600"
              autoFocus
            />
          </div>

          {/* Options List */}
          <ul className="overflow-y-auto py-1 divide-y divide-zinc-850/30 min-h-0 flex-1">
            {filteredOptions.length === 0 ? (
              <li className="py-4 px-4 text-center text-sm text-zinc-500">
                No smartphones match &quot;{searchQuery}&quot;
              </li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.id === value;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      disabled={option.disabled}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent loss of focus trigger
                        onChange(option.id);
                        setIsOpen(false);
                      }}
                      onClick={() => {
                        onChange(option.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between py-3 px-4 text-left text-sm transition-all duration-150 ${
                        isSelected
                          ? "bg-violet-600/25 text-violet-200 font-semibold"
                          : option.disabled
                          ? "text-zinc-650 cursor-not-allowed opacity-50 bg-zinc-900/40"
                          : "text-zinc-350 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {option.sublabel && (
                        <span className={`text-xs ml-2 shrink-0 ${isSelected ? "text-violet-300 font-bold" : "text-zinc-450"}`}>
                          {option.sublabel}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
