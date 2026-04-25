import * as React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("renders copyright with current year", () => {
    renderWithProviders(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© 2020–${currentYear} Anbang Zhang`)).toBeInTheDocument();
  });

  it("renders link to GitHub repo", () => {
    renderWithProviders(<Footer />);
    const link = screen.getByRole("link", { name: /github repo/i });
    expect(link).toHaveAttribute("href", "https://github.com/anbangz/react_personal");
  });
});
