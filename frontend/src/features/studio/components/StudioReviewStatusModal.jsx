import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IoClose, IoTimeOutline } from "react-icons/io5";

function ReviewStepper({ activeStep, t }) {
  const steps = [
    t("studio.posts.reviewModal.stepPending"),
    t("studio.posts.reviewModal.stepReviewing"),
    t("studio.posts.reviewModal.stepDone"),
  ];

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold text-zinc-900">
        {t("studio.posts.reviewModal.statusTitle")}
      </p>
      <div className="relative mt-4 px-1">
        <div
          className="absolute top-[7px] right-[12%] left-[12%] h-0.5 bg-zinc-200"
          aria-hidden
        />
        <div
          className="absolute top-[7px] left-[12%] h-0.5 bg-zinc-900 transition-all duration-300"
          style={{
            width: activeStep <= 0 ? "0%" : activeStep === 1 ? "38%" : "76%",
          }}
          aria-hidden
        />
        <ol className="relative flex justify-between gap-2">
          {steps.map((label, index) => {
            const done = index < activeStep;
            const active = index === activeStep;
            const filled = done || active;
            return (
              <li
                key={label}
                className="flex max-w-[30%] flex-col items-center text-center"
              >
                <span
                  className={`relative z-10 h-4 w-4 rounded-full border-2 ${
                    filled
                      ? "border-zinc-900 bg-zinc-900"
                      : "border-zinc-300 bg-white"
                  }`}
                  aria-hidden
                />
                <span
                  className={`mt-2 text-[11px] leading-snug ${
                    active ? "font-semibold text-zinc-900" : "text-zinc-500"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function StudioReviewStatusModal({ open, activeStep, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-review-modal-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-4 right-4 cursor-pointer rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          aria-label={t("studio.posts.reviewModal.close")}
          onClick={onClose}
        >
          <IoClose className="h-6 w-6" aria-hidden />
        </button>

        <div className="flex flex-col items-center pt-2 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ff7a00] text-white">
            <IoTimeOutline className="h-9 w-9" aria-hidden />
          </span>
          <h2
            id="studio-review-modal-title"
            className="mt-5 text-xl font-bold text-zinc-900"
          >
            {t("studio.posts.reviewingContent")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {t("studio.posts.reviewModal.subtitle")}
          </p>
        </div>

        <ReviewStepper activeStep={activeStep} t={t} />

        <div className="mt-6 rounded-xl bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-zinc-900">
            {t("studio.posts.reviewModal.faqTitle")}
          </p>
          <div className="mt-3 space-y-4 text-left">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {t("studio.posts.reviewModal.faqWhyTitle")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                {t("studio.posts.reviewModal.faqWhyBody")}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {t("studio.posts.reviewModal.faqEngagementTitle")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                {t("studio.posts.reviewModal.faqEngagementBody")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
