import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Lightbox } from '../Lightbox';
import { BlogPost } from '../../../blog/types';

const makePhoto = (id: string, title: string, caption?: string): BlogPost => ({
  id,
  title,
  date: '2024-01-01',
  type: 'photo',
  content: '',
  imageSrc: `${id}.jpg`,
  caption,
});

const singlePhoto = [makePhoto('p1', 'Eiffel Tower', 'Paris at dusk')];
const multiPhotos = [
  makePhoto('p1', 'Eiffel Tower', 'Paris at dusk'),
  makePhoto('p2', 'Colosseum', 'Rome'),
  makePhoto('p3', 'Sagrada Família'),
];

const defaultProps = {
  photos: singlePhoto,
  currentIndex: 0,
  onClose: jest.fn(),
  onPrev: jest.fn(),
  onNext: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Lightbox', () => {
  describe('null guard', () => {
    it('renders nothing when photos array is empty', () => {
      const { container } = render(<Lightbox {...defaultProps} photos={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when currentIndex is out of bounds', () => {
      const { container } = render(<Lightbox {...defaultProps} currentIndex={5} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('single photo', () => {
    it('renders the lightbox dialog', () => {
      render(<Lightbox {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders the current photo', () => {
      render(<Lightbox {...defaultProps} />);
      expect(screen.getByRole('img', { name: 'Paris at dusk' })).toBeInTheDocument();
    });

    it('renders the caption', () => {
      render(<Lightbox {...defaultProps} />);
      expect(screen.getByText('Paris at dusk')).toBeInTheDocument();
    });

    it('does not render prev/next buttons when there is only one photo', () => {
      render(<Lightbox {...defaultProps} />);
      expect(screen.queryByRole('button', { name: 'Previous photo' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Next photo' })).not.toBeInTheDocument();
    });

    it('shows counter as "1 / 1"', () => {
      render(<Lightbox {...defaultProps} />);
      expect(screen.getByText('1 / 1')).toBeInTheDocument();
    });
  });

  describe('multiple photos', () => {
    const multiProps = { ...defaultProps, photos: multiPhotos, currentIndex: 1 };

    it('renders the photo at the current index', () => {
      render(<Lightbox {...multiProps} />);
      expect(screen.getByRole('img', { name: 'Rome' })).toBeInTheDocument();
    });

    it('renders prev and next buttons', () => {
      render(<Lightbox {...multiProps} />);
      expect(screen.getByRole('button', { name: 'Previous photo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next photo' })).toBeInTheDocument();
    });

    it('shows correct counter', () => {
      render(<Lightbox {...multiProps} />);
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('uses post title as alt text when caption is absent', () => {
      render(<Lightbox {...multiProps} currentIndex={2} />);
      expect(screen.getByRole('img', { name: 'Sagrada Família' })).toBeInTheDocument();
    });
  });

  describe('close behaviour', () => {
    it('calls onClose when the close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<Lightbox {...defaultProps} onClose={onClose} />);
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<Lightbox {...defaultProps} onClose={onClose} />);
      await user.click(screen.getByRole('dialog'));
      expect(onClose).toHaveBeenCalled();
    });

    it('does NOT call onClose when clicking inside the content area', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<Lightbox {...defaultProps} onClose={onClose} />);
      // Click the image — it is inside lightbox__content which stopPropagation()
      await user.click(screen.getByRole('img', { name: 'Paris at dusk' }));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    it('calls onClose on Escape key', () => {
      const onClose = jest.fn();
      render(<Lightbox {...defaultProps} onClose={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onPrev on ArrowLeft key', () => {
      const onPrev = jest.fn();
      render(<Lightbox {...defaultProps} onPrev={onPrev} />);
      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      expect(onPrev).toHaveBeenCalledTimes(1);
    });

    it('calls onNext on ArrowRight key', () => {
      const onNext = jest.fn();
      render(<Lightbox {...defaultProps} onNext={onNext} />);
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('does not respond to unrelated keys', () => {
      const onClose = jest.fn();
      const onPrev = jest.fn();
      const onNext = jest.fn();
      render(<Lightbox {...defaultProps} onClose={onClose} onPrev={onPrev} onNext={onNext} />);
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(onClose).not.toHaveBeenCalled();
      expect(onPrev).not.toHaveBeenCalled();
      expect(onNext).not.toHaveBeenCalled();
    });
  });

  describe('prev/next button clicks', () => {
    const multiProps = { ...defaultProps, photos: multiPhotos, currentIndex: 1 };

    it('calls onPrev when Previous button is clicked', async () => {
      const user = userEvent.setup();
      const onPrev = jest.fn();
      render(<Lightbox {...multiProps} onPrev={onPrev} />);
      await user.click(screen.getByRole('button', { name: 'Previous photo' }));
      expect(onPrev).toHaveBeenCalledTimes(1);
    });

    it('calls onNext when Next button is clicked', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      render(<Lightbox {...multiProps} onNext={onNext} />);
      await user.click(screen.getByRole('button', { name: 'Next photo' }));
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when Previous button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<Lightbox {...multiProps} onClose={onClose} />);
      await user.click(screen.getByRole('button', { name: 'Previous photo' }));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('effect cleanup', () => {
    it('removes the keydown listener when unmounted', () => {
      const addSpy = jest.spyOn(document, 'addEventListener');
      const removeSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = render(<Lightbox {...defaultProps} />);
      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      unmount();
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
