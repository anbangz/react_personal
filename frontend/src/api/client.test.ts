import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";
import { fetchPosts, fetchPost } from "./client";
import { createMockPost } from "../mocks/factories";

describe("fetchPosts", () => {
  it("returns parsed posts on success", async () => {
    server.use(
      http.get("*/posts", () => {
        return HttpResponse.json({
          posts: [createMockPost({ title: "Hello World" })],
          total: 1,
          page: 1,
          limit: 10,
        });
      })
    );

    const result = await fetchPosts(1, 10);
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe("Hello World");
    expect(result.total).toBe(1);
  });

  it("throws with error message on 500", async () => {
    server.use(
      http.get("*/posts", () => {
        return new HttpResponse(
          JSON.stringify({ error: "Server error" }),
          { status: 500 }
        );
      })
    );

    await expect(fetchPosts()).rejects.toThrow("Server error");
  });

  it("throws generic message on non-JSON error", async () => {
    server.use(
      http.get("*/posts", () => {
        return new HttpResponse("Bad Request", { status: 400 });
      })
    );

    await expect(fetchPosts()).rejects.toThrow("API error: 400");
  });

  it("constructs correct query string for pagination", async () => {
    let capturedUrl: URL | null = null;
    server.use(
      http.get("*/posts", ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          posts: [],
          total: 0,
          page: 2,
          limit: 5,
        });
      })
    );

    await fetchPosts(2, 5);
    expect(capturedUrl).not.toBeNull();
    expect(capturedUrl!.searchParams.get("page")).toBe("2");
    expect(capturedUrl!.searchParams.get("limit")).toBe("5");
  });
});

describe("fetchPost", () => {
  it("returns a single post on success", async () => {
    server.use(
      http.get("*/posts/:slug", () => {
        return HttpResponse.json(createMockPost({ slug: "my-post", title: "My Post" }));
      })
    );

    const result = await fetchPost("my-post");
    expect(result.slug).toBe("my-post");
    expect(result.title).toBe("My Post");
  });

  it("throws on 404", async () => {
    server.use(
      http.get("*/posts/:slug", () => {
        return new HttpResponse(
          JSON.stringify({ error: "Not found" }),
          { status: 404 }
        );
      })
    );

    await expect(fetchPost("missing")).rejects.toThrow("Not found");
  });
});
