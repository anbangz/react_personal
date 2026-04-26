import { BlogPost, PaginatedPostsResponse } from "../blog/types";
import { StatusSnapshot } from "../status/types";

function getApiBaseUrl(): string {
  const hostname = window.location.hostname;
  if (hostname === "anbangz.me" || hostname === "www.anbangz.me") {
    return "https://api.anbangz.me";
  }
  if (hostname === "dev.anbangz.me") {
    return "https://dev-api.anbangz.me";
  }
  // Local development
  return "http://localhost:8081";
}

const API_BASE = getApiBaseUrl();

async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${response.status}`);
  }
  return response.json();
}

export async function fetchPosts(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedPostsResponse> {
  return fetchJSON<PaginatedPostsResponse>(
    `/posts?page=${page}&limit=${limit}`
  );
}

export async function fetchPost(slug: string): Promise<BlogPost> {
  return fetchJSON<BlogPost>(`/posts/${slug}`);
}

export async function fetchStatus(): Promise<StatusSnapshot> {
  return fetchJSON<StatusSnapshot>("/status");
}
