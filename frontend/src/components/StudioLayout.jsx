import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoChevronBack, IoMenu } from "react-icons/io5";
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
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const onUploadRoute = /^\/vibelystudio\/upload/.test(location.pathname);

  return (
    <section
      className={
        isLight
          ? "flex h-dvh overflow-hidden bg-[#f1f1f2] text-slate-900"
          : "flex h-dvh overflow-hidden bg-black text-zinc-100"
      }
    >
      <StudioSidebar active={active} theme={theme} className="hidden lg:flex" />

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[200] bg-black/50 lg:hidden"
            aria-label="Đóng menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <StudioSidebar
            active={active}
            theme={theme}
            className="fixed inset-y-0 left-0 z-[210] flex w-[min(280px,85vw)] shadow-2xl lg:hidden"
            onNavigate={() => setMobileNavOpen(false)}
          />
        </>
      ) : null}

      <main
        className={
          isLight
            ? "flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-[#f1f1f2] p-3 sm:p-6 lg:p-8"
            : "flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-black p-3 sm:p-6 lg:p-8"
        }
      >
        <div
          className={
            isLight
              ? "mb-4 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 pb-3 sm:mb-6 sm:gap-4 sm:pb-4"
              : "mb-4 flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 sm:mb-6 sm:gap-4 sm:pb-4"
          }
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className={
                isLight
                  ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-700 hover:bg-slate-100 lg:hidden"
                  : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-zinc-200 hover:bg-zinc-900 lg:hidden"
              }
              aria-label={onUploadRoute ? "Quay lại feed" : "Menu Studio"}
              onClick={() =>
                onUploadRoute ? navigate("/foryou") : setMobileNavOpen(true)
              }
            >
              {onUploadRoute ? (
                <IoChevronBack aria-hidden />
              ) : (
                <IoMenu aria-hidden />
              )}
            </button>
            <span
              className={
                isLight
                  ? "min-w-0 truncate text-base font-bold text-slate-900 sm:text-lg lg:text-xl"
                  : "min-w-0 truncate text-base font-bold text-white sm:text-lg lg:text-xl"
              }
            >
              Vibely Studio
            </span>
          </div>
          <StudioAccountMenu theme={theme} />
        </div>
        {!hidePageHeader ? (
          <header
            className={
              isLight
                ? "mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:mb-6"
                : "mb-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 sm:mb-6"
            }
          >
            <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
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
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
          {children}
        </div>
      </main>
    </section>
  );
}
