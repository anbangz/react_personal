import * as React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils";
import { Blog } from "./Blog";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";
import { createMockPost } from "../../mocks/factories";

describe("Blog", () => {
  it("shows loading state initially", () => {
    renderWithProviders(<Blog />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders posts after loading", async () => {
    server.use(
      http.get("*/posts", () => {
        return HttpResponse.json({
          posts: [createMockPost({ title: "First Post" })],
          total: 1,
          page: 1,
          limit: 10,
        });
      })
    );

    renderWithProviders(<Blog />);
    expect(await screen.findAllByText("First Post")).toHaveLength(2);
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it("shows error message on fetch failure", async () => {
    server.use(
      http.get("*/posts", () => {
        return new HttpResponse(
          JSON.stringify({ error: "Network down" }),
          { status: 500 }
        );
      })
    );

    renderWithProviders(<Blog />);
    expect(await screen.findByText(/failed to load posts/i)).toBeInTheDocument();
    expect(screen.getByText(/network down/i)).toBeInTheDocument();
  });

  it("retry button re-fetches posts", async () => {
    let requestCount = 0;
    server.use(
      http.get("*/posts", () => {
        requestCount++;
        if (requestCount === 1) {
          return new HttpResponse(JSON.stringify({ error: "Fail" }), { status: 500 });
        }
        return HttpResponse.json({
          posts: [createMockPost({ title: "Recovered" })],
          total: 1,
          page: 1,
          limit: 10,
        });
      })
    );

    renderWithProviders(<Blog />);
    expect(await screen.findByText(/failed to load posts/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    await userEvent.click(retryBtn);

    expect(await screen.findAllByText("Recovered")).toHaveLength(2);
  });

  it("shows empty message when no posts", async () => {
    server.use(
      http.get("*/posts", () => {
        return HttpResponse.json({
          posts: [],
          total: 0,
          page: 1,
          limit: 10,
        });
      })
    );

    renderWithProviders(<Blog />);
    expect(await screen.findByText(/no posts yet/i)).toBeInTheDocument();
  });

  it("paginates to next and previous pages", async () => {
    server.use(
      http.get("*/posts", ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get("page");
        if (page === "2") {
          return HttpResponse.json({
            posts: [createMockPost({ title: "Page 2 Post" })],
            total: 11,
            page: 2,
            limit: 10,
          });
        }
        return HttpResponse.json({
          posts: [createMockPost({ title: "Page 1 Post" })],
          total: 11,
          page: 1,
          limit: 10,
        });
      })
    );

    renderWithProviders(<Blog />);
    expect(await screen.findAllByText("Page 1 Post")).toHaveLength(2);

    const nextBtn = screen.getByRole("button", { name: /next/i });
    await userEvent.click(nextBtn);

    expect(await screen.findAllByText("Page 2 Post")).toHaveLength(2);
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();

    const prevBtn = screen.getByRole("button", { name: /previous/i });
    await userEvent.click(prevBtn);

    expect(await screen.findAllByText("Page 1 Post")).toHaveLength(2);
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
  });

  it("disables previous on first page and next on last page", async () => {
    server.use(
      http.get("*/posts", () => {
        return HttpResponse.json({
          posts: [createMockPost()],
          total: 1,
          page: 1,
          limit: 10,
        });
      })
    );

    renderWithProviders(<Blog />);
    expect(await screen.findAllByText("Test Post")).toHaveLength(2);

    const prevBtn = screen.getByRole("button", { name: /previous/i });
    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeDisabled();
  });
});
