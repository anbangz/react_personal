import { test, expect } from '@playwright/test';

test.describe('Lightbox', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
    // Wait for blog feed to be visible
    await expect(page.locator('.blog-feed')).toBeVisible();
  });

  test('lightbox is hidden on page load', async ({ page }) => {
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('opens lightbox when a photo post is clicked', async ({ page }) => {
    const photoButton = page.getByRole('button', { name: /View photo:/ }).first();
    await photoButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('lightbox shows the clicked photo', async ({ page }) => {
    const photoButton = page.getByRole('button', { name: /View photo: Rome/ });
    await photoButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.lightbox__image')).toBeVisible();
  });

  test('Escape key closes the lightbox', async ({ page }) => {
    await page.getByRole('button', { name: /View photo:/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('close button closes the lightbox', async ({ page }) => {
    await page.getByRole('button', { name: /View photo:/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('ArrowRight navigates to next photo', async ({ page }) => {
    // Open first photo
    await page.getByRole('button', { name: /View photo:/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const initialCounter = await page.locator('.lightbox__counter').textContent();
    await page.keyboard.press('ArrowRight');
    const newCounter = await page.locator('.lightbox__counter').textContent();

    // Counter should have changed (either advanced or wrapped)
    expect(newCounter).not.toBe(initialCounter);
  });

  test('ArrowLeft navigates to previous photo', async ({ page }) => {
    await page.getByRole('button', { name: /View photo:/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const initialCounter = await page.locator('.lightbox__counter').textContent();
    await page.keyboard.press('ArrowLeft');
    const newCounter = await page.locator('.lightbox__counter').textContent();

    expect(newCounter).not.toBe(initialCounter);
  });

  test('clicking backdrop closes the lightbox', async ({ page }) => {
    await page.getByRole('button', { name: /View photo:/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click the lightbox backdrop (the dialog element itself, outside of content)
    const dialog = page.getByRole('dialog');
    const box = await dialog.boundingBox();
    if (box) {
      // Click top-left corner (backdrop area, outside the centered content)
      await page.mouse.click(box.x + 10, box.y + 10);
    }
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
