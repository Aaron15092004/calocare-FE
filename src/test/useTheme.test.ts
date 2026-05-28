import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "@/hooks/useTheme";

// localStorage mock is provided by jsdom; matchMedia mock is in setup.ts

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("useTheme", () => {
  it('defaults to "system" when no preference is stored', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");
  });

  it('reads stored theme from localStorage on mount', () => {
    localStorage.setItem("calocare-theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it('setTheme("dark") adds "dark" class to documentElement', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it('setTheme("light") removes "dark" class from documentElement', () => {
    document.documentElement.classList.add("dark");
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("light"));

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists chosen theme to localStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));

    expect(localStorage.getItem("calocare-theme")).toBe("dark");
  });

  it('setTheme("system") respects system preference (mock returns false → no dark class)', () => {
    document.documentElement.classList.add("dark");
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("system"));

    // matchMedia mock in setup.ts returns matches: false → dark removed
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("cycles through all three themes without errors", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("dark"));
    expect(result.current.theme).toBe("dark");

    act(() => result.current.setTheme("light"));
    expect(result.current.theme).toBe("light");

    act(() => result.current.setTheme("system"));
    expect(result.current.theme).toBe("system");
  });
});
