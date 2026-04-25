import * as React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { BlogFeedCard } from "./BlogPost";
import { createMockPost, createMockPhoto } from "../../mocks/factories";

describe("BlogFeedCard", () => {
  it("renders title and formatted date", () => {
    renderWithProviders(
      <BlogFeedCard post={createMockPost({ title: "My Title", createdAt: "2024-03-15T00:00:00Z" })} />
    );
    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.getByText("March 15, 2024")).toBeInTheDocument();
  });

  it("renders cover photo with alt", () => {
    renderWithProviders(
      <BlogFeedCard
        post={createMockPost({
          photos: [createMockPhoto({ caption: "Cover caption" })],
        })}
      />
    );
    const img = screen.getByAltText("Cover caption");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("renders summary when provided", () => {
    renderWithProviders(
      <BlogFeedCard post={createMockPost({ summary: "Custom summary text" })} />
    );
    expect(screen.getByText("Custom summary text")).toBeInTheDocument();
  });

  it("falls back to truncated content when no summary", () => {
    renderWithProviders(
      <BlogFeedCard post={createMockPost({ content: "Hello world", summary: "" })} />
    );
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("does not crash without photos", () => {
    renderWithProviders(
      <BlogFeedCard post={createMockPost({ photos: [] })} />
    );
    expect(screen.getByText("Test Post")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("does not crash without content", () => {
    renderWithProviders(
      <BlogFeedCard post={createMockPost({ content: "" })} />
    );
    expect(screen.getByText("Test Post")).toBeInTheDocument();
  });
});
