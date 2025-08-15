import { test, expect } from '@playwright/test';

test('camera functionality test', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:5173');

  // Click on the "Camera" input method
  await page.click('text=Camera');

  // Click on the "Start Camera" button
  await page.click('text=Start Camera');

  // Check if the camera view is visible and playing
  const cameraView = await page.locator('video');
  await expect(cameraView).toBeVisible();
  await expect(cameraView).toHaveJSProperty('readyState', 4); // 4 means HAVE_ENOUGH_DATA

  // Take a screenshot
  await page.screenshot({ path: 'camera-test-screenshot.png' });
});
