import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
    const root = document.documentElement;
    if (theme === "dark") {
        root.classList.add("dark");
    } else if (theme === "light") {
        root.classList.remove("dark");
    } else {
        // system
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", prefersDark);
    }
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem("calovie-theme") as Theme | null) ?? "system";
    });

    useEffect(() => {
        applyTheme(theme);

        if (theme === "system") {
            const mq = window.matchMedia("(prefers-color-scheme: dark)");
            const handler = (e: MediaQueryListEvent) =>
                document.documentElement.classList.toggle("dark", e.matches);
            mq.addEventListener("change", handler);
            return () => mq.removeEventListener("change", handler);
        }
    }, [theme]);

    const setTheme = (t: Theme) => {
        localStorage.setItem("calovie-theme", t);
        setThemeState(t);
    };

    return { theme, setTheme };
}
