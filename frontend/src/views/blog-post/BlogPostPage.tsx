import * as React from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { BlogPost, Photo } from "../../blog/types";
import { Lightbox } from "../../components/lightbox/Lightbox";
import { Footer } from "../footer/Footer";
import { fetchPost } from "../../api/client";
import "./BlogPostPage.css";

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

export const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = React.useState<BlogPost | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  React.useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPost(slug)
      .then((result) => {
        if (!cancelled) {
          setPost(result);
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
  }, [slug]);

  const handlePrev = React.useCallback(
    () => setLightboxIndex((i) => {
      const photos = post?.photos || [];
      return (i - 1 + photos.length) % photos.length;
    }),
    [post]
  );

  const handleNext = React.useCallback(
    () => setLightboxIndex((i) => {
      const photos = post?.photos || [];
      return (i + 1) % photos.length;
    }),
    [post]
  );

  if (loading) {
    return (
      <div>
        <section className="section">
          <div className="container">
            <div className="blog-post-page">
              <p className="blog-post-page__loading">Loading...</p>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div>
        <section className="section">
          <div className="container">
            <div className="blog-post-page">
              <p className="blog-post-page__error">
                {error || "Post not found."}
              </p>
              <Link to="/blog" className="button is-small">
                Back to Blog
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const photos: Photo[] = post.photos || [];

  return (
    <div>
      <section className="section">
        <div className="container">
          <div className="blog-post-page">
            <Link to="/blog" className="blog-post-page__back">
              &larr; Back to Blog
            </Link>

            <article>
              <time
                className="blog-post-page__date"
                dateTime={post.createdAt}
              >
                {formatDate(post.createdAt)}
              </time>
              <h1 className="blog-post-page__title">{post.title}</h1>

              {photos.length > 0 && (
                <div className="blog-post-page__gallery">
                  {photos.map((photo, idx) => (
                    <button
                      key={idx}
                      className="blog-post-page__gallery-btn"
                      onClick={() => {
                        setLightboxIndex(idx);
                        setLightboxOpen(true);
                      }}
                      aria-label={`View photo: ${photo.caption || `Photo ${idx + 1}`}`}
                    >
                      <img
                        className="blog-post-page__gallery-img"
                        src={photo.src}
                        alt={photo.caption || `Photo ${idx + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}

              {post.content && post.content.trim() && (
                <div className="blog-post-page__body">
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>
              )}
            </article>
          </div>
        </div>
      </section>

      {lightboxOpen && photos.length > 0 && (
        <Lightbox
          photos={photos}
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
