import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoCheckmarkCircle,
  IoClose,
  IoCloudUploadOutline,
  IoCreateOutline,
  IoEyeOutline,
  IoHeartOutline,
  IoHomeOutline,
  IoInformationCircleOutline,
  IoPersonOutline,
  IoPlayOutline,
  IoRadioOutline,
  IoWalletOutline,
} from "react-icons/io5";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AccountAvatarMenu } from "@/shared/components/AccountAvatarMenu.jsx";
import { AvatarImage } from "@/shared/components/AvatarImage";
import { VibelyWordmark } from "@/shared/components/VibelyWordmark.jsx";

export const PROMOTE_ENTRY_PATH =
  "/promote/web/main?enter_from=menu_creator_tool";

const GOAL_TABS = [
  {
    id: "boostAccount",
    goals: ["likesComments", "videoViews", "followers", "profileViews"],
  },
  { id: "increaseSales", goals: ["websiteTraffic", "productSales"] },
  { id: "boostLive", goals: ["liveViewers", "liveFollowers"] },
  { id: "attractLeads", goals: ["leadForm", "messageLeads"] },
];

const GOAL_ICONS = {
  likesComments: IoHeartOutline,
  videoViews: IoPlayOutline,
  followers: IoPersonOutline,
  profileViews: IoEyeOutline,
  websiteTraffic: IoEyeOutline,
  productSales: IoPlayOutline,
  liveViewers: IoRadioOutline,
  liveFollowers: IoPersonOutline,
  leadForm: IoPersonOutline,
  messageLeads: IoHeartOutline,
};

/** Packages shaped like TikTok Promote presets (estimates + price). */
const PACKAGES_BY_GOAL = {
  likesComments: [
    {
      id: "mid",
      min: 1130,
      max: 4510,
      hours: 12,
      price: 197_272,
      recommended: true,
    },
    { id: "low", min: 131, max: 525, hours: 12, price: 23_000 },
    { id: "high", min: 1970, max: 7890, hours: 12, price: 345_226 },
  ],
  videoViews: [
    {
      id: "mid",
      min: 5200,
      max: 18_000,
      hours: 12,
      price: 197_272,
      recommended: true,
    },
    { id: "low", min: 800, max: 2800, hours: 12, price: 23_000 },
    { id: "high", min: 9000, max: 32_000, hours: 12, price: 345_226 },
  ],
  followers: [
    {
      id: "mid",
      min: 45,
      max: 180,
      hours: 12,
      price: 197_272,
      recommended: true,
    },
    { id: "low", min: 8, max: 30, hours: 12, price: 23_000 },
    { id: "high", min: 80, max: 320, hours: 12, price: 345_226 },
  ],
  profileViews: [
    {
      id: "mid",
      min: 900,
      max: 3600,
      hours: 12,
      price: 197_272,
      recommended: true,
    },
    { id: "low", min: 120, max: 480, hours: 12, price: 23_000 },
    { id: "high", min: 1600, max: 6400, hours: 12, price: 345_226 },
  ],
};

const DEFAULT_PACKAGES = PACKAGES_BY_GOAL.likesComments;

for (const goalId of [
  "websiteTraffic",
  "productSales",
  "liveViewers",
  "liveFollowers",
  "leadForm",
  "messageLeads",
]) {
  if (!PACKAGES_BY_GOAL[goalId]) {
    PACKAGES_BY_GOAL[goalId] = DEFAULT_PACKAGES.map((pkg) => ({ ...pkg }));
  }
}

/** TikTok-style VND: ₫197,272 */
function formatDong(amount) {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  return `₫${n.toLocaleString("en-US")}`;
}

function formatCompact(n) {
  const v = Math.max(0, Math.round(Number(n) || 0));
  if (v < 1000) return String(v);
  const k = v / 1000;
  const s = k >= 10 ? k.toFixed(0) : k.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${s}K`;
}

const PROMOTE_WELCOME_KEY = "vibely.promote.welcomeSeen";

function WelcomePromoteModal({ open, onClose, onCreate, t }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const steps = [
    {
      title: t("promotePage.welcome.step1Title"),
      body: t("promotePage.welcome.step1Body"),
    },
    {
      title: t("promotePage.welcome.step2Title"),
      body: t("promotePage.welcome.step2Body"),
    },
    {
      title: t("promotePage.welcome.step3Title"),
      body: t("promotePage.welcome.step3Body"),
    },
  ];

  return (
    <div
      className="promote-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promote-welcome-title"
        className="promote-welcome-modal relative flex max-h-[min(920px,calc(100dvh-2rem))] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl shadow-2xl"
      >
        <button
          type="button"
          aria-label={t("nav.close")}
          className="promote-welcome-close absolute left-4 top-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
          onClick={onClose}
        >
          <IoClose className="text-2xl" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-7 pt-12 sm:px-10">
          <div className="promote-welcome-art-wrap mx-auto mb-1 flex w-full max-w-[360px] items-center justify-center">
            <img
              src="/images/menu_creator_tool.png"
              alt=""
              className="promote-welcome-art"
              width={516}
              height={291}
              draggable={false}
            />
          </div>

          <h2
            id="promote-welcome-title"
            className="text-center text-[22px] font-bold leading-snug tracking-tight sm:text-[24px]"
          >
            {t("promotePage.welcome.title")}
          </h2>
          <p className="promote-welcome-desc mt-3 text-center text-[15px] leading-relaxed">
            {t("promotePage.welcome.description")}
          </p>

          <ol className="mt-7 space-y-5">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span
                  className="promote-welcome-step-num flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[15px] font-bold leading-snug">{step.title}</p>
                  <p className="promote-welcome-desc mt-1 text-[14px] leading-snug">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              className="flex h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-[#fe2c55] text-[16px] font-bold text-white hover:bg-[#e62a4d]"
              onClick={onCreate}
            >
              {t("promotePage.welcome.cta")}
            </button>
            <button
              type="button"
              className="promote-welcome-cancel flex h-12 w-full cursor-pointer items-center justify-center rounded-lg text-[16px] font-bold"
              onClick={onClose}
            >
              {t("promotePage.welcome.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceDetailsModal({ open, onClose, budget, canStart, onStart, t }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Shell: no wallet balance yet → show 0 like TikTok empty wallet.
  const subtotal = 0;
  const credit = 0;
  const total = 0;

  return (
    <div
      className="promote-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promote-price-title"
        className="promote-modal w-full max-w-[420px] overflow-hidden rounded-2xl shadow-2xl"
      >
        <div className="relative flex items-center justify-center px-4 pb-2 pt-5">
          <h2 id="promote-price-title" className="text-[17px] font-bold">
            {t("promotePage.priceDetailsTitle")}
          </h2>
          <button
            type="button"
            aria-label={t("nav.close")}
            className="promote-modal-close absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
            onClick={onClose}
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        <div className="px-5 pb-2 pt-2">
          <div className="promote-price-row flex items-center justify-between border-b py-3.5 text-[15px]">
            <span>{t("promotePage.subtotal")}</span>
            <span className="tabular-nums">{formatDong(subtotal)}</span>
          </div>
          <div className="promote-price-row flex items-center justify-between border-b py-3.5 text-[15px]">
            <span>{t("promotePage.insufficientPoints")}</span>
            <span className="tabular-nums">{formatDong(credit)}</span>
          </div>
          <div className="flex items-center justify-between py-3.5 text-[15px]">
            <span className="font-bold">{t("promotePage.total")}</span>
            <span className="font-bold tabular-nums">{formatDong(total)}</span>
          </div>
          {/* Keep budget visible for context while payment is not wired */}
          <p className="promote-muted pb-2 text-[12px]">
            {t("promotePage.budget")}: {formatDong(budget)}
          </p>
        </div>

        <div className="px-5 pb-5 pt-1">
          <button
            type="button"
            disabled={!canStart}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[#fe2c55] text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onStart}
          >
            {t("promotePage.startPromote")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * TikTok-like Promote (Quảng bá) create flow — compact column + price modal.
 */
export function PromotePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, user, logout } = useAuth();
  const activeLocale = i18n.resolvedLanguage || i18n.language;
  const enterFrom = searchParams.get("enter_from") || "";

  const [nav, setNav] = useState("create");
  const [goalTab, setGoalTab] = useState("boostAccount");
  const [goal, setGoal] = useState("likesComments");
  const [packageId, setPackageId] = useState("mid");
  const [priceOpen, setPriceOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    try {
      if (localStorage.getItem(PROMOTE_WELCOME_KEY) === "1") return false;
    } catch {
      /* ignore */
    }
    return true;
  });

  const dismissWelcome = () => {
    setWelcomeOpen(false);
    try {
      localStorage.setItem(PROMOTE_WELCOME_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    document.title = t("promotePage.pageTitle");
  }, [t, activeLocale]);

  useEffect(() => {
    if (enterFrom === "menu_creator_tool") {
      try {
        if (localStorage.getItem(PROMOTE_WELCOME_KEY) !== "1") {
          setWelcomeOpen(true);
        }
      } catch {
        setWelcomeOpen(true);
      }
    }
  }, [enterFrom]);

  useEffect(() => {
    const tab = GOAL_TABS.find((item) => item.id === goalTab);
    if (tab && !tab.goals.includes(goal)) {
      setGoal(tab.goals[0]);
    }
  }, [goalTab, goal]);

  const packages = useMemo(
    () => PACKAGES_BY_GOAL[goal] || DEFAULT_PACKAGES,
    [goal],
  );

  useEffect(() => {
    if (!packages.some((item) => item.id === packageId)) {
      const recommended = packages.find((item) => item.recommended) || packages[0];
      setPackageId(recommended?.id || "mid");
    }
  }, [packages, packageId]);

  const selectedPackage =
    packages.find((item) => item.id === packageId) || packages[0];
  const budget = selectedPackage?.price || 0;
  const activeGoals = GOAL_TABS.find((item) => item.id === goalTab)?.goals ?? [];
  const hasVideo = false;
  const canStart = hasVideo;

  const avatarSrc = String(
    user?.avatarUrl || user?.avatar || user?.profileImageUrl || "/images/users/default-avatar.jpeg",
  ).trim();

  return (
    <section className="vibely-chrome vibely-promote-page min-h-dvh">
      <header className="promote-header sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-4">
          <Link to="/" className="shrink-0" aria-label="Vibely">
            <VibelyWordmark className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t("nav.upload")}
              className="promote-icon-btn flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
              onClick={() => navigate("/vibelystudio/upload")}
            >
              <IoCloudUploadOutline className="text-[22px]" aria-hidden />
            </button>
            {token ? (
              <div className="relative">
                <button
                  type="button"
                  aria-label={t("settings.accountMenuAria")}
                  aria-expanded={avatarMenuOpen}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full"
                  onClick={() => setAvatarMenuOpen((v) => !v)}
                >
                  <AvatarImage src={avatarSrc} alt="" className="h-9 w-9 rounded-full object-cover" />
                </button>
                {avatarMenuOpen ? (
                  <AccountAvatarMenu
                    open={avatarMenuOpen}
                    user={user}
                    token={token}
                    onClose={() => setAvatarMenuOpen(false)}
                    onLogout={() => {
                      setAvatarMenuOpen(false);
                      logout?.();
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1100px] gap-8 px-4 py-5">
        <aside className="promote-sidebar hidden w-[200px] shrink-0 flex-col lg:flex">
          <button
            type="button"
            className="promote-create-btn mb-4 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[14px] font-semibold"
            onClick={() => setNav("create")}
          >
            <IoCreateOutline className="text-lg" aria-hidden />
            {t("promotePage.create")}
          </button>
          <nav className="flex flex-col gap-0.5">
            <button
              type="button"
              className={`promote-nav-item flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[14px] ${
                nav === "dashboard" ? "is-active" : ""
              }`}
              onClick={() => setNav("dashboard")}
            >
              <IoHomeOutline className="text-lg" aria-hidden />
              {t("promotePage.dashboard")}
            </button>
            <button
              type="button"
              className={`promote-nav-item flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[14px] ${
                nav === "mine" ? "is-active" : ""
              }`}
              onClick={() => setNav("mine")}
            >
              <IoPersonOutline className="text-lg" aria-hidden />
              {t("promotePage.mine")}
            </button>
            <button
              type="button"
              className={`promote-nav-item flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[14px] ${
                nav === "payment" ? "is-active" : ""
              }`}
              onClick={() => setNav("payment")}
            >
              <IoWalletOutline className="text-lg" aria-hidden />
              {t("promotePage.payment")}
            </button>
          </nav>
          <div className="promote-sidebar-footer mt-auto space-y-2 pt-8 text-[11px] leading-relaxed">
            <p>{t("promotePage.programTerms")}</p>
            <p>{t("promotePage.adsPolicy")}</p>
            <p>{t("nav.copyright")}</p>
          </div>
        </aside>

        <main className="mx-auto min-w-0 w-full max-w-[680px] flex-1 pb-24">
          {nav !== "create" ? (
            <div className="promote-card rounded-xl p-7 text-center">
              <h1 className="text-lg font-bold">
                {nav === "dashboard"
                  ? t("promotePage.dashboard")
                  : nav === "payment"
                    ? t("promotePage.payment")
                    : t("promotePage.mine")}
              </h1>
              <p className="promote-muted mt-2 text-sm">
                {nav === "payment"
                  ? t("promotePage.emptyPayment")
                  : t("promotePage.emptyCampaigns")}
              </p>
              <button
                type="button"
                className="mt-5 cursor-pointer rounded-lg bg-[#fe2c55] px-5 py-2.5 text-sm font-semibold text-white"
                onClick={() => setNav("create")}
              >
                {t("promotePage.startPromote")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <section className="promote-card rounded-xl p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-1.5">
                  <h2 className="text-[17px] font-bold">{t("promotePage.chooseGoal")}</h2>
                  <IoInformationCircleOutline className="promote-muted text-base" aria-hidden />
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {GOAL_TABS.map((tab) => {
                    const active = goalTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={`cursor-pointer rounded-md border px-3 py-1.5 text-[13px] font-semibold transition ${
                          active
                            ? "border-[#fe2c55] bg-white text-[#fe2c55]"
                            : "promote-pill"
                        }`}
                        onClick={() => setGoalTab(tab.id)}
                      >
                        {t(`promotePage.tabs.${tab.id}`)}
                      </button>
                    );
                  })}
                </div>
                <ul>
                  {activeGoals.map((goalId) => {
                    const Icon = GOAL_ICONS[goalId] || IoHeartOutline;
                    const selected = goal === goalId;
                    return (
                      <li key={goalId}>
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-3 py-3.5 text-left"
                          onClick={() => setGoal(goalId)}
                        >
                          <Icon
                            className={`shrink-0 text-[22px] ${selected ? "text-[#fe2c55]" : "promote-muted"}`}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 text-[15px]">
                            {t(`promotePage.goals.${goalId}`)}
                          </span>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              selected
                                ? "border-[#fe2c55] bg-[#fe2c55]"
                                : "border-zinc-400 bg-transparent"
                            }`}
                            aria-hidden
                          >
                            {selected ? (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="promote-card rounded-xl px-5 py-10 text-center sm:px-6">
                <p className="text-[17px] font-bold">{t("promotePage.noVideoTitle")}</p>
                <p className="promote-muted mt-1 text-[14px]">{t("promotePage.noVideoHint")}</p>
              </section>

              <section className="promote-card rounded-xl p-5 sm:p-6">
                <h2 className="mb-4 text-[17px] font-bold">
                  {t("promotePage.choosePackage")}
                </h2>
                <div className="space-y-3">
                  {packages.map((pkg) => {
                    const selected = packageId === pkg.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        className={`promote-package w-full overflow-hidden rounded-xl border text-left transition ${
                          selected
                            ? "border-[#fe2c55] shadow-[0_0_0_1px_#fe2c55]"
                            : "promote-package-idle"
                        }`}
                        onClick={() => setPackageId(pkg.id)}
                      >
                        {pkg.recommended ? (
                          <div className="flex items-center justify-between gap-2 bg-[#fe2c55] px-4 py-2 text-[13px] font-semibold text-white">
                            <span>{t(`promotePage.packageFit.${goal}`, {
                              defaultValue: t("promotePage.packageFit.likesComments"),
                            })}</span>
                          </div>
                        ) : null}
                        <div className="flex items-center gap-3 px-4 py-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold leading-snug">
                              {t("promotePage.packageRange", {
                                min: formatCompact(pkg.min),
                                max: formatCompact(pkg.max),
                                metric: t(`promotePage.packageMetric.${goal}`, {
                                  defaultValue: t(
                                    "promotePage.packageMetric.likesComments",
                                  ),
                                }),
                                hours: pkg.hours,
                              })}
                            </p>
                            <p className="mt-2 text-[15px] font-bold tabular-nums">
                              {formatDong(pkg.price)}
                            </p>
                          </div>
                          {pkg.recommended ? (
                            <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#fe2c55]">
                              <IoCheckmarkCircle className="text-base" aria-hidden />
                              {t("promotePage.recommended")}
                            </span>
                          ) : (
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                selected
                                  ? "border-[#fe2c55] bg-[#fe2c55]"
                                  : "border-zinc-400 bg-transparent"
                              }`}
                              aria-hidden
                            >
                              {selected ? (
                                <span className="h-2 w-2 rounded-full bg-white" />
                              ) : null}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="promote-card rounded-xl p-5 sm:p-6">
                <h2 className="text-[17px] font-bold">{t("promotePage.termsTitle")}</h2>
                <p className="promote-muted mt-2.5 text-[12px] leading-relaxed">
                  {t("promotePage.termsP1")}
                </p>
                <p className="promote-muted mt-2 text-[12px] leading-relaxed">
                  {t("promotePage.termsP2")}
                </p>
              </section>
            </div>
          )}
        </main>
      </div>

      {nav === "create" ? (
        <div className="promote-footer fixed inset-x-0 bottom-0 z-30 border-t">
          <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-3 lg:pl-[232px]">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                className="promote-muted cursor-pointer text-[13px] font-semibold"
                onClick={() => setPriceOpen(true)}
              >
                {t("promotePage.viewPriceDetails")}
              </button>
            </div>
            <button
              type="button"
              disabled={!canStart}
              className="cursor-pointer rounded-full bg-[#fe2c55] px-10 py-2.5 text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => setPriceOpen(true)}
            >
              {t("promotePage.start")}
            </button>
          </div>
        </div>
      ) : null}

      <WelcomePromoteModal
        open={welcomeOpen}
        onClose={dismissWelcome}
        onCreate={() => {
          dismissWelcome();
          setNav("create");
        }}
        t={t}
      />

      <PriceDetailsModal
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        budget={budget}
        canStart={canStart}
        onStart={() => setPriceOpen(false)}
        t={t}
      />
    </section>
  );
}
