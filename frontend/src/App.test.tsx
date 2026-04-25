import * as React from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { AppContent } from "./App";

describe("App routing", () => {
  it("renders homepage on /", () => {
    renderWithProviders(<AppContent />, {
      routerProps: { initialEntries: ["/"] },
    });
    expect(screen.getByText("Hi! I'm Anbang.")).toBeInTheDocument();
  });

  it("renders blog page on /blog", () => {
    renderWithProviders(<AppContent />, {
      routerProps: { initialEntries: ["/blog"] },
    });
    expect(screen.getByRole("heading", { name: "Blog" })).toBeInTheDocument();
  });

  it("renders blog post page on /blog/:slug", () => {
    renderWithProviders(<AppContent />, {
      routerProps: { initialEntries: ["/blog/test-post"] },
    });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("scrolls to hash target on homepage", async () => {
    const scrollIntoView = jest.fn();
    const mockElement = { scrollIntoView } as unknown as HTMLElement;
    jest.spyOn(document, "getElementById").mockReturnValue(mockElement);

    renderWithProviders(<AppContent />, {
      routerProps: { initialEntries: ["/#resume"] },
    });

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });

    jest.restoreAllMocks();
  });
});
