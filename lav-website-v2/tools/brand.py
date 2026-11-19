"""Render the PNG favicons from public/favicon.svg and the 1200x630 social
preview (public/og.jpg) from the built site's hero.

    npm run build && npx vite preview        (in another terminal)
    python -I tools/brand.py http://localhost:4173
"""
import io
import pathlib
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent.parent
PUB = HERE / "public"


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173"
    svg = (PUB / "favicon.svg").read_text(encoding="utf-8")
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # Favicons: render the SVG large once, downscale with Lanczos.
        page = browser.new_page(viewport={"width": 512, "height": 512})
        sized = svg.replace("<svg ", '<svg width="512" height="512" ', 1)
        page.set_content("<html><body style='margin:0;background:transparent'>"
                         f"<div style='width:512px;height:512px'>{sized}</div></body></html>")
        png = page.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": 512, "height": 512})
        page.close()
        big = Image.open(io.BytesIO(png)).convert("RGBA")
        big.resize((32, 32), Image.LANCZOS).save(PUB / "favicon-32.png", optimize=True)
        big.resize((180, 180), Image.LANCZOS).save(PUB / "apple-touch-icon.png", optimize=True)

        # Social preview: the real hero, after its entrance has settled.
        page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        page.goto(url, wait_until="networkidle")
        page.add_style_tag(content=".nav,.scroll-cue,.stats{display:none!important}"
                                   ".hero{min-height:630px!important;padding-top:40px!important;padding-bottom:40px!important}")
        page.wait_for_timeout(4200)
        shot = page.screenshot(clip={"x": 0, "y": 0, "width": 1200, "height": 630})
        page.close()
        Image.open(io.BytesIO(shot)).convert("RGB").save(PUB / "og.jpg", quality=84, optimize=True, progressive=True)
        browser.close()
    for n in ("favicon-32.png", "apple-touch-icon.png", "og.jpg"):
        print(f"{n:22} {(PUB / n).stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
