"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocationResult } from "@/lib/supabase/types";

interface LocationAutocompleteProps {
  value: string;
  displayValue: string;
  onSelect: (iataCode: string, displayName: string) => void;
  placeholder?: string;
  className?: string;
  icon?: "origin" | "destination";
}

export function LocationAutocomplete({
  value,
  displayValue,
  onSelect,
  placeholder = "Search city or airport...",
  className,
  icon = "origin",
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(displayValue);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync display value from parent
  useEffect(() => {
    if (!focused) setQuery(displayValue);
  }, [displayValue, focused]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
        if (!value) setQuery(displayValue);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [value, displayValue]);

  const search = useCallback(async (keyword: string) => {
    if (keyword.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/locations/search?keyword=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      setResults(data.locations || []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(loc: LocationResult) {
    const display = `${loc.cityName || loc.name} (${loc.iataCode})`;
    setQuery(display);
    onSelect(loc.iataCode, display);
    setOpen(false);
    setFocused(false);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative">
        {icon === "origin" ? (
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        ) : (
          <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-500" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (query.length >= 2) search(query);
          }}
          placeholder={placeholder}
          className="w-full rounded-radius-md border border-border-default bg-surface-sunken pl-10 pr-8 py-3 text-sm font-medium text-text-primary hover:border-border-emphasis transition-colors focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-radius-md border border-border-default bg-surface shadow-lg max-h-60 overflow-y-auto">
          {results.map((loc, i) => (
            <button
              key={`${loc.iataCode}-${i}`}
              onClick={() => handleSelect(loc)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-sunken transition-colors text-left"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 shrink-0">
                {loc.type === "AIRPORT" ? (
                  <Plane className="h-3.5 w-3.5 text-primary-500" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 text-primary-500" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">
                  {loc.cityName || loc.name}
                  <span className="ml-1 font-mono text-text-muted">({loc.iataCode})</span>
                </p>
                {loc.countryName && (
                  <p className="text-xs text-text-muted">{loc.countryName}</p>
                )}
              </div>
              <span className="text-[10px] font-semibold text-text-muted uppercase">
                {loc.type === "AIRPORT" ? "Airport" : "City"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
