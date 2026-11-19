"""Screenshot the site and report what is wrong with it (adapted from lav-ui).

    npm run build && npx vite preview        (in another terminal)
    python -I tools/shot.py http://localhost:4173 --vp 1440x900 --vp 390x844

Scrolls the whole page first so every scroll-triggered entrance has played,
then takes a full-page shot. Requests to anything but localhost are blocked
and listed. Reports JS errors and any element wider than the viewport.
Screenshots go to shots/ (git-ignored).
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

OVERFLOW = """() => {
  const W = document.documentElement.clientWidth, bad = [];
  document.querySelectorAll('body *').forEach((n) => {
    const r = n.getBoundingClientRect();
    if (r.width && r.right > W + 1 && getComputedStyle(n).position !== 'fixed' && !n.closest('.shelf')) {
      bad.push(n.tagName.toLowerCase() + '.' + ((n.getAttribute('class') || '').split(' ')[0]) + ' +' + Math.round(r.right - W) + 'px');
    }
  });
  return { bad: bad.slice(0, 8), scrollW: document.documentElement.scrollWidth, W };
}"""

SCROLL = """async () => {
  const step = innerHeight * 0.6;
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
    scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 160));
  }
  scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); await new Promise(r => setTimeout(r, 400));
  scrollTo({ top: 0, behavior: 'instant' }); await new Promise(r => setTimeout(r, 400));
}"""


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    url, vps, wait, tag, reduced = args[0], [], 2600, "", False
    i = 1
    while i < len(args):
        if args[i] == "--vp":
            i += 1; vps.append(args[i])
        elif args[i] == "--wait":
            i += 1; wait = int(args[i])
        elif args[i] == "--tag":
            i += 1; tag = "_" + args[i]
        elif args[i] == "--reduced":
            reduced = True
        i += 1
    vps = vps or ["1440x900"]
    out = pathlib.Path.cwd() / "shots"
    out.mkdir(exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for vp in vps:
            w, h = (int(x) for x in vp.split("x"))
            ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1,
                                      reduced_motion="reduce" if reduced else "no-preference",
                                      has_touch=w < 700, is_mobile=w < 700)
            page = ctx.new_page()
            errors, net = [], []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))

            def guard(route):
                u = route.request.url
                if u.startswith("http://localhost") or u.startswith("http://127.0.0.1") or u.startswith("data:"):
                    route.continue_()
                else:
                    net.append(u)
                    route.abort()
            page.route("**/*", guard)

            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(wait)
            top = out / f"top_{w}x{h}{tag}.png"
            page.screenshot(path=str(top))
            page.evaluate(SCROLL)
            page.wait_for_timeout(900)
            full = out / f"full_{w}x{h}{tag}.png"
            page.screenshot(path=str(full), full_page=True)
            spill = page.evaluate(OVERFLOW)
            ctx.close()

            print(f"{vp:>10}  -> {top.name}, {full.name}")
            print(f"            js errors : {len(errors)}" + (f"  {errors[:3]}" if errors else ""))
            print(f"            external  : {len(net)}" + (f"  {net[:3]}" if net else ""))
            print(f"            overflow  : {spill}")
        browser.close()


if __name__ == "__main__":
    main()
