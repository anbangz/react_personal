import * as React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { useTheme } from "./ThemeContext";

function TestComponent() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    delete (document.documentElement as HTMLHtmlElement).dataset.theme;
  });

  it("defaults to light theme when no preference is stored", () => {
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("reads theme from localStorage on mount", () => {
    localStorage.setItem("theme", "dark");
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("toggles theme and persists to localStorage", () => {
    renderWithProviders(<TestComponent />);
    const button = screen.getByRole("button", { name: /toggle/i });

    fireEvent.click(button);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    fireEvent.click(button);
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("updates document.documentElement dataset", () => {
    renderWithProviders(<TestComponent />);
    const button = screen.getByRole("button", { name: /toggle/i });

    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe("dark");

    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("respects prefers-color-scheme: dark when no localStorage value", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });
});
