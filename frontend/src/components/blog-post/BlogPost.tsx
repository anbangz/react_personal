import * as React from "react";
import { BlogPost } from "../../blog/types";
import "./BlogPost.css";

interface BlogFeedCardProps {
  post: BlogPost;
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

const truncateContent = (content: string, maxLen: number): string => {
  const runes = Array.from(content);
  if (runes.length <= maxLen) {
    return content;
  }
  return runes.slice(0, maxLen).join("") + "...";
};

const markdownToSummaryText = (content: string): string => {
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(?:#{1,6}|>|-|\*|\+|\d+\.)\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/`+/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

export const BlogFeedCard: React.FunctionComponent<BlogFeedCardProps> = ({ post }) => {
  const coverPhoto = post.photos?.[0];
  const normalizedSummary = post.summary?.trim();
  const summary =
    normalizedSummary || truncateContent(markdownToSummaryText(post.content || ""), 160);

  return (
    <article className="blog-feed-card">
      {coverPhoto && (
        <div className="blog-feed-card__image-wrapper">
          <img
            className="blog-feed-card__image"
            src={coverPhoto.src}
            alt={coverPhoto.caption || post.title}
          />
        </div>
      )}
      <div className="blog-feed-card__text">
        <h2 className="blog-feed-card__title">{post.title}</h2>
        {summary && <p className="blog-feed-card__summary">{summary}</p>}
        <time className="blog-feed-card__date" dateTime={post.createdAt}>
          {formatDate(post.createdAt)}
        </time>
      </div>
    </article>
  );
};
