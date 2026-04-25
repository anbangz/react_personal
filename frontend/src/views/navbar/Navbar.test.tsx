import * as React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils";
import { Navbar } from "./Navbar";

describe("Navbar", () => {
  it("renders brand name", () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByText("Anbang Zhang")).toBeInTheDocument();
  });

  it("toggles burger menu on click", async () => {
    renderWithProviders(<Navbar />);
    const burger = screen.getByRole("button", { name: /open menu/i });
    const menu = document.getElementById("site-nav-menu");

    expect(menu).not.toHaveClass("is-open");
    await userEvent.click(burger);
    expect(menu).toHaveClass("is-open");
    await userEvent.click(burger);
    expect(menu).not.toHaveClass("is-open");
  });

  it("has external links with rel=noopener noreferrer", () => {
    renderWithProviders(<Navbar />);
    const externalLinks = screen.getAllByRole("link").filter((link) =>
      link.getAttribute("href")!.startsWith("http")
    );
    expect(externalLinks.length).toBeGreaterThan(0);
    externalLinks.forEach((link) => {
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  it("toggles theme when theme button is clicked", async () => {
    renderWithProviders(<Navbar />);
    const themeBtn = screen.getByRole("button", {
      name: /switch to dark mode/i,
    });
    await userEvent.click(themeBtn);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /switch to light mode/i })
      ).toBeInTheDocument();
    });
  });
});
