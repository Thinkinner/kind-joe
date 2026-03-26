"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type SignalsColorMode = "dark" | "light";

const STORAGE_KEY = "kj_signals_color_mode";

type SignalsColorModeContextValue = {
  mode: SignalsColorMode;
  setMode: (m: SignalsColorMode) => void;
  toggle: () => void;
};

const SignalsColorModeContext =
  createContext<SignalsColorModeContextValue | null>(null);

export function SignalsColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<SignalsColorMode>("dark");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        setModeState(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setMode = useCallback((m: SignalsColorMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <SignalsColorModeContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </SignalsColorModeContext.Provider>
  );
}

export function useSignalsColorMode() {
  const ctx = useContext(SignalsColorModeContext);
  if (!ctx) {
    throw new Error(
      "useSignalsColorMode must be used within SignalsColorModeProvider",
    );
  }
  return ctx;
}
