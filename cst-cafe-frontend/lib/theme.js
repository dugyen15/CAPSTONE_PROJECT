// Small theme helper — reads/writes the user's light/dark preference to
// localStorage and toggles the "dark" class on <html>. Purely a client-side
// UI preference for now; nothing to wire up on a backend.

const STORAGE_KEY = "cst-cafe-theme";

export function getStoredTheme() {
  if (typeof window === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    // localStorage can be unavailable (private browsing, etc.) — the theme
    // still applies for this page load, it just won't persist.
  }
}