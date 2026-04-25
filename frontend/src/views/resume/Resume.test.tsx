import * as React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { Resume } from "./Resume";

describe("Resume", () => {
  it("renders experience section", () => {
    renderWithProviders(<Resume />);
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Amazon Scout")).toBeInTheDocument();
    expect(screen.getByText("Riptide Messaging")).toBeInTheDocument();
    expect(screen.getByText("Amazon.com")).toBeInTheDocument();
  });

  it("renders education section", () => {
    renderWithProviders(<Resume />);
    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText("University of California, Berkeley")).toBeInTheDocument();
  });

  it("renders external links with rel attributes", () => {
    renderWithProviders(<Resume />);
    const links = screen.getAllByRole("link").filter((l) =>
      l.getAttribute("href")!.startsWith("http")
    );
    links.forEach((link) => {
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });
});
