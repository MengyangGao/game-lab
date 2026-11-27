"""End-to-end checks for a running static Puzzle Lab instance."""
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

URL = os.environ.get("PUZZLE_LAB_URL", "http://127.0.0.1:8174/")
SCREENSHOTS = os.environ.get("PUZZLE_LAB_SCREENSHOTS")
GAMES = ["mirror", "flood", "crate", "voxel", "mosaic", "echo", "relay"]


def no_overflow(page):
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")


def screenshots(page, name, target_element=None):
    if SCREENSHOTS:
        target = Path(SCREENSHOTS)
        target.mkdir(parents=True, exist_ok=True)
        path = target / f"{name}.png"
        if target_element is None:
            page.screenshot(path=path, full_page=True)
        else:
            target_element.screenshot(path=path)


with sync_playwright() as playwright:
    browser_type = os.environ.get("PUZZLE_LAB_BROWSER", "chromium")
    browser_options = {}
    if executable := os.environ.get("PUZZLE_LAB_BROWSER_EXECUTABLE"):
        browser_options["executable_path"] = executable
    browser = getattr(playwright, browser_type).launch(**browser_options)
    desktop = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = desktop.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL)
    expect(page.locator(".card")).to_have_count(7)
    expect(page.locator(".progress-pill")).to_contain_text("0 / 63")
    no_overflow(page)
    screenshots(page, "desktop-home")

    for game in GAMES:
        page.goto(f"{URL}#{game}/1")
        expect(page.locator(".level-grid a[aria-current]")).to_have_attribute("href", f"#{game}/1")
        expect(page.locator(".level-grid a")).to_have_count(9)
        expect(page.locator(".stats")).to_contain_text("0 步")
        page.get_by_role("button", name="提示", exact=True).click()
        expect(page.locator(".feedback")).not_to_be_empty()
        page.get_by_role("button", name="标出位置").click()
        expect(page.locator(".marked").first).to_be_visible()
        page.get_by_role("button", name="执行提示").click()
        expect(page.locator(".stats")).to_contain_text("1 步")
        page.reload()
        expect(page.locator(".stats")).to_contain_text("1 步")
        page.get_by_role("button", name="撤销").click()
        expect(page.locator(".stats")).to_contain_text("0 步")
        for _ in range(16):
            if page.locator(".feedback a").count():
                break
            for text in ["提示", "标出位置", "执行提示"]:
                page.get_by_role("button", name=text, exact=True).click()
        expect(page.get_by_text("实验完成！")).to_be_visible()
        expect(page.locator(".level-grid a").first).to_have_attribute("aria-label", "1. " + page.locator("h1").inner_text() + "，已完成")
        page.get_by_role("button", name="重置").click()
        expect(page.locator(".stats")).to_contain_text("0 步")
        no_overflow(page)
        screenshots(page, f"desktop-{game}", page.locator(".workbench"))

    page.goto(f"{URL}#flood/1")
    page.locator("[data-color]").first.focus()
    page.keyboard.press("ArrowRight")
    expect(page.locator("[data-color]").nth(1)).to_be_focused()
    page.locator("#difficulty").select_option("2")
    page.get_by_role("button", name="生成新关卡").click()
    expect(page.locator("h1")).to_have_text("随机实验")
    assert "#flood/random/2/" in page.url

    page.get_by_role("button", name="设置").click()
    page.get_by_label("减少动画").check()
    page.get_by_label("显示颜色图案").uncheck()
    page.get_by_role("button", name="关闭设置").click()
    page.reload()
    expect(page.locator("html")).to_have_attribute("data-motion", "true")
    expect(page.locator("html")).to_have_attribute("data-symbols", "false")

    expect(page.locator("#offline")).to_have_text("可离线游玩")
    desktop.set_offline(True)
    page.reload()
    expect(page.locator("h1")).to_have_text("随机实验")
    page.goto(f"{URL}#echo/4")
    expect(page.locator(".walk-board")).to_be_visible()
    assert not errors, errors
    desktop.close()

    mobile = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=browser_type != "firefox")
    phone = mobile.new_page()
    phone.goto(URL)
    expect(phone.locator(".card")).to_have_count(7)
    screenshots(phone, "mobile-home")
    for width in [320, 390, 768]:
        phone.set_viewport_size({"width": width, "height": 844})
        for game in GAMES:
            phone.goto(f"{URL}#{game}/1")
            expect(phone.locator(".board-area")).to_be_visible()
            no_overflow(phone)
    phone.set_viewport_size({"width": 390, "height": 844})
    phone.goto(f"{URL}#mosaic/1")
    phone.locator("[data-piece]").first.tap()
    expect(phone.locator("[data-piece]").first).to_have_attribute("aria-pressed", "true")
    phone.get_by_role("button", name="旋转选中画片").tap()
    expect(phone.locator(".stats")).to_contain_text("1 步")
    phone.locator("[data-piece]").first.tap()
    phone.locator("[data-piece]").nth(1).tap()
    phone.locator("[data-piece]").nth(2).tap()
    expect(phone.locator(".stats")).to_contain_text("2 步")
    screenshots(phone, "mobile-mosaic")
    mobile.close()
    browser.close()
    print("PASS desktop/touch, seven games, saving, responsive widths, settings, and offline restart")
