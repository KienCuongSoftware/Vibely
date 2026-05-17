import React from "react";
import { StudioSidebar } from "./StudioSidebar";
import { StudioAccountMenu } from "./StudioAccountMenu";

/**
 * @param {'dark' | 'light'} [theme='dark']
 */
export function StudioLayout({
  active,
  title,
  subtitle,
  children,
  hidePageHeader = false,
  theme = "dark",
}) {
  const isLight = theme === "light";
  return (
    <section
      className={
        isLight
          ? "flex min-h-dvh bg-[#f1f1f2] text-slate-900"
          : "flex min-h-dvh bg-black text-zinc-100"
      }
    >
      <StudioSidebar active={active} theme={theme} />
      <main
        className={
          isLight
            ? "flex min-h-dvh min-w-0 flex-1 flex-col bg-[#f1f1f2] p-4 sm:p-6 lg:p-8"
            : "flex min-h-dvh min-w-0 flex-1 flex-col bg-black p-4 sm:p-6 lg:p-8"
        }
      >
        <div
          className={
            isLight
              ? "mb-6 flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 pb-4"
              : "mb-6 flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800/80 pb-4"
          }
        >
          <span
            className={
              isLight
                ? "text-lg font-bold text-slate-900 sm:text-xl"
                : "text-lg font-bold text-white sm:text-xl"
            }
          >
            Vibely Studio
          </span>
          <StudioAccountMenu theme={theme} />
        </div>
        {!hidePageHeader ? (
          <header
            className={
              isLight
                ? "mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                : "mb-6 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3"
            }
          >
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle ? (
              <p
                className={
                  isLight
                    ? "mt-1 text-sm text-slate-500"
                    : "mt-1 text-sm text-zinc-400"
                }
              >
                {subtitle}
              </p>
            ) : null}
          </header>
        ) : null}
        <div className="min-h-0 flex-1">{children}</div>
      </main>
    </section>
  );
}
