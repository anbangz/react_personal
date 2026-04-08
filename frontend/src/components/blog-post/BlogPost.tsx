import * as React from "react";
import ReactMarkdown from "react-markdown";
import { BlogPost, Photo } from "../../blog/types";
import "./BlogPost.css";

interface BlogPostCardProps {
  post: BlogPost;
  onPhotoClick?: (photoIndex: number) => void;
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

export const BlogPostCard: React.FunctionComponent<BlogPostCardProps> = ({
  post,
  onPhotoClick,
}) => {
  const heroPhoto: Photo | undefined = post.photos?.[0];
  const hasPhotos = post.photos && post.photos.length > 0;

  return (
    <article className="blog-post">
      <div className="blog-post__meta">
        <time className="blog-post__date" dateTime={post.createdAt}>
          {formatDate(post.createdAt)}
        </time>
      </div>
      <h2 className="blog-post__title">{post.title}</h2>

      {heroPhoto && (
        <button
          className="blog-post__photo-btn"
          onClick={() => onPhotoClick?.(0)}
          aria-label={`View photo: ${heroPhoto.caption || post.title}`}
        >
          <img
            className="blog-post__photo"
            src={heroPhoto.src}
            alt={heroPhoto.caption || post.title}
          />
        </button>
      )}

      {heroPhoto?.caption && (
        <p className="blog-post__caption">{heroPhoto.caption}</p>
      )}

      {hasPhotos && post.photos.length > 1 && (
        <div className="blog-post__gallery-hint">
          +{post.photos.length - 1} more photo{post.photos.length > 2 ? "s" : ""}
        </div>
      )}

      {post.content && post.content.trim() && (
        <div className="blog-post__body">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      )}
    </article>
  );
};
