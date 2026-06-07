"use client";

import { useEffect, useState } from "react";

export interface ChartTheme {
  accent: string;
  grid: string;
  text: string;
  card: string;
  border: string;
  foreground: string;
}

const fallback: ChartTheme = {
  accent: "#1f9b78",
  grid: "rgba(120,120,120,0.15)",
  text: "#8b938e",
  card: "#151917",
  border: "rgba(255,255,255,0.08)",
  foreground: "#eceeeb",
};

/** Reads theme CSS variables for charts and re-reads on theme (class) change. */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(fallback);

  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const get = (name: string, fb: string) => s.getPropertyValue(name).trim() || fb;
      setTheme({
        accent: get("--accent-strong", fallback.accent),
        grid: get("--border", fallback.grid),
        text: get("--txt-3", fallback.text),
        card: get("--card", fallback.card),
        border: get("--border-m", fallback.border),
        foreground: get("--foreground", fallback.foreground),
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return theme;
}
