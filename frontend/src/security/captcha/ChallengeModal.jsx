import React, { useCallback, useEffect, useRef, useState } from "react";
import { IoClose, IoRefresh } from "react-icons/io5";
import { BehaviorTracker } from "../behavior/BehaviorTracker.js";
import {
  fetchCaptchaChallenge,
  getDeviceHash,
  storeVerificationToken,
  verifyCaptcha,
} from "../sdk/antiBotClient.js";
import { getOrCreateSessionId } from "../sessionId.js";
import { CheckboxCaptcha } from "./CheckboxCaptcha.jsx";
import { RotateCaptcha } from "./RotateCaptcha.jsx";
import { SliderCaptcha } from "./SliderCaptcha.jsx";

const TITLES = {
  CHECKBOX: "Xác minh nhanh",
  ROTATE: "Kéo thanh trượt để ghép hình",
  SLIDER: "Kéo mảnh ghép vào đúng vị trí",
  MULTI_STEP: "Xác minh bảo mật nhiều bước",
};

export function ChallengeModal({
  open,
  challengeLevel = "ROTATE",
  purpose = "LOGIN",
  onClose,
  onVerified,
}) {
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

  const submit = useCallback(async () => {
    if (!challenge || submittingRef.current) return;
    if (challenge.multiStep && !checkboxAttested) {
      setError("Vui lòng tick xác minh trước khi ghép hình");
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
        setError("Xác minh chưa đúng, vui lòng thử lại");
        hasInteractedRef.current = false;
        await loadChallenge(challengeLevel);
        return;
      }
      storeVerificationToken(result.verificationToken, result.expiresAtEpochMs);
      onVerified?.(result.verificationToken);
      onClose?.();
    } catch (err) {
      setError(err.message || "Xác minh captcha thất bại");
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
  ]);

  async function loadChallenge(level) {
    setLoading(true);
    setError("");
    setCheckboxAttested(false);
    setSliderOffset(0);
    hasInteractedRef.current = false;
    try {
      const data = await fetchCaptchaChallenge(level);
      setChallenge(data);
      setRotation(0);
      setStartedAt(Date.now());
    } catch (err) {
      setError(err.message || "Không tải được captcha");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    trackerRef.current = new BehaviorTracker();
    trackerRef.current.start();
    trackerRef.current.attach();
    loadChallenge(challengeLevel);
    return () => trackerRef.current?.detach();
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

  if (!open) return null;

  const title =
    challenge?.multiStep
      ? TITLES.MULTI_STEP
      : TITLES[challenge?.type] || TITLES.ROTATE;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-100">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Đóng"
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        {loading && !challenge ? (
          <p className="py-10 text-center text-sm text-zinc-400">Đang tải captcha...</p>
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
          <p className="mt-2 text-center text-xs text-zinc-400">Đang xác minh...</p>
        ) : null}

        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
            onClick={() => loadChallenge(challengeLevel)}
            disabled={loading || verifying}
          >
            <IoRefresh /> Làm mới
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
