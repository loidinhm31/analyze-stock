import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system" | "cyber";

// Custom event name for theme changes (used by ShadowWrapper in glean-oak-app)
export const MONEY_INSIGHT_THEME_EVENT = "money-insight-theme-change";
export const MONEY_INSIGHT_THEME_STORAGE_KEY = "money-insight-theme";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark" | "cyber";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  /**
   * When true, the app is embedded in another app (e.g., glean-oak).
   * In embedded mode, theme changes are dispatched via custom events
   * instead of modifying document.documentElement directly.
   * This prevents theme conflicts between multiple embedded apps.
   */
  embedded?: boolean;
  /**
   * Custom event name dispatched when theme changes in embedded mode.
   * Parent app should listen for this event to update shadow DOM styles.
   */
  themeEventName?: string;
}

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = "cyber",
  storageKey = MONEY_INSIGHT_THEME_STORAGE_KEY,
  embedded = false,
  themeEventName = MONEY_INSIGHT_THEME_EVENT,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const savedTheme = localStorage.getItem(storageKey);
    if (
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system" ||
      savedTheme === "cyber"
    ) {
      return savedTheme;
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<
    "light" | "dark" | "cyber"
  >(() => {
    if (theme === "system") {
      return getSystemTheme();
    }
    if (theme === "cyber") {
      return "cyber";
    }
    return theme;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, theme);

    let resolved: "light" | "dark" | "cyber";
    if (theme === "system") {
      resolved = getSystemTheme();
    } else if (theme === "cyber") {
      resolved = "cyber";
    } else {
      resolved = theme;
    }
    setResolvedTheme(resolved);

    if (embedded) {
      // In embedded mode, dispatch custom event for ShadowWrapper to handle
      // This avoids modifying document.documentElement which would affect other apps
      window.dispatchEvent(
        new CustomEvent(themeEventName, {
          detail: { theme: resolved },
        }),
      );
    } else {
      // In standalone mode, apply theme to document element directly
      const root = window.document.documentElement;
      root.setAttribute("data-theme", resolved);
      root.classList.remove("light", "dark", "cyber");
      if (resolved === "light") {
        // light is default, no class needed
      } else {
        root.classList.add(resolved);
      }
    }
  }, [theme, storageKey, embedded, themeEventName]);

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light";
      setResolvedTheme(newTheme);

      if (embedded) {
        window.dispatchEvent(
          new CustomEvent(themeEventName, {
            detail: { theme: newTheme },
          }),
        );
      } else {
        const root = window.document.documentElement;
        root.setAttribute("data-theme", newTheme);
        root.classList.remove("light", "dark", "cyber");
        root.classList.add(newTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, embedded, themeEventName]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
