import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('homepage loads and shows main sections', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Anbang/i);
    // Navbar brand link is visible
    await expect(page.getByText('Anbang Zhang').first()).toBeVisible();
  });

  test('blog page loads and shows Blog heading', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible();
  });

  test('blog page renders at least one post', async ({ page }) => {
    await page.goto('/blog');
    // At least one article element
    const articles = page.locator('article');
    await expect(articles.first()).toBeVisible();
  });

  test('clicking Blog nav link navigates to /blog', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Blog' }).click();
    await expect(page).toHaveURL(/\/blog/);
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible();
  });

  test('social links have correct href attributes', async ({ page }) => {
    await page.goto('/');
    const instagramLink = page.locator('a[href*="instagram.com"]');
    await expect(instagramLink).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(instagramLink).toHaveAttribute('target', '_blank');

    const githubLink = page.locator('a[href="https://github.com/anbangz"]');
    await expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('mobile hamburger menu opens on click', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const burger = page.getByRole('button', { name: 'menu' });
    await expect(burger).toHaveAttribute('aria-expanded', 'false');

    await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
  });
});
