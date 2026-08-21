import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoClose, IoRefresh } from "react-icons/io5";
import { BehaviorTracker } from "@/security/behavior/BehaviorTracker.js";
import {
  fetchCaptchaChallenge,
  getDeviceHash,
  storeVerificationToken,
  verifyCaptcha,
} from "@/security/sdk/antiBotClient.js";
import { getOrCreateSessionId } from "@/security/sessionId.js";
import { CheckboxCaptcha } from "@/security/captcha/CheckboxCaptcha.jsx";
import { RotateCaptcha } from "@/security/captcha/RotateCaptcha.jsx";
import { SliderCaptcha } from "@/security/captcha/SliderCaptcha.jsx";

const TITLE_KEYS = {
  CHECKBOX: "captcha.titleCheckbox",
  ROTATE: "captcha.titleRotate",
  SLIDER: "captcha.titleSlider",
  MULTI_STEP: "captcha.titleMultiStep",
};

const LOAD_TIMEOUT_MS = 25_000;

export function ChallengeModal({
  open,
  challengeLevel = "ROTATE",
  purpose = "LOGIN",
  onClose,
  onVerified,
}) {
  const { t } = useTranslation();
  const [challenge, setChallenge] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [sliderOffset, setSliderOffset] = useState(0);
  const [checkboxAttested, setCheckboxAttested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const trackerRef = useRef(null);
  const submittingRef = useRef(false);
  const hasInteractedRef = useRef(false);
  const loadSeqRef = useRef(0);

  const submit = useCallback(async () => {
    if (!challenge || submittingRef.current) return;
    if (challenge.multiStep && !checkboxAttested) {
      setError(t("captcha.tickFirst"));
      return;
    }

    submittingRef.current = true;
    setVerifying(true);
    setError("");
    try {
      const samples = trackerRef.current?.drain() ?? [];
      const result = await verifyCaptcha({
        challengeId: challenge.challengeId,
        signedToken: challenge.signedToken,
        purpose,
        rotation: challenge.type === "ROTATE" ? rotation : undefined,
        sliderOffset: challenge.type === "SLIDER" ? sliderOffset : undefined,
        checkboxAttested:
          challenge.type === "CHECKBOX" || challenge.multiStep
            ? checkboxAttested
            : undefined,
        solveDurationMs: Date.now() - startedAt,
        sessionId: getOrCreateSessionId(),
        deviceHash: getDeviceHash(),
        behaviorSamples: samples,
      });
      if (!result.verified) {
        setError(t("captcha.verifyIncorrect"));
        hasInteractedRef.current = false;
        await loadChallenge(challengeLevel);
        return;
      }
      storeVerificationToken(result.verificationToken, result.expiresAtEpochMs);
      onVerified?.(result.verificationToken);
      onClose?.();
    } catch (err) {
      setError(err.message || t("captcha.verifyFailed"));
    } finally {
      submittingRef.current = false;
      setVerifying(false);
    }
  }, [
    challenge,
    checkboxAttested,
    challengeLevel,
    onClose,
    onVerified,
    purpose,
    rotation,
    sliderOffset,
    startedAt,
    t,
  ]);

  async function loadChallenge(level) {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError("");
    setCheckboxAttested(false);
    setSliderOffset(0);
    hasInteractedRef.current = false;
    setChallenge(null);

    const timeoutId = window.setTimeout(() => {
      if (loadSeqRef.current !== seq) return;
      setError(t("captcha.loadTimeout"));
      setLoading(false);
    }, LOAD_TIMEOUT_MS);

    try {
      const data = await fetchCaptchaChallenge(level);
      if (loadSeqRef.current !== seq) return;
      setChallenge(data);
      setRotation(0);
      setStartedAt(Date.now());
    } catch (err) {
      if (loadSeqRef.current !== seq) return;
      setError(err.message || t("captcha.loadFailed"));
    } finally {
      window.clearTimeout(timeoutId);
      if (loadSeqRef.current === seq) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    trackerRef.current = new BehaviorTracker();
    trackerRef.current.start();
    trackerRef.current.attach();
    void loadChallenge(challengeLevel);
    return () => {
      loadSeqRef.current += 1;
      trackerRef.current?.detach();
    };
  }, [open, challengeLevel]);

  useEffect(() => {
    if (!open || !challenge || challenge.type !== "CHECKBOX" || !checkboxAttested) {
      return;
    }
    void submit();
  }, [checkboxAttested, challenge?.type, open, submit]);

  const handlePuzzleRelease = useCallback(() => {
    if (!challenge || loading || verifying) return;
    if (challenge.type !== "ROTATE" && challenge.type !== "SLIDER") return;
    if (!hasInteractedRef.current) return;
    void submit();
  }, [challenge, loading, submit, verifying]);

  const markInteracted = useCallback(() => {
    hasInteractedRef.current = true;
  }, []);

  const recordBehaviorSample = useCallback((sample) => {
    trackerRef.current?.push(sample);
  }, []);

  if (!open) return null;

  const titleKey = challenge?.multiStep
    ? TITLE_KEYS.MULTI_STEP
    : TITLE_KEYS[challenge?.type] || TITLE_KEYS.ROTATE;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-100">{t(titleKey)}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label={t("common.close")}
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        {loading && !challenge ? (
          <p className="py-10 text-center text-sm text-zinc-400">{t("captcha.loading")}</p>
        ) : null}

        <div className={verifying ? "pointer-events-none opacity-70" : ""}>
          {challenge?.type === "ROTATE" ? (
            <RotateCaptcha
              outerRingBase64={challenge.puzzleBase64 ? challenge.imageBase64 : undefined}
              innerDiscBase64={challenge.puzzleBase64}
              imageBase64={challenge.imageBase64}
              onRotationChange={(value) => {
                markInteracted();
                setRotation(value);
              }}
              onRelease={handlePuzzleRelease}
              onBehaviorSample={recordBehaviorSample}
            />
          ) : null}

          {challenge?.type === "SLIDER" ? (
            <SliderCaptcha
              challengeKey={challenge.challengeId}
              backgroundBase64={challenge.imageBase64}
              puzzleBase64={challenge.puzzleBase64}
              sliderMax={challenge.sliderMax}
              puzzleY={challenge.displayRotation ?? 30}
              onOffsetChange={(value) => {
                markInteracted();
                setSliderOffset(value);
              }}
              onRelease={handlePuzzleRelease}
              onBehaviorSample={recordBehaviorSample}
            />
          ) : null}

          {challenge?.type === "CHECKBOX" ? (
            <CheckboxCaptcha onAttestedChange={setCheckboxAttested} />
          ) : null}

          {challenge?.multiStep ? (
            <div className="mt-3">
              <CheckboxCaptcha onAttestedChange={setCheckboxAttested} />
            </div>
          ) : null}
        </div>

        {verifying ? (
          <p className="mt-2 text-center text-xs text-zinc-400">{t("captcha.verifying")}</p>
        ) : null}

        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
            onClick={() => void loadChallenge(challengeLevel)}
            disabled={loading || verifying}
          >
            <IoRefresh /> {t("captcha.refresh")}
          </button>
          {challenge?.challengeId ? (
            <span className="truncate text-[10px] text-zinc-600" title={challenge.challengeId}>
              {challenge.challengeId}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
