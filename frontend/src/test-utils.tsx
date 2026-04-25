import * as React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MemoryRouter, MemoryRouterProps } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  routerProps?: MemoryRouterProps;
}

function AllTheProviders({
  children,
  routerProps,
}: {
  children: React.ReactNode;
  routerProps?: MemoryRouterProps;
}) {
  return (
    <ThemeProvider>
      <MemoryRouter {...routerProps}>{children}</MemoryRouter>
    </ThemeProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { routerProps, ...renderOptions } = options;
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders routerProps={routerProps}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  });
}
