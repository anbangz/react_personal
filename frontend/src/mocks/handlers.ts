import { http, HttpResponse } from "msw";
import { createMockPost } from "./factories";

export const handlers = [
  http.get("*/posts", ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    return HttpResponse.json({
      posts: [createMockPost()],
      total: 1,
      page,
      limit,
    });
  }),

  http.get("*/posts/:slug", ({ params }) => {
    const { slug } = params;
    if (slug === "not-found") {
      return new HttpResponse(JSON.stringify({ error: "Post not found" }), {
        status: 404,
      });
    }
    return HttpResponse.json(createMockPost({ slug: slug as string }));
  }),
];
