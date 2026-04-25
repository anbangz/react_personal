import * as React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test-utils";
import { TrelloBoard } from "./TrelloBoard";

describe("TrelloBoard", () => {
  it("renders the board link", () => {
    renderWithProviders(<TrelloBoard boardUrl="https://trello.com/b/123" />);
    const link = screen.getByRole("link", { name: /trello board/i });
    expect(link).toHaveAttribute("href", "https://trello.com/b/123");
  });

  it("injects trello embed script on mount", () => {
    renderWithProviders(<TrelloBoard boardUrl="https://trello.com/b/123" />);
    const scripts = Array.from(document.querySelectorAll("script"));
    const trelloScript = scripts.find((s) =>
      s.src.includes("p.trellocdn.com/embed.min.js")
    );
    expect(trelloScript).toBeDefined();
  });

  it("removes trello embed script on unmount", () => {
    const { unmount } = renderWithProviders(
      <TrelloBoard boardUrl="https://trello.com/b/123" />
    );
    unmount();
    const scripts = Array.from(document.querySelectorAll("script"));
    const trelloScript = scripts.find((s) =>
      s.src.includes("p.trellocdn.com/embed.min.js")
    );
    expect(trelloScript).toBeUndefined();
  });
});
