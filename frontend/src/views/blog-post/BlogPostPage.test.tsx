import * as React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "../../test-utils";
import { BlogPostPage } from "./BlogPostPage";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";
import { createMockPost, createMockPhoto } from "../../mocks/factories";

const BlogPostRoutes = () => (
  <Routes>
    <Route path="/blog/:slug" element={<BlogPostPage />} />
  </Routes>
);

describe("BlogPostPage", () => {
  it("shows loading state initially", () => {
    renderWithProviders(<BlogPostRoutes />, {
      routerProps: { initialEntries: ["/blog/my-post"] },
    });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders post content after loading", async () => {
    server.use(
      http.get("*/posts/:slug", () => {
        return HttpResponse.json(
          createMockPost({ slug: "my-post", title: "My Post", content: "# Hello" })
        );
      })
    );

    renderWithProviders(<BlogPostRoutes />, {
      routerProps: { initialEntries: ["/blog/my-post"] },
    });

    expect(await screen.findByText("My Post")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
    expect(screen.getByText(/back to blog/i)).toBeInTheDocument();
  });

  it("shows post not found on 404", async () => {
    server.use(
      http.get("*/posts/:slug", () => {
        return new HttpResponse(
          JSON.stringify({ error: "Post not found" }),
          { status: 404 }
        );
      })
    );

    renderWithProviders(<BlogPostRoutes />, {
      routerProps: { initialEntries: ["/blog/missing"] },
    });

    expect(await screen.findByText(/post not found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to blog/i })).toBeInTheDocument();
  });

  it("renders photo gallery and opens lightbox on click", async () => {
    server.use(
      http.get("*/posts/:slug", () => {
        return HttpResponse.json(
          createMockPost({
            slug: "my-post",
            photos: [
              createMockPhoto({ src: "https://example.com/a.jpg", caption: "Photo A" }),
              createMockPhoto({ src: "https://example.com/b.jpg", caption: "Photo B" }),
            ],
          })
        );
      })
    );

    renderWithProviders(<BlogPostRoutes />, {
      routerProps: { initialEntries: ["/blog/my-post"] },
    });

    expect(await screen.findByAltText("Photo A")).toBeInTheDocument();
    expect(screen.getByAltText("Photo B")).toBeInTheDocument();

    const firstPhotoBtn = screen.getByRole("button", { name: /view photo: photo a/i });
    await userEvent.click(firstPhotoBtn);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.querySelector("img")).toHaveAttribute("alt", "Photo A");
  });
});
