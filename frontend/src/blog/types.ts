export interface Photo {
  src: string;
  caption?: string;
  order: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  content: string;
  photos: Photo[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPostsResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
}
