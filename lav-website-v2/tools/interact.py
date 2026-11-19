"""Drive the built site in Chromium and check the interactions work.

    npx vite preview                       (in another terminal)
    python -I tools/interact.py http://localhost:4173

Nothing leaves the machine: every non-localhost request is intercepted. A CV
request to Formspree is answered with a fake 200 and its JSON body is
printed, so you can see exactly what you would receive.
"""
import json
import sys

from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173"
results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  ({detail})" if detail else ""))


def wait_js(pg, expr, timeout=5000):
    """Poll a JS expression until truthy. (page.wait_for_function compiles its
    predicate with eval, which the site's CSP correctly blocks.)"""
    for _ in range(max(1, timeout // 100)):
        if pg.evaluate(expr):
            return True
        pg.wait_for_timeout(100)
    raise TimeoutError(f"timed out waiting for: {expr}")


def guarded(ctx, posts):
    def route(r):
        u = r.request.url
        if u.startswith("http://localhost"):
            return r.continue_()
        if "formspree.io" in u:
            posts.append(json.loads(r.request.post_data or "{}"))
            return r.fulfill(status=200, content_type="application/json", body='{"ok":true}')
        r.abort()
    ctx.route("**/*", route)


with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------------- desktop -------------------------------------------------
    print("desktop 1440x900")
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=URL)
    posts, errors = [], []
    guarded(ctx, posts)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(2500)

    pg.hover(".cred >> nth=0")
    pg.wait_for_timeout(400)
    tip = pg.locator("#tip")
    check("tooltip on credential hover", tip.is_visible() and "Registered Professional Engineer" in tip.inner_text(), tip.inner_text()[:60])
    pg.mouse.move(5, 500)
    pg.wait_for_timeout(300)

    pg.locator(".hero-actions .copy-btn").click()
    pg.wait_for_timeout(300)
    clip = pg.evaluate("navigator.clipboard.readText()")
    check("copy email -> clipboard + toast", clip == "laveshbabooram@gmail.com" and pg.locator(".toast.show").count() == 1, clip)

    # filters
    pg.locator("#built").scroll_into_view_if_needed()
    pg.locator('[data-filter-for="proj-grid"] [data-filter="personal"]').click()
    pg.wait_for_timeout(600)
    vis = pg.locator("#proj-grid > .proj:visible").count()
    check("project filter: Personal shows 1", vis == 1, f"{vis} visible")
    pg.locator('[data-filter-for="proj-grid"] [data-filter="all"]').click()
    pg.wait_for_timeout(600)
    check("project filter: All shows 11", pg.locator("#proj-grid > .proj:visible").count() == 11)

    # bookshelf
    pg.locator(".book >> nth=2").click()
    pg.wait_for_timeout(900)
    t = pg.locator('[data-insp="title"]').inner_text()
    href = pg.locator('[data-insp="link"]').get_attribute("href")
    check("bookshelf selects book 3", t.startswith("Real-Time Cloud Computing") and "novapublishers" in href, t[:40])
    pg.locator(".book >> nth=2").press("ArrowRight")
    pg.wait_for_timeout(900)
    check("bookshelf arrow key moves on", pg.locator('[data-insp="type"]').inner_text() == "Chapter")

    # log
    more = pg.locator("[data-log-more]")
    before = pg.locator(".log-item:visible").count()
    more.click()
    pg.wait_for_timeout(500)
    after = pg.locator(".log-item:visible").count()
    check("log 'show all' expands", after > before, f"{before} -> {after}")

    # path filter
    pg.locator('[data-filter-for="timeline"] [data-filter="study"]').click()
    pg.wait_for_timeout(500)
    check("timeline filter: Study shows 2", pg.locator("#timeline > li:visible").count() == 2)

    # CV dialog validation
    pg.locator(".nav-cv").click()
    pg.wait_for_timeout(400)
    check("CV dialog opens", pg.locator("#cv-dialog[open]").count() == 1)
    pg.locator(".cv-form [type=submit]").click()
    check("empty submit -> error", pg.locator(".form-err").is_visible() and "name" in pg.locator(".form-err").inner_text())
    pg.fill("input[name=name]", "Test Recruiter")
    pg.fill("input[name=email]", "not-an-email")
    pg.locator(".cv-form [type=submit]").click()
    check("bad email -> error", "email" in pg.locator(".form-err").inner_text().lower())
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    check("Escape closes dialog", pg.locator("#cv-dialog[open]").count() == 0)
    check("no JS errors (desktop)", not errors, "; ".join(errors[:2]))
    ctx.close()

    # ---------------- CV submit (needs an endpoint in the build) -------------
    print("CV request payload")
    ctx = b.new_context(viewport={"width": 1280, "height": 860})
    posts = []
    guarded(ctx, posts)
    pg = ctx.new_page()
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(800)
    pg.locator(".hero-actions [data-cv-open]").click()
    pg.wait_for_timeout(500)
    # Layout, not just DOM: each field sits in normal flow, stacked top to bottom
    # (a class clash once made every field absolute and piled them up unseen).
    lay = pg.evaluate("""() => [...document.querySelectorAll('#cv-dialog .field')].map(f => {
        const r = f.getBoundingClientRect(); return [getComputedStyle(f).position, Math.round(r.top), Math.round(r.height)]; })""")
    tops = [t for _, t, _ in lay]
    check("CV dialog fields laid out (in flow, stacked, visible)",
          all(p == "static" and 40 < h < 200 for p, _, h in lay) and tops[0] <= tops[2] < tops[4], lay)
    pg.fill("input[name=name]", "Test Recruiter")
    pg.fill("input[name=email]", "recruiter@example.com")
    pg.fill("input[name=organisation]", "Example Ltd")
    pg.select_option("select[name=reason]", "Hiring / recruiting")
    pg.fill("textarea[name=message]", "Role: senior network automation engineer.")
    pg.locator(".cv-form [type=submit]").click()
    pg.wait_for_timeout(800)
    done = pg.locator('[data-view="done"]').is_visible()
    title = pg.locator("[data-done-title]").inner_text() if done else ""
    if posts:
        print("    payload:", json.dumps(posts[0], indent=2).replace("\n", "\n    "))
        check("Formspree POST carries who/when/why", all(k in posts[0] for k in ("name", "email", "organisation", "reason", "requested_at", "_replyto")))
        check("success view", done and title == "Request sent", title)
    else:
        check("no endpoint configured -> mailto fallback view", done and title == "Almost there", title)
    ctx.close()

    # ---------------- honeypot -----------------------------------------------
    ctx = b.new_context(viewport={"width": 1280, "height": 860})
    posts = []
    guarded(ctx, posts)
    pg = ctx.new_page()
    pg.goto(URL, wait_until="networkidle")
    pg.locator(".hero-actions [data-cv-open]").click()
    pg.fill("input[name=name]", "Bot")
    pg.fill("input[name=email]", "bot@example.com")
    pg.evaluate("document.querySelector('input[name=_gotcha]').value = 'spam'")
    pg.locator(".cv-form [type=submit]").click()
    try:
        pg.locator('[data-view="done"]').wait_for(state="visible", timeout=3000)
    except Exception:
        pass
    pg.wait_for_timeout(300)                     # room for a (wrong) POST to show up
    check("honeypot: bot sees success, nothing sent", pg.locator('[data-view="done"]').is_visible() and not posts)
    ctx.close()

    # ---------------- mobile ----------------------------------------------------
    print("mobile 390x844")
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    guarded(ctx, [])
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(1500)
    pg.locator(".nav-toggle").tap()
    pg.wait_for_timeout(300)
    check("menu opens", pg.locator("#nav-sheet").is_visible())
    pg.locator(".sheet-link >> text=Research").tap()
    pg.wait_for_timeout(1200)
    check("menu link closes sheet and scrolls", not pg.locator("#nav-sheet").is_visible() and pg.evaluate("scrollY") > 1000)
    pg.locator(".info, .cred").first.scroll_into_view_if_needed()
    pg.locator(".cred").first.tap()
    pg.wait_for_timeout(300)
    check("tap shows tooltip on touch", pg.locator("#tip").is_visible())
    check("no JS errors (mobile)", not errors, "; ".join(errors[:2]))
    ctx.close()

    # ---------------- no JavaScript ----------------------------------------
    print("no JavaScript")
    ctx = b.new_context(viewport={"width": 1280, "height": 860}, java_script_enabled=False)
    guarded(ctx, [])
    pg = ctx.new_page()
    pg.goto(URL, wait_until="networkidle")
    op = pg.evaluate("getComputedStyle(document.querySelector('.hero-name')).opacity")
    op2 = pg.evaluate("getComputedStyle(document.querySelector('#research .book')).opacity")
    check("content visible without JS", op == "1" and op2 == "1", f"hero {op}, book {op2}")
    lab_vals = pg.evaluate("[...document.querySelectorAll('[data-kpi] [data-v]')].map(e => e.textContent)")
    check("lab: prerendered results without JS", len(lab_vals) == 4 and all(v and v != "…" for v in lab_vals), lab_vals)
    ctx.close()

    # ---------------- lab ------------------------------------------------------
    print("lab")
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    guarded(ctx, [])
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL, wait_until="networkidle")
    pg.evaluate("document.querySelector('[data-lab]').scrollIntoView({behavior: 'instant', block: 'center'})")
    wait_js(pg, "document.querySelector('[data-lab]')._lab === true", timeout=5000)
    kv = lambda: pg.evaluate("Object.fromEntries([...document.querySelectorAll('[data-kpi]')].map(e => [e.dataset.kpi, e.querySelector('[data-v]').textContent]))")
    pg.locator('[data-preset="fibre"]').click()
    wait_js(pg, "document.querySelector('[data-kpi=score] [data-v]').textContent !== '…'", timeout=15000)
    fibre = kv()
    pg.locator('[data-preset="geo"]').click()
    pg.wait_for_timeout(300)
    mid = kv()
    wait_js(pg, "document.querySelector('[data-kpi=score] [data-v]').textContent !== '…'", timeout=15000)
    geo = kv()
    check("lab: fibre beats GEO (start-up, quality, score)",
          float(fibre["startup"].split()[0]) < float(geo["startup"].split()[0]) and float(fibre["score"]) > float(geo["score"]) and fibre["quality"] == "2160p",
          f"fibre {fibre} / geo {geo}")
    check("lab: replay shows progress before the verdict", mid["score"] == "…", mid)
    s = pg.locator("#lab-rtt")
    s.focus()
    before = pg.locator('[data-val="rtt"]').inner_text()
    for _ in range(10): pg.keyboard.press("ArrowLeft")
    after = pg.locator('[data-val="rtt"]').inner_text()
    pressed = pg.evaluate("[...document.querySelectorAll('[data-preset]')].filter(c => c.getAttribute('aria-pressed') === 'true').length")
    check("lab: keyboard slider changes the value and clears the preset", before != after and pressed == 0, f"{before} -> {after}, pressed {pressed}")
    check("lab: no JS errors", not errors, "; ".join(errors[:2]))
    ctx.close()

    # ---------------- reduced motion -----------------------------------------
    print("reduced motion")
    ctx = b.new_context(viewport={"width": 1280, "height": 860}, reduced_motion="reduce")
    guarded(ctx, [])
    pg = ctx.new_page()
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(600)
    op = pg.evaluate("getComputedStyle(document.querySelector('.hero-name')).opacity")
    pic = pg.evaluate("getComputedStyle(document.querySelector('.portrait-pic')).opacity")
    check("reduced motion: content settled immediately", op == "1" and pic == "1", f"name {op}, photo {pic}")
    pg.locator('[data-preset="cell"]').scroll_into_view_if_needed()
    wait_js(pg, "document.querySelector('[data-lab]')._lab === true", timeout=5000)
    pg.locator('[data-preset="cell"]').click()
    pg.wait_for_timeout(150)
    sc = pg.locator("[data-kpi=score] [data-v]").inner_text()
    check("reduced motion: lab shows the result at once", sc not in ("…", ""), sc)
    ctx.close()

    # ---------------- time travel ------------------------------------------
    print("time travel")
    for when, expect_title, expect_chip in (
        ("2026-12-05T09:00:00+04:00", "Latest from the log", None),
        ("2026-07-20T09:00:00+04:00", "Batch 1 of the GenAI course is next", "Batch 1"),
    ):
        ctx = b.new_context(viewport={"width": 1280, "height": 860})
        guarded(ctx, [])
        pg = ctx.new_page()
        pg.clock.install(time=when)
        pg.goto(URL, wait_until="networkidle")
        pg.wait_for_timeout(300)
        title = pg.locator("#now-title").inner_text()
        chip = pg.locator(".live-chip").inner_text() if pg.locator(".live-chip").count() else None
        ok_chip = (chip is None) if expect_chip is None else (chip is not None and expect_chip in chip)
        check(f"{when[:10]}: Now title + chip recomputed in browser", title == expect_title and ok_chip, f"{title!r}, chip={chip!r}")
        ctx.close()

    b.close()

print(f"\n{sum(results)}/{len(results)} checks passed")
sys.exit(0 if all(results) else 1)
