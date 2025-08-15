from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto("http://localhost:5173/")
    page.screenshot(path="jules-scratch/verification/compact_ui_verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
