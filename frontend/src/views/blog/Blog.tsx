import * as React from "react";
import { Link } from "react-router-dom";
import { BlogPost, Photo } from "../../blog/types";
import { BlogPostCard } from "../../components/blog-post/BlogPost";
import { Lightbox } from "../../components/lightbox/Lightbox";
import { Footer } from "../footer/Footer";
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

  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxPhotos, setLightboxPhotos] = React.useState<Photo[]>([]);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

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

  const handlePhotoClick = React.useCallback(
    (post: BlogPost, photoIndex: number) => {
      if (post.photos && post.photos.length > 0) {
        setLightboxPhotos(post.photos);
        setLightboxIndex(photoIndex);
        setLightboxOpen(true);
      }
    },
    []
  );

  const handlePrev = React.useCallback(
    () => setLightboxIndex((i) => (i - 1 + lightboxPhotos.length) % lightboxPhotos.length),
    [lightboxPhotos.length]
  );

  const handleNext = React.useCallback(
    () => setLightboxIndex((i) => (i + 1) % lightboxPhotos.length),
    [lightboxPhotos.length]
  );

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
                <div key={post.slug}>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="blog-feed__post-link"
                  >
                    <h2 className="blog-post__title">{post.title}</h2>
                  </Link>
                  <BlogPostCard
                    post={post}
                    onPhotoClick={(idx) => handlePhotoClick(post, idx)}
                  />
                </div>
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

      {lightboxOpen && lightboxPhotos.length > 0 && (
        <Lightbox
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}

      <Footer />
    </div>
  );
};
