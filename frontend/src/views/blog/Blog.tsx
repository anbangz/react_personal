import * as React from "react";
import { Link } from "react-router-dom";
import { BlogPost } from "../../blog/types";
import { BlogFeedCard } from "../../components/blog-post/BlogPost";
import { fetchPosts } from "../../api/client";
import "./Blog.css";

const POSTS_PER_PAGE = 10;

export const Blog = () => {
  const [posts, setPosts] = React.useState<BlogPost[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPosts(page, POSTS_PER_PAGE)
      .then((result) => {
        if (!cancelled) {
          setPosts(result.posts);
          setTotal(result.total);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [page, reloadToken]);

  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  return (
    <div>
      <section className="section">
        <div className="container">
          <div className="blog-feed">
            <h1>Blog</h1>
            <hr />

            {loading && <p className="blog-feed__loading">Loading...</p>}

            {error && (
              <div className="blog-feed__error">
                <p>Failed to load posts: {error}</p>
                <button
                  className="button is-small"
                  onClick={() => setReloadToken((token) => token + 1)}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && posts.length === 0 && (
              <p className="blog-feed__empty">
                No posts yet. Check back soon.
              </p>
            )}

            {!loading &&
              !error &&
              posts.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="blog-feed__post-link"
                >
                  <BlogFeedCard post={post} />
                </Link>
              ))}

            {!loading && !error && totalPages > 1 && (
              <nav className="blog-feed__pagination" aria-label="Pagination">
                <button
                  className="button is-small"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span className="blog-feed__page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="button is-small"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
