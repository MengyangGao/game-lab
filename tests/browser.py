"""End-to-end checks for a running static Game Lab instance."""
import os
import re
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

URL = os.environ.get("GAME_LAB_URL", "http://127.0.0.1:8174/")
SCREENSHOTS = os.environ.get("GAME_LAB_SCREENSHOTS")
GAMES = ["mirror", "flood", "crate", "voxel", "mosaic", "echo", "relay", "circuit"]


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
    browser_type = os.environ.get("GAME_LAB_BROWSER", "chromium")
    browser_options = {}
    if executable := os.environ.get("GAME_LAB_BROWSER_EXECUTABLE"):
        browser_options["executable_path"] = executable
    browser = getattr(playwright, browser_type).launch(**browser_options)
    desktop = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = desktop.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL)
    expect(page.locator(".card")).to_have_count(8)
    expect(page.locator(".progress-pill")).to_contain_text("0 / 72")
    no_overflow(page)
    assert page.locator(".hero-image").evaluate("(image) => image.complete && image.naturalWidth > 0")
    page.get_by_role("link", name="浏览全部玩法").click()
    expect(page.locator("#collection")).to_be_focused()
    page.evaluate("window.scrollTo(0,0)")
    screenshots(page, "desktop-home")

    for game in GAMES:
        page.goto(f"{URL}#{game}/1")
        expect(page.locator(".level-grid a[aria-current]")).to_have_attribute("href", f"#{game}/1")
        expect(page.locator(".level-grid a")).to_have_count(9)
        expect(page.locator(".stats")).to_contain_text("0 步")
        screenshots(page, f"desktop-{game}", page.locator(".workbench"))
        if game == "mirror":
            expect(page.locator(".beam.fired")).to_be_visible()
            expect(page.locator(".stats")).to_contain_text("0 步")
        page.get_by_role("button", name="玩法提示", exact=True).click()
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
            if page.locator(".clear-overlay").count():
                break
            for text in ["玩法提示", "标出位置", "执行提示"]:
                page.get_by_role("button", name=text, exact=True).click()
        expect(page.get_by_text("挑战成功", exact=True)).to_be_visible()
        expect(page.locator(".level-grid a").first).to_have_attribute("aria-label", re.compile(r"1\..*，已完成"))
        page.get_by_role("button", name="重置").click()
        expect(page.locator(".stats")).to_contain_text("0 步")
        no_overflow(page)

    page.goto(f"{URL}#circuit/1")
    cell = page.locator("[data-relay]").first
    cell.click()
    expect(cell).to_have_attribute("aria-pressed", "true")
    expect(page.locator(".circuit-inventory strong").first).to_have_text("2")
    cell.click()
    expect(cell).to_have_attribute("aria-pressed", "false")
    expect(page.locator(".circuit-inventory strong").first).to_have_text("3")

    page.goto(f"{URL}#mosaic/2")
    source = page.locator("[data-piece='0']")
    target = page.locator("[data-piece='1']")
    source.drag_to(target)
    expect(page.locator(".stats")).to_contain_text("1 步")
    expect(page.locator(".drag-ghost")).to_have_count(0)

    page.goto(f"{URL}#crate/1")
    page.locator("[data-floor='12']").click()
    expect(page.locator("[data-token='player-token']")).to_have_attribute("data-position", "12")

    page.goto(f"{URL}#echo/1")
    for moves in (1, 2, 3):
        page.get_by_role("button", name="等待", exact=True).click()
        expect(page.locator(".stats")).to_contain_text(f"{moves} 步")
    expect(page.locator(".feedback")).to_contain_text("触碰了黑暗")
    page.get_by_role("button", name="撤销").click()
    expect(page.locator(".feedback")).not_to_contain_text("触碰了黑暗")

    page.goto(f"{URL}#voxel/1")
    position = page.locator(".isometric [data-voxel='0']").get_attribute("transform")
    page.get_by_role("button", name="旋转模型视角").click()
    expect(page.locator(".isometric [data-voxel='0']")).not_to_have_attribute("transform", position)
    expect(page.locator(".stats")).to_contain_text("0 步")

    page.goto(f"{URL}#flood/1")
    page.locator("[data-color]").first.focus()
    page.keyboard.press("ArrowRight")
    expect(page.locator("[data-color]").nth(1)).to_be_focused()
    page.locator(".pigment [data-cell='4']").click()
    expect(page.locator(".feedback")).to_contain_text("请先")
    expect(page.locator(".stats")).to_contain_text("0 步")
    selected = page.locator(".pigment [data-cell='4']").get_attribute("class")
    new_color = next(i for i in range(3) if f"c{i}" not in selected)
    page.locator(f"[data-color='{new_color}']").click()
    expect(page.locator(f"[data-color='{new_color}']")).to_have_attribute("aria-pressed", "true")
    page.locator(".pigment [data-cell='4']").click()
    expect(page.locator(".stats")).to_contain_text("1 步")
    expect(page.locator(".pigment [data-cell='4']")).to_have_class(re.compile(f"c{new_color}"))
    page.locator("#difficulty").select_option("2")
    page.get_by_role("button", name="生成关卡").click()
    expect(page.locator("h1")).to_contain_text("随机关卡")
    assert "#flood/random/2/" in page.url

    page.get_by_role("button", name="设置").click()
    page.get_by_label("减少动态效果").check()
    page.get_by_label("显示颜色辅助图案").uncheck()
    page.get_by_role("button", name="关闭设置").click()
    page.reload()
    expect(page.locator("html")).to_have_attribute("data-motion", "true")
    expect(page.locator("html")).to_have_attribute("data-symbols", "false")

    expect(page.locator("#offline")).to_have_text("可离线游玩")
    desktop.set_offline(True)
    page.reload()
    expect(page.locator("h1")).to_contain_text("随机关卡")
    page.goto(f"{URL}#echo/4")
    expect(page.locator(".walk-board")).to_be_visible()
    assert not errors, errors
    desktop.close()

    mobile = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=browser_type != "firefox")
    phone = mobile.new_page()
    phone.goto(URL)
    expect(phone.locator(".card")).to_have_count(8)
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
    phone.wait_for_timeout(450)
    screenshots(phone, "mobile-mosaic")
    if browser_type == "chromium":
        phone.goto(f"{URL}#mosaic/2")
        picture = phone.locator(".picture")
        picture.scroll_into_view_if_needed()
        points = [phone.locator(f"[data-piece='{i}']").bounding_box() for i in (0, 1)]
        start, end = [(p["x"] + p["width"] / 2, p["y"] + p["height"] / 2) for p in points]
        cdp = mobile.new_cdp_session(phone)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": start[0], "y": start[1]}]})
        for fraction in (.33, .66, 1):
            x = start[0] + fraction * (end[0] - start[0])
            y = start[1] + fraction * (end[1] - start[1])
            cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y}]})
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        expect(phone.locator(".stats")).to_contain_text("1 步")
    for game in ["mirror", "mosaic"]:
        phone.goto(f"{URL}#{game}/2")
        for _ in range(16):
            if phone.locator(".clear-overlay").count():
                break
            for text in ["玩法提示", "标出位置", "执行提示"]:
                phone.get_by_role("button", name=text, exact=True).click()
        expect(phone.get_by_text("挑战成功", exact=True)).to_be_visible()
        no_overflow(phone)
    mobile.close()
    browser.close()
    print("PASS desktop/touch, drag, paint, movement, model rotation, eight games, saving, layout, and offline restart")
