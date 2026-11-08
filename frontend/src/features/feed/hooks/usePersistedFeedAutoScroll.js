import { useCallback, useState } from "react";
import {
  readStoredFeedAutoScroll,
  writeStoredFeedAutoScroll,
} from "@/features/feed/utils/feedAutoScrollStorage.js";

export function usePersistedFeedAutoScroll() {
  const [enabled, setEnabledState] = useState(readStoredFeedAutoScroll);

  const setEnabled = useCallback((next) => {
    setEnabledState((prev) => {
      const value = typeof next === "function" ? next(prev) : Boolean(next);
      writeStoredFeedAutoScroll(value);
      return value;
    });
  }, []);

  return [enabled, setEnabled];
}
