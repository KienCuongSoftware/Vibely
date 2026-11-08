import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IoChevronDown,
  IoChevronForward,
  IoChevronUp,
  IoClose,
  IoInformationCircleOutline,
  IoLocationOutline,
  IoNavigateOutline,
} from "react-icons/io5";
import { placesApi } from "@/features/upload/api/placesApi.js";
import {
  loadRecentLocations,
  rememberLocation,
} from "@/features/upload/utils/recentLocations.js";

const CURATED = [
  {
    placeId: "curated:hanoi",
    name: "Hanoi",
    address: "Vietnam",
    lat: 21.0285,
    lng: 105.8542,
  },
  {
    placeId: "curated:hcm",
    name: "Ho Chi Minh City",
    address: "Vietnam",
    lat: 10.8231,
    lng: 106.6297,
  },
  {
    placeId: "curated:danang",
    name: "Da Nang",
    address: "Vietnam",
    lat: 16.0544,
    lng: 108.2022,
  },
];

/**
 * @param {{
 *   value: null | { placeId?: string|null, name: string, address?: string, lat?: number|null, lng?: number|null },
 *   onChange: (place: typeof value) => void,
 *   token?: string|null,
 *   variant?: 'dark' | 'light',
 *   className?: string,
 * }} props
 */
export function LocationPicker({
  value,
  onChange,
  token,
  variant = "dark",
  className = "",
}) {
  const { t } = useTranslation();
  const rootRef = useRef(null);
  const chipsRef = useRef(null);
  const [query, setQuery] = useState(value?.name || "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState(() => loadRecentLocations());

  const isDark = variant === "dark";

  useEffect(() => {
    setQuery(value?.name || "");
  }, [value?.name, value?.placeId]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const q = query.trim();
    if (value?.name && q === value.name.trim()) {
      setResults([]);
      setLoading(false);
      setError("");
      return undefined;
    }
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError("");
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await placesApi.searchPlaces(q, { limit: 8, token });
        if (cancelled) return;
        setResults(Array.isArray(data) ? data : []);
      } catch {
        if (cancelled) return;
        setResults([]);
        setError(t("upload.locationSearchFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, token, t, value?.name]);

  const chips = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const item of [...recent, ...CURATED]) {
      const key = `${item.placeId || ""}|${item.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out.slice(0, 10);
  }, [recent]);

  const selectPlace = (place) => {
    if (!place?.name) return;
    const next = {
      placeId: place.placeId ?? null,
      name: place.name,
      address: place.address || "",
      lat: typeof place.lat === "number" ? place.lat : null,
      lng: typeof place.lng === "number" ? place.lng : null,
    };
    rememberLocation(next);
    setRecent(loadRecentLocations());
    onChange?.(next);
    setQuery(next.name);
    setOpen(false);
    setResults([]);
    setError("");
  };

  const clearPlace = () => {
    onChange?.(null);
    setQuery("");
    setResults([]);
    setError("");
    setOpen(false);
  };

  const scrollChips = (dir) => {
    const el = chipsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

  const labelCls = isDark
    ? "text-sm font-medium text-zinc-300"
    : "text-[15px] font-semibold text-[#161823]";
  const infoCls = isDark ? "text-zinc-500" : "text-[#8a8b91]";
  const inputWrapCls = isDark
    ? "border border-zinc-700 bg-zinc-950 text-zinc-100"
    : "border border-transparent bg-[#f8f8f8] text-[#161823]";
  const inputCls = isDark
    ? "placeholder:text-zinc-600"
    : "placeholder:text-[#8a8b91]";
  const iconCls = isDark ? "text-zinc-500" : "text-[#8a8b91]";
  const dropdownCls = isDark
    ? "border border-zinc-700 bg-zinc-950 shadow-xl"
    : "border border-[#e8e8e9] bg-white shadow-lg";
  const nameCls = isDark ? "text-zinc-100" : "text-[#161823]";
  const addrCls = isDark ? "text-zinc-500" : "text-[#8a8b91]";
  const chipBandCls = isDark ? "bg-zinc-900/80" : "bg-[#f1f1f2]";
  const chipCls = isDark
    ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
    : "bg-white text-[#161823] hover:bg-[#e8e8e9]";
  const chipNavCls = isDark
    ? "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
    : "border border-[#e8e8e9] bg-white text-[#161823] hover:bg-[#f8f8f8]";

  const showDropdown =
    open &&
    (loading ||
      error ||
      results.length > 0 ||
      (query.trim().length >= 2 && !loading));

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="mb-2 flex items-center gap-1">
        <span className={labelCls}>{t("upload.location")}</span>
        <IoInformationCircleOutline className={infoCls} aria-hidden />
      </div>

      <div className={`relative flex items-center rounded-lg ${inputWrapCls}`}>
        <IoNavigateOutline
          className={`pointer-events-none absolute left-3 text-base ${iconCls}`}
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange?.(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("upload.locationSearchPlaceholder")}
          className={`w-full rounded-lg bg-transparent py-2.5 pr-16 pl-9 text-sm outline-none ${inputCls}`}
          autoComplete="off"
        />
        <div className="absolute right-2 flex items-center gap-0.5">
          {value?.name ? (
            <button
              type="button"
              onClick={clearPlace}
              className={`cursor-pointer rounded-full p-1 ${iconCls}`}
              aria-label={t("upload.locationClear")}
            >
              <IoClose className="text-base" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`cursor-pointer rounded-full p-1 ${iconCls}`}
            aria-label={open ? t("upload.locationCollapse") : t("upload.locationExpand")}
          >
            {open ? (
              <IoChevronUp className="text-base" aria-hidden />
            ) : (
              <IoChevronDown className="text-base" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {showDropdown ? (
        <div
          className={`absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg ${dropdownCls}`}
          role="listbox"
        >
          {loading ? (
            <p className={`px-3 py-2.5 text-sm ${addrCls}`}>
              {t("upload.locationSearching")}
            </p>
          ) : null}
          {!loading && error ? (
            <p className="px-3 py-2.5 text-sm text-[#fe2c55]">{error}</p>
          ) : null}
          {!loading && !error && results.length === 0 && query.trim().length >= 2 ? (
            <p className={`px-3 py-2.5 text-sm ${addrCls}`}>
              {t("upload.locationEmpty")}
            </p>
          ) : null}
          {results.map((place) => (
            <button
              key={`${place.placeId || place.name}|${place.address || ""}`}
              type="button"
              role="option"
              className={`flex w-full cursor-pointer flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-black/5 ${
                isDark ? "hover:bg-white/5" : ""
              }`}
              onClick={() => selectPlace(place)}
            >
              <span className={`truncate text-sm font-semibold ${nameCls}`}>
                {place.name}
              </span>
              {place.address ? (
                <span className={`truncate text-xs ${addrCls}`}>{place.address}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className={`mt-3 -mx-1 flex items-center gap-1 rounded-lg px-1 py-1.5 ${chipBandCls}`}>
        <div
          ref={chipsRef}
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {chips.map((place) => {
            const selected =
              value?.name === place.name &&
              (!value?.placeId || !place.placeId || value.placeId === place.placeId);
            return (
              <button
                key={`${place.placeId || ""}|${place.name}`}
                type="button"
                onClick={() => selectPlace(place)}
                className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition ${chipCls} ${
                  selected ? "ring-1 ring-[#fe2c55]" : ""
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <IoLocationOutline className="text-sm opacity-70" aria-hidden />
                  {place.name}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => scrollChips(1)}
          className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full ${chipNavCls}`}
          aria-label={t("upload.locationScrollChips")}
        >
          <IoChevronForward className="text-base" aria-hidden />
        </button>
      </div>
    </div>
  );
}
