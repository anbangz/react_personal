import * as React from "react";
import { BlogPost } from "../../blog/types";
import "./Lightbox.css";

interface LightboxProps {
  photos: BlogPost[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Lightbox: React.FunctionComponent<LightboxProps> = ({
  photos,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}) => {
  const photo = photos[currentIndex];

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onPrev, onNext]);

  if (!photo) return null;

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo lightbox" onClick={onClose}>
      <button className="lightbox__close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close">
        ✕
      </button>

      {photos.length > 1 && (
        <button
          className="lightbox__arrow lightbox__arrow--prev"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous photo"
        >
          ‹
        </button>
      )}

      <div className="lightbox__content" onClick={(e) => e.stopPropagation()}>
        <img
          className="lightbox__image"
          src={photo.imageSrc}
          alt={photo.caption || photo.title}
        />
        {photo.caption && (
          <p className="lightbox__caption">{photo.caption}</p>
        )}
      </div>

      {photos.length > 1 && (
        <button
          className="lightbox__arrow lightbox__arrow--next"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next photo"
        >
          ›
        </button>
      )}

      <div className="lightbox__counter">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
};
