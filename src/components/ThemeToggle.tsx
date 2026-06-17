"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const themeEvent = "cadmiones-theme-change";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("cadmiones-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getThemeSnapshot(): Theme {
  if (typeof window === "undefined") return "light";
  if (document.documentElement.classList.contains("dark")) return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  return getInitialTheme();
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(themeEvent, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(themeEvent, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => "light");

  function chooseTheme(nextTheme: Theme) {
    applyTheme(nextTheme);
    window.localStorage.setItem("cadmiones-theme", nextTheme);
    window.dispatchEvent(new Event(themeEvent));
  }

  return (
    <div className="ml-auto inline-flex rounded-md border border-zinc-300 bg-zinc-100 p-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-950">
      <button
        type="button"
        aria-pressed={theme === "light"}
        onClick={() => chooseTheme("light")}
        className={`rounded px-2 py-1 font-medium transition ${
          theme === "light"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        }`}
      >
        Claro
      </button>
      <button
        type="button"
        aria-pressed={theme === "dark"}
        onClick={() => chooseTheme("dark")}
        className={`rounded px-2 py-1 font-medium transition ${
          theme === "dark"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        }`}
      >
        Oscuro
      </button>
    </div>
  );
}
