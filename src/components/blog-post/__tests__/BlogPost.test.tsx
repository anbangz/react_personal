import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlogPostCard } from '../BlogPost';
import { BlogPost } from '../../../blog/types';

const textPost: BlogPost = {
  id: 'test-text',
  title: 'Test Article',
  date: '2024-01-15',
  type: 'text',
  content: '## Hello World\n\nThis is content.',
};

const photoPost: BlogPost = {
  id: 'test-photo',
  title: 'Test Photo',
  date: '2020-06-10',
  type: 'photo',
  content: '',
  imageSrc: 'test-image.jpg',
  caption: 'A beautiful view',
};

describe('BlogPostCard', () => {
  describe('formatDate', () => {
    it('formats ISO date to "Month Day, Year"', () => {
      render(<BlogPostCard post={textPost} />);
      expect(screen.getByText('January 15, 2024')).toBeInTheDocument();
    });

    it('formats a different date correctly', () => {
      render(<BlogPostCard post={photoPost} />);
      expect(screen.getByText('June 10, 2020')).toBeInTheDocument();
    });

    it('sets dateTime attribute to the raw ISO date string', () => {
      const { container } = render(<BlogPostCard post={textPost} />);
      const time = container.querySelector('time');
      expect(time?.getAttribute('dateTime')).toBe('2024-01-15');
    });
  });

  describe('text post', () => {
    it('renders the post title as a heading', () => {
      render(<BlogPostCard post={textPost} />);
      expect(screen.getByRole('heading', { name: 'Test Article' })).toBeInTheDocument();
    });

    it('renders the markdown body', () => {
      render(<BlogPostCard post={textPost} />);
      expect(screen.getByTestId('markdown')).toBeInTheDocument();
    });

    it('does not render a photo button', () => {
      render(<BlogPostCard post={textPost} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('does not render an img element', () => {
      render(<BlogPostCard post={textPost} />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('photo post', () => {
    it('renders the post title as a heading', () => {
      render(<BlogPostCard post={photoPost} />);
      expect(screen.getByRole('heading', { name: 'Test Photo' })).toBeInTheDocument();
    });

    it('renders a photo button with accessible label', () => {
      render(<BlogPostCard post={photoPost} />);
      expect(screen.getByRole('button', { name: 'View photo: Test Photo' })).toBeInTheDocument();
    });

    it('renders the image with caption as alt text', () => {
      render(<BlogPostCard post={photoPost} />);
      expect(screen.getByRole('img', { name: 'A beautiful view' })).toBeInTheDocument();
    });

    it('renders the caption paragraph', () => {
      render(<BlogPostCard post={photoPost} />);
      expect(screen.getByText('A beautiful view')).toBeInTheDocument();
    });

    it('calls onPhotoClick when the photo button is clicked', async () => {
      const user = userEvent.setup();
      const onPhotoClick = jest.fn();
      render(<BlogPostCard post={photoPost} onPhotoClick={onPhotoClick} />);
      await user.click(screen.getByRole('button', { name: 'View photo: Test Photo' }));
      expect(onPhotoClick).toHaveBeenCalledTimes(1);
    });

    it('uses post title as alt text when caption is absent', () => {
      const noCaption: BlogPost = { ...photoPost, caption: undefined };
      render(<BlogPostCard post={noCaption} />);
      expect(screen.getByRole('img', { name: 'Test Photo' })).toBeInTheDocument();
    });

    it('does not render caption paragraph when caption is absent', () => {
      const noCaption: BlogPost = { ...photoPost, caption: undefined };
      render(<BlogPostCard post={noCaption} />);
      expect(screen.queryByText('A beautiful view')).not.toBeInTheDocument();
    });

    it('does not render markdown body when content is empty', () => {
      render(<BlogPostCard post={photoPost} />);
      expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
    });

    it('renders markdown body when photo post has non-empty content', () => {
      const photoWithContent: BlogPost = { ...photoPost, content: 'Some caption text' };
      render(<BlogPostCard post={photoWithContent} />);
      expect(screen.getByTestId('markdown')).toBeInTheDocument();
    });
  });
});
