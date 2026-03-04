import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../Navbar';

const renderNavbar = () =>
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

describe('Navbar', () => {
  describe('initial state', () => {
    it('renders the site name link', () => {
      renderNavbar();
      expect(screen.getByText('Anbang Zhang')).toBeInTheDocument();
    });

    it('burger button starts collapsed (aria-expanded=false)', () => {
      renderNavbar();
      const burger = screen.getByRole('button', { name: 'menu' });
      expect(burger).toHaveAttribute('aria-expanded', 'false');
    });

    it('burger button does not have is-active class initially', () => {
      renderNavbar();
      const burger = screen.getByRole('button', { name: 'menu' });
      expect(burger).not.toHaveClass('is-active');
    });

    it('navbar menu does not have is-active class initially', () => {
      const { container } = renderNavbar();
      const menu = container.querySelector('.navbar-menu');
      expect(menu).not.toHaveClass('is-active');
    });
  });

  describe('hamburger toggle', () => {
    it('adds is-active to burger and menu on first click', async () => {
      const user = userEvent.setup();
      const { container } = renderNavbar();
      const burger = screen.getByRole('button', { name: 'menu' });

      await user.click(burger);

      expect(burger).toHaveClass('is-active');
      expect(container.querySelector('.navbar-menu')).toHaveClass('is-active');
    });

    it('sets aria-expanded to true when menu is open', async () => {
      const user = userEvent.setup();
      renderNavbar();
      const burger = screen.getByRole('button', { name: 'menu' });

      await user.click(burger);

      expect(burger).toHaveAttribute('aria-expanded', 'true');
    });

    it('collapses menu on second click', async () => {
      const user = userEvent.setup();
      const { container } = renderNavbar();
      const burger = screen.getByRole('button', { name: 'menu' });

      await user.click(burger);
      await user.click(burger);

      expect(burger).not.toHaveClass('is-active');
      expect(container.querySelector('.navbar-menu')).not.toHaveClass('is-active');
      expect(burger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('navigation links', () => {
    it('renders a link to the Blog page', () => {
      renderNavbar();
      expect(screen.getByRole('link', { name: 'Blog' })).toBeInTheDocument();
    });

    it('renders hash-anchor links for in-page sections', () => {
      renderNavbar();
      expect(screen.getByRole('link', { name: 'This Site' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Résumé' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Roadmap' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Contact Me' })).toBeInTheDocument();
    });

    it('renders social media links', () => {
      renderNavbar();
      const links = screen.getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).toContain('https://www.instagram.com/anbangz/');
      expect(hrefs).toContain('https://github.com/anbangz');
      expect(hrefs).toContain('https://www.linkedin.com/in/anbang-zhang-1141b18b/');
    });
  });
});
