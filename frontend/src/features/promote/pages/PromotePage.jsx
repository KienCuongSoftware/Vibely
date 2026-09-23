import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoCreateOutline,
  IoEyeOutline,
  IoHeartOutline,
  IoHomeOutline,
  IoInformationCircleOutline,
  IoPersonOutline,
  IoPlayOutline,
  IoThumbsUpOutline,
  IoCloudUploadOutline,
} from "react-icons/io5";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AccountAvatarMenu } from "@/shared/components/AccountAvatarMenu.jsx";
import { AvatarImage } from "@/shared/components/AvatarImage";
import { VibelyWordmark } from "@/shared/components/VibelyWordmark.jsx";

const BUDGET_MIN = 50_000;
const BUDGET_MAX = 2_000_000;
const BUDGET_STEP = 10_000;
const BUDGET_DEFAULT = 169_000;

const DURATION_MIN = 6;
const DURATION_MAX = 24;
const DURATION_DEFAULT = 12;

const GOAL_TABS = [
  { id: "boostAccount", goals: ["likesComments", "videoViews", "followers", "profileViews"] },
  { id: "increaseSales", goals: ["websiteTraffic", "productSales"] },
  { id: "attractLeads", goals: ["leadForm", "messageLeads"] },
];

const GOAL_ICONS = {
  likesComments: IoHeartOutline,
  videoViews: IoPlayOutline,
  followers: IoPersonOutline,
  profileViews: IoEyeOutline,
  websiteTraffic: IoEyeOutline,
  productSales: IoPlayOutline,
  leadForm: IoPersonOutline,
  messageLeads: IoHeartOutline,
};

function formatBudget(amount, locale) {
  try {
    return new Intl.NumberFormat(locale || "vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("vi-VN")} ₫`;
  }
}

function estimateReach(budget, durationHours) {
  if (!budget || !durationHours) return null;
  const base = Math.round((budget / 1000) * 18 + durationHours * 40);
  return {
    min: Math.max(50, Math.round(base * 0.7)),
    max: Math.round(base * 1.35),
  };
}

function PromoteSlider({ value, min, max, step, onChange, ariaLabel }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      className="promote-slider w-full cursor-pointer"
      style={{ "--promote-pct": `${pct}%` }}
    />
  );
}

/**
 * TikTok-like Promote (Quảng bá) create flow — UI shell, no payment backend yet.
 */
export function PromotePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const activeLocale = i18n.resolvedLanguage || i18n.language;

  const [nav, setNav] = useState("create");
  const [goalTab, setGoalTab] = useState("boostAccount");
  const [goal, setGoal] = useState("likesComments");
  const [budget, setBudget] = useState(BUDGET_DEFAULT);
  const [duration, setDuration] = useState(DURATION_DEFAULT);
  const [priceOpen, setPriceOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  useEffect(() => {
    document.title = t("promotePage.pageTitle");
  }, [t, activeLocale]);

  useEffect(() => {
    const tab = GOAL_TABS.find((item) => item.id === goalTab);
    if (tab && !tab.goals.includes(goal)) {
      setGoal(tab.goals[0]);
    }
  }, [goalTab, goal]);

  const localeTag = String(activeLocale || "vi").startsWith("vi") ? "vi-VN" : activeLocale;
  const reach = useMemo(() => estimateReach(budget, duration), [budget, duration]);
  const activeGoals = GOAL_TABS.find((item) => item.id === goalTab)?.goals ?? [];
  const hasVideo = false;
  const canStart = hasVideo;

  const avatarSrc = String(
    user?.avatarUrl || user?.avatar || user?.profileImageUrl || "/images/users/default-avatar.jpeg",
  ).trim();

  return (
    <section className="vibely-chrome vibely-promote-page min-h-dvh">
      <header className="promote-header sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
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

      <div className="mx-auto flex max-w-[1200px] gap-6 px-4 py-6 sm:px-6">
        <aside className="promote-sidebar hidden w-[220px] shrink-0 flex-col md:flex">
          <button
            type="button"
            className="promote-create-btn mb-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[15px] font-semibold"
            onClick={() => navigate("/vibelystudio/upload")}
          >
            <IoCreateOutline className="text-lg" aria-hidden />
            {t("promotePage.create")}
          </button>
          <nav className="flex flex-col gap-0.5">
            <button
              type="button"
              className={`promote-nav-item flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] ${
                nav === "dashboard" ? "is-active" : ""
              }`}
              onClick={() => setNav("dashboard")}
            >
              <IoHomeOutline className="text-lg" aria-hidden />
              {t("promotePage.dashboard")}
            </button>
            <button
              type="button"
              className={`promote-nav-item flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] ${
                nav === "mine" ? "is-active" : ""
              }`}
              onClick={() => setNav("mine")}
            >
              <IoPersonOutline className="text-lg" aria-hidden />
              {t("promotePage.mine")}
            </button>
          </nav>
          <div className="promote-sidebar-footer mt-auto space-y-2 pt-8 text-[12px] leading-relaxed">
            <p>{t("promotePage.programTerms")}</p>
            <p>{t("promotePage.adsPolicy")}</p>
            <p>{t("nav.copyright")}</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-28">
          {nav !== "create" ? (
            <div className="promote-card rounded-xl p-8 text-center">
              <h1 className="text-xl font-bold">
                {nav === "dashboard" ? t("promotePage.dashboard") : t("promotePage.mine")}
              </h1>
              <p className="promote-muted mt-2 text-sm">{t("promotePage.emptyCampaigns")}</p>
              <button
                type="button"
                className="mt-6 cursor-pointer rounded-lg bg-[#fe2c55] px-5 py-2.5 text-sm font-semibold text-white"
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
                        className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                          active
                            ? "border-[#fe2c55] bg-[#fe2c55]/10 text-[#fe2c55]"
                            : "promote-pill"
                        }`}
                        onClick={() => setGoalTab(tab.id)}
                      >
                        {t(`promotePage.tabs.${tab.id}`)}
                      </button>
                    );
                  })}
                </div>
                <ul className="divide-y divide-[color:var(--promote-divider)]">
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
                          <Icon className="promote-muted shrink-0 text-[22px]" aria-hidden />
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
                <p className="text-lg font-bold">{t("promotePage.noVideoTitle")}</p>
                <p className="promote-muted mt-1 text-sm">{t("promotePage.noVideoHint")}</p>
                <button
                  type="button"
                  className="mt-5 cursor-pointer rounded-lg border border-[#fe2c55] px-4 py-2 text-sm font-semibold text-[#fe2c55]"
                  onClick={() => navigate("/vibelystudio/upload")}
                >
                  {t("promotePage.uploadContent")}
                </button>
              </section>

              <section className="promote-card rounded-xl p-5 sm:p-6">
                <div className="mb-1">
                  <h2 className="text-[17px] font-bold">{t("promotePage.customPromote")}</h2>
                  <p className="promote-muted text-[13px]">{t("promotePage.estimatesHint")}</p>
                </div>
                <div className="promote-estimate mt-4 flex min-h-[88px] items-center justify-center rounded-lg text-2xl font-semibold">
                  {hasVideo && reach
                    ? t("promotePage.estimateRange", {
                        min: reach.min.toLocaleString(localeTag),
                        max: reach.max.toLocaleString(localeTag),
                      })
                    : "—"}
                </div>

                <h3 className="mt-6 text-[15px] font-bold">{t("promotePage.budgetDuration")}</h3>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold">{t("promotePage.budget")}</span>
                    <span className="text-[15px] font-bold tabular-nums">
                      {formatBudget(budget, localeTag)}
                    </span>
                  </div>
                  <PromoteSlider
                    value={budget}
                    min={BUDGET_MIN}
                    max={BUDGET_MAX}
                    step={BUDGET_STEP}
                    ariaLabel={t("promotePage.budget")}
                    onChange={setBudget}
                  />
                  <div className="promote-budget-tip mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13px]">
                    <IoThumbsUpOutline className="mt-0.5 shrink-0 text-base text-[#fe2c55]" aria-hidden />
                    <span>{t("promotePage.budgetTip")}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold">{t("promotePage.duration")}</span>
                    <span className="text-[15px] font-bold">
                      {t("promotePage.durationHours", { count: duration })}
                    </span>
                  </div>
                  <PromoteSlider
                    value={duration}
                    min={DURATION_MIN}
                    max={DURATION_MAX}
                    step={1}
                    ariaLabel={t("promotePage.duration")}
                    onChange={setDuration}
                  />
                </div>
              </section>

              <section className="promote-card rounded-xl p-5 sm:p-6">
                <h2 className="text-[17px] font-bold">{t("promotePage.termsTitle")}</h2>
                <p className="promote-muted mt-3 text-[13px] leading-relaxed">
                  {t("promotePage.termsP1")}
                </p>
                <p className="promote-muted mt-2 text-[13px] leading-relaxed">
                  {t("promotePage.termsP2")}
                </p>
              </section>
            </div>
          )}
        </main>
      </div>

      {nav === "create" ? (
        <div className="promote-footer fixed inset-x-0 bottom-0 z-30 border-t">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6 md:pl-[244px]">
            <button
              type="button"
              className="promote-muted cursor-pointer text-sm font-semibold"
              onClick={() => setPriceOpen((v) => !v)}
            >
              {priceOpen ? t("promotePage.hidePriceDetails") : t("promotePage.viewPriceDetails")}
            </button>
            <button
              type="button"
              disabled={!canStart}
              className="cursor-pointer rounded-lg bg-[#fe2c55] px-8 py-2.5 text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => {}}
            >
              {t("promotePage.start")}
            </button>
          </div>
          {priceOpen ? (
            <div className="promote-price-panel border-t px-4 py-3 text-sm sm:px-6 md:pl-[244px]">
              <div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-8 gap-y-1">
                <span>
                  {t("promotePage.budget")}:{" "}
                  <strong>{formatBudget(budget, localeTag)}</strong>
                </span>
                <span>
                  {t("promotePage.duration")}:{" "}
                  <strong>{t("promotePage.durationHours", { count: duration })}</strong>
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
