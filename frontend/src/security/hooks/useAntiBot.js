import { useCallback, useEffect, useState } from "react";
import {
  bootstrapAntiBot,
  evaluateRisk,
  readVerificationToken,
} from "../sdk/antiBotClient.js";

export function useAntiBot(action = "login") {
  const [ready, setReady] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeLevel, setChallengeLevel] = useState("ROTATE");
  const [risk, setRisk] = useState(null);

  useEffect(() => {
    let cancelled = false;
    bootstrapAntiBot()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openChallenge = useCallback((level = "ROTATE") => {
    setChallengeLevel(level === "NONE" ? "ROTATE" : level);
    setChallengeOpen(true);
  }, []);

  const ensureHuman = useCallback(async () => {
    const existing = readVerificationToken();
    if (existing) return { verified: true, token: existing };

    const evaluation = await evaluateRisk(action);
    setRisk(evaluation);
    if (!evaluation.challengeRequired) {
      return { verified: true, token: null };
    }

    openChallenge(evaluation.challengeLevel || "ROTATE");
    return { verified: false, pendingChallenge: true };
  }, [action, openChallenge]);

  const handleCaptchaRequired = useCallback((payload) => {
    const level = payload?.challengeLevel || "ROTATE";
    setRisk((prev) => ({ ...prev, riskScore: payload?.riskScore, challengeLevel: level }));
    openChallenge(level);
    return { verified: false, pendingChallenge: true };
  }, [openChallenge]);

  const closeChallenge = useCallback(() => setChallengeOpen(false), []);

  const onChallengeVerified = useCallback(() => {
    setChallengeOpen(false);
  }, []);

  return {
    ready,
    risk,
    challengeOpen,
    challengeLevel,
    closeChallenge,
    onChallengeVerified,
    ensureHuman,
    handleCaptchaRequired,
    openChallenge,
  };
}
