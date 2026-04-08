import * as React from "react";
import ReactMarkdown from "react-markdown";
import { BlogPost } from "../../blog/types";
import "./BlogPost.css";

interface BlogPostCardProps {
  post: BlogPost;
  onPhotoClick?: () => void;
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
  if (post.type === "photo") {
    return (
      <article className="blog-post blog-post--photo">
        <div className="blog-post__meta">
          <time className="blog-post__date" dateTime={post.date}>{formatDate(post.date)}</time>
        </div>
        <h2 className="blog-post__title">{post.title}</h2>
        {post.caption && (
          <p className="blog-post__caption">{post.caption}</p>
        )}
        <button
          className="blog-post__photo-btn"
          onClick={onPhotoClick}
          aria-label={`View photo: ${post.title}`}
        >
          <img
            className="blog-post__photo"
            src={post.imageSrc}
            alt={post.caption || post.title}
          />
        </button>
        {post.content && post.content.trim() && (
          <div className="blog-post__body">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        )}
      </article>
    );
  }

  return (
    <article className="blog-post blog-post--text">
      <div className="blog-post__meta">
        <time className="blog-post__date" dateTime={post.date}>{formatDate(post.date)}</time>
      </div>
      <h2 className="blog-post__title">{post.title}</h2>
      <div className="blog-post__body">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>
    </article>
  );
};
