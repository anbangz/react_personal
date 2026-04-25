import { BlogPost, Photo } from "../blog/types";

export const createMockPost = (overrides?: Partial<BlogPost>): BlogPost => ({
  id: "1",
  slug: "test-post",
  title: "Test Post",
  content: "Hello world",
  photos: [],
  published: true,
  createdAt: "2024-01-15T00:00:00Z",
  updatedAt: "2024-01-15T00:00:00Z",
  ...overrides,
});

export const createMockPhoto = (overrides?: Partial<Photo>): Photo => ({
  src: "https://example.com/photo.jpg",
  caption: "A photo",
  order: 0,
  ...overrides,
});
