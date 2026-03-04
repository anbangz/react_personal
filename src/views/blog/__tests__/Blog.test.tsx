import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Blog } from '../Blog';

// Must inline data inside the factory — jest.mock is hoisted before variable declarations
jest.mock('../../../blog/posts', () => ({
  blogPosts: [
    { id: 'text-1', title: 'First Article', date: '2024-03-01', type: 'text', content: 'Content A' },
    { id: 'photo-1', title: 'Rome', date: '2024-02-01', type: 'photo', content: '', imageSrc: 'rome.jpg', caption: 'The Colosseum' },
    { id: 'photo-2', title: 'Paris', date: '2024-01-01', type: 'photo', content: '', imageSrc: 'paris.jpg', caption: 'Eiffel Tower' },
    { id: 'text-2', title: 'Second Article', date: '2024-04-01', type: 'text', content: 'Content B' },
  ],
}));

// Footer calls new Date().getFullYear() — stub for stable test output
beforeEach(() => {
  jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Blog', () => {
  describe('post listing', () => {
    it('renders the Blog heading', () => {
      render(<Blog />);
      expect(screen.getByRole('heading', { name: 'Blog' })).toBeInTheDocument();
    });

    it('renders all posts', () => {
      render(<Blog />);
      expect(screen.getByRole('heading', { name: 'First Article' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Second Article' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Rome' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Paris' })).toBeInTheDocument();
    });

    it('renders photo buttons for photo posts', () => {
      render(<Blog />);
      expect(screen.getByRole('button', { name: 'View photo: Rome' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View photo: Paris' })).toBeInTheDocument();
    });

    it('renders exactly one button per photo post (no extra buttons)', () => {
      render(<Blog />);
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });
  });

  describe('lightbox', () => {
    it('lightbox is not visible on initial render', () => {
      render(<Blog />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens lightbox when a photo post button is clicked', async () => {
      const user = userEvent.setup();
      render(<Blog />);
      await user.click(screen.getByRole('button', { name: 'View photo: Rome' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('displays the clicked photo in the lightbox', async () => {
      const user = userEvent.setup();
      render(<Blog />);
      await user.click(screen.getByRole('button', { name: 'View photo: Rome' }));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByRole('img', { name: 'The Colosseum' })).toBeInTheDocument();
    });

    it('closes lightbox when the close button is clicked', async () => {
      const user = userEvent.setup();
      render(<Blog />);
      await user.click(screen.getByRole('button', { name: 'View photo: Rome' }));
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows the correct photo when clicking the second photo post', async () => {
      const user = userEvent.setup();
      render(<Blog />);
      await user.click(screen.getByRole('button', { name: 'View photo: Paris' }));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByRole('img', { name: 'Eiffel Tower' })).toBeInTheDocument();
    });
  });

  describe('carousel navigation (modulo wrapping)', () => {
    it('navigates forward and wraps last → first', async () => {
      const user = userEvent.setup();
      render(<Blog />);

      // photoPosts filtered: [Rome(0), Paris(1)]
      // Open Paris (index 1 = last)
      await user.click(screen.getByRole('button', { name: 'View photo: Paris' }));
      expect(screen.getByText('2 / 2')).toBeInTheDocument();

      // Next from index 1 → wraps to index 0 (Rome)
      await user.click(screen.getByRole('button', { name: 'Next photo' }));
      expect(within(screen.getByRole('dialog')).getByRole('img', { name: 'The Colosseum' })).toBeInTheDocument();
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it('navigates backward and wraps first → last', async () => {
      const user = userEvent.setup();
      render(<Blog />);

      // Open Rome (index 0 = first)
      await user.click(screen.getByRole('button', { name: 'View photo: Rome' }));
      expect(screen.getByText('1 / 2')).toBeInTheDocument();

      // Prev from index 0 → wraps to index 1 (Paris)
      await user.click(screen.getByRole('button', { name: 'Previous photo' }));
      expect(within(screen.getByRole('dialog')).getByRole('img', { name: 'Eiffel Tower' })).toBeInTheDocument();
      expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });

    it('advances forward without wrapping (first → second)', async () => {
      const user = userEvent.setup();
      render(<Blog />);

      await user.click(screen.getByRole('button', { name: 'View photo: Rome' }));
      await user.click(screen.getByRole('button', { name: 'Next photo' }));
      expect(within(screen.getByRole('dialog')).getByRole('img', { name: 'Eiffel Tower' })).toBeInTheDocument();
    });
  });
});
