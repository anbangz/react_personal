import * as React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { BlogPostCard } from "./BlogPost";
import { createMockPost, createMockPhoto } from "../../mocks/factories";

describe("BlogPostCard", () => {
  it("renders title and formatted date", () => {
    renderWithProviders(
      <BlogPostCard post={createMockPost({ title: "My Title", createdAt: "2024-03-15T00:00:00Z" })} />
    );
    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.getByText("March 15, 2024")).toBeInTheDocument();
  });

  it("renders hero photo with alt and caption", () => {
    renderWithProviders(
      <BlogPostCard
        post={createMockPost({
          photos: [createMockPhoto({ caption: "Hero caption" })],
        })}
      />
    );
    const img = screen.getByAltText("Hero caption");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
    expect(screen.getByText("Hero caption")).toBeInTheDocument();
  });

  it("shows gallery hint for multiple photos", () => {
    renderWithProviders(
      <BlogPostCard
        post={createMockPost({
          photos: [
            createMockPhoto(),
            createMockPhoto({ src: "https://example.com/photo2.jpg" }),
          ],
        })}
      />
    );
    expect(screen.getByText("+1 more photo")).toBeInTheDocument();
  });

  it("shows plural gallery hint for more than 2 photos", () => {
    renderWithProviders(
      <BlogPostCard
        post={createMockPost({
          photos: [createMockPhoto(), createMockPhoto(), createMockPhoto()],
        })}
      />
    );
    expect(screen.getByText("+2 more photos")).toBeInTheDocument();
  });

  it("renders markdown content", () => {
    renderWithProviders(
      <BlogPostCard post={createMockPost({ content: "# Heading\n\nParagraph" })} />
    );
    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(screen.getByText("Paragraph")).toBeInTheDocument();
  });

  it("does not crash without photos", () => {
    renderWithProviders(
      <BlogPostCard post={createMockPost({ photos: [] })} />
    );
    expect(screen.getByText("Test Post")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view photo/i })).not.toBeInTheDocument();
  });

  it("does not crash without content", () => {
    renderWithProviders(
      <BlogPostCard post={createMockPost({ content: "" })} />
    );
    expect(screen.getByText("Test Post")).toBeInTheDocument();
    expect(document.querySelector(".blog-post__body")).not.toBeInTheDocument();
  });

  it("calls onPhotoClick with index 0 when hero photo is clicked", () => {
    const handleClick = jest.fn();
    renderWithProviders(
      <BlogPostCard
        post={createMockPost({
          photos: [createMockPhoto()],
        })}
        onPhotoClick={handleClick}
      />
    );
    const btn = screen.getByRole("button", { name: /view photo/i });
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledWith(0);
  });
});
