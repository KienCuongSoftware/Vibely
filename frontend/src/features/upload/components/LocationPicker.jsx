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

/** Instant chips while API loads — specific POIs, not only city names. */
const INSTANT_CHIPS = [
  {
    placeId: "popular:vinhomes-smart-city",
    name: "Vinhomes Smart City",
    address: "ĐL Thăng Long, Tây Mỗ, Nam Từ Liêm, Hà Nội",
    lat: 21.0046,
    lng: 105.736,
  },
  {
    placeId: "popular:hanoi-old-quarter",
    name: "Hanoi Old Quarter",
    address: "Phố cổ Hà Nội, Hoàn Kiếm, Hà Nội",
    lat: 21.034,
    lng: 105.85,
  },
  {
    placeId: "popular:ho-guom",
    name: "Hồ Hoàn Kiếm",
    address: "Hoàn Kiếm, Hà Nội",
    lat: 21.0287,
    lng: 105.8522,
  },
  {
    placeId: "popular:landmark-81",
    name: "Landmark 81",
    address: "Bình Thạnh, TP. Hồ Chí Minh",
    lat: 10.795,
    lng: 106.722,
  },
  {
    placeId: "popular:nguyen-hue",
    name: "Phố đi bộ Nguyễn Huệ",
    address: "Quận 1, TP. Hồ Chí Minh",
    lat: 10.7735,
    lng: 106.703,
  },
  {
    placeId: "popular:ben-thanh",
    name: "Chợ Bến Thành",
    address: "Quận 1, TP. Hồ Chí Minh",
    lat: 10.7725,
    lng: 106.698,
  },
  {
    placeId: "popular:cau-rong",
    name: "Cầu Rồng",
    address: "Hải Châu, Đà Nẵng",
    lat: 16.061,
    lng: 108.2275,
  },
  {
    placeId: "popular:my-khe",
    name: "Bãi biển Mỹ Khê",
    address: "Sơn Trà, Đà Nẵng",
    lat: 16.06,
    lng: 108.247,
  },
  {
    placeId: "popular:hoi-an",
    name: "Phố cổ Hội An",
    address: "Hội An, Quảng Nam",
    lat: 15.8801,
    lng: 108.338,
  },
  {
    placeId: "popular:ba-na",
    name: "Bà Nà Hills",
    address: "Hòa Vang, Đà Nẵng",
    lat: 15.995,
    lng: 107.988,
  },
  {
    placeId: "popular:da-lat-center",
    name: "Chợ Đà Lạt",
    address: "Đà Lạt, Lâm Đồng",
    lat: 11.9404,
    lng: 108.438,
  },
  {
    placeId: "popular:ha-long",
    name: "Vịnh Hạ Long",
    address: "Hạ Long, Quảng Ninh",
    lat: 20.9101,
    lng: 107.1839,
  },
];

function readCoords() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 180000 },
    );
  });
}

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
  const [coords, setCoords] = useState(null);
  const [suggested, setSuggested] = useState(INSTANT_CHIPS);
  const [suggestLoading, setSuggestLoading] = useState(true);

  const isDark = variant === "dark";

  useEffect(() => {
    setQuery(value?.name || "");
  }, [value?.name, value?.placeId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSuggestLoading(true);
      const pos = await readCoords();
      if (cancelled) return;
      setCoords(pos);

      if (!token) {
        setSuggested(INSTANT_CHIPS);
        setSuggestLoading(false);
        return;
      }
      try {
        const data = await placesApi.suggestPlaces({
          lat: pos?.lat,
          lng: pos?.lng,
          limit: 18,
          token,
        });
        if (cancelled) return;
        const list = Array.isArray(data) ? data.filter((p) => p?.name) : [];
        setSuggested(list.length ? list : INSTANT_CHIPS);
      } catch {
        if (!cancelled) setSuggested(INSTANT_CHIPS);
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
        const data = await placesApi.searchPlaces(q, {
          limit: 10,
          lat: coords?.lat,
          lng: coords?.lng,
          token,
        });
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
  }, [query, open, token, t, value?.name, coords?.lat, coords?.lng]);

  const chips = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const item of [...recent, ...suggested, ...INSTANT_CHIPS]) {
      if (!item?.name) continue;
      const key = `${item.placeId || ""}|${item.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out.slice(0, 20);
  }, [suggested, recent]);

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
    el.scrollBy({ left: dir * 180, behavior: "smooth" });
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
          {suggestLoading ? (
            <span className={`shrink-0 px-2 py-1.5 text-xs ${addrCls}`}>
              {t("upload.locationNearbyLoading")}
            </span>
          ) : null}
          {chips.map((place) => {
            const selected =
              value?.name === place.name &&
              (!value?.placeId || !place.placeId || value.placeId === place.placeId);
            return (
              <button
                key={`${place.placeId || ""}|${place.name}`}
                type="button"
                onClick={() => selectPlace(place)}
                title={place.address || place.name}
                className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition ${chipCls} ${
                  selected ? "ring-1 ring-[#fe2c55]" : ""
                }`}
              >
                <span className="inline-flex max-w-[11rem] items-center gap-1">
                  <IoLocationOutline className="shrink-0 text-sm opacity-70" aria-hidden />
                  <span className="truncate">{place.name}</span>
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
