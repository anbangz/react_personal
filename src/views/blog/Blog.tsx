import * as React from "react";
import { blogPosts } from "../../blog/posts";
import { BlogPost } from "../../blog/types";
import { BlogPostCard } from "../../components/blog-post/BlogPost";
import { Lightbox } from "../../components/lightbox/Lightbox";
import { Footer } from "../footer/Footer";
import "./Blog.css";

export const Blog = () => {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  const photoPosts: BlogPost[] = React.useMemo(
    () => blogPosts.filter((p) => p.type === "photo" && p.imageSrc),
    []
  );

  const handlePhotoClick = React.useCallback((post: BlogPost) => {
    const idx = photoPosts.findIndex((p) => p.id === post.id);
    if (idx !== -1) {
      setLightboxIndex(idx);
      setLightboxOpen(true);
    }
  }, [photoPosts]);

  const handlePrev = React.useCallback(
    () => setLightboxIndex((i) => (i - 1 + photoPosts.length) % photoPosts.length),
    [photoPosts.length]
  );

  const handleNext = React.useCallback(
    () => setLightboxIndex((i) => (i + 1) % photoPosts.length),
    [photoPosts.length]
  );

  return (
    <div>
      <section className="section">
        <div className="container">
          <div className="blog-feed">
            <h1>Blog</h1>
            <hr />
            {blogPosts.length === 0 ? (
              <p className="blog-feed__empty">No posts yet. Check back soon.</p>
            ) : (
              blogPosts.map((post) => (
                <BlogPostCard
                  key={post.id}
                  post={post}
                  onPhotoClick={() => handlePhotoClick(post)}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {lightboxOpen && photoPosts.length > 0 && (
        <Lightbox
          photos={photoPosts}
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
