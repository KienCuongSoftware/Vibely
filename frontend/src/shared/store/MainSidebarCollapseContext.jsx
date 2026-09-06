import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  FEED_SIDEBAR_COLLAPSED_WIDTH_PX,
  FEED_SIDEBAR_WIDTH_PX,
} from "@/features/feed/utils/feedLayout.js";
import {
  readSidebarCollapsedPreference,
  writeSidebarCollapsedPreference,
} from "@/shared/utils/sidebarCollapseStorage.js";

const MainSidebarCollapseContext = createContext(null);

export function MainSidebarCollapseProvider({ children }) {
  const [userCollapsed, setUserCollapsedState] = useState(() =>
    readSidebarCollapsedPreference(),
  );
  /** Search / Activity / More (hoặc forceCollapsed) đang thu rail. */
  const [transientCollapsed, setTransientCollapsed] = useState(false);

  const setUserCollapsed = useCallback((next) => {
    setUserCollapsedState((prev) => {
      const value = typeof next === "function" ? next(prev) : Boolean(next);
      writeSidebarCollapsedPreference(value);
      return value;
    });
  }, []);

  const toggleUserCollapsed = useCallback(() => {
    setUserCollapsed((prev) => !prev);
  }, [setUserCollapsed]);

  const value = useMemo(
    () => ({
      userCollapsed,
      setUserCollapsed,
      toggleUserCollapsed,
      setTransientCollapsed,
      sidebarWidthPx:
        userCollapsed || transientCollapsed
          ? FEED_SIDEBAR_COLLAPSED_WIDTH_PX
          : FEED_SIDEBAR_WIDTH_PX,
    }),
    [
      userCollapsed,
      setUserCollapsed,
      toggleUserCollapsed,
      transientCollapsed,
    ],
  );

  return (
    <MainSidebarCollapseContext.Provider value={value}>
      {children}
    </MainSidebarCollapseContext.Provider>
  );
}

export function useMainSidebarCollapse() {
  const ctx = useContext(MainSidebarCollapseContext);
  if (!ctx) {
    return {
      userCollapsed: false,
      setUserCollapsed: () => {},
      toggleUserCollapsed: () => {},
      setTransientCollapsed: () => {},
      sidebarWidthPx: FEED_SIDEBAR_WIDTH_PX,
    };
  }
  return ctx;
}
