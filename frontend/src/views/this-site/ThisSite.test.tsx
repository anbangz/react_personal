import * as React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { ThisSite } from "./ThisSite";

describe("ThisSite", () => {
  it("renders section heading", () => {
    renderWithProviders(<ThisSite />);
    expect(screen.getByText("About this site...")).toBeInTheDocument();
  });

  it("renders GitHub repo link with rel attribute", () => {
    renderWithProviders(<ThisSite />);
    const link = screen.getByRole("link", { name: /this project's github repo/i });
    expect(link).toHaveAttribute("href", "https://github.com/anbangz/react_personal");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
