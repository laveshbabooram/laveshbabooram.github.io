# lav-website v2

Personal site of Lavesh Babooram. Static, prerendered, about 0.5 MB on first load.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # -> dist/
npm test           # date logic behind the "Now" section
```

## Updating content

All content lives in **`src/data/site.js`**: profile, projects, books, papers, timeline, toolkit, news. Nothing is hard-coded in the views. Edit, rebuild, push.

- **News / log:** add an entry to `updates` with a `date` (`'2026-11-21'`, `'2026-11'` or `'2026'`), a `tag` and the `text`. Order doesn't matter; it's sorted.
- **Course batches:** add to `course.batches` with the session days, e.g. `sessions: ['2027-02-06', '2027-02-13', '2027-02-20']`, or just `['2027-02']` while the days aren't fixed. Status (upcoming, running now, completed), the "Now" headline, the live chip in the nav and the log entries are all **worked out from the dates in Mauritius time**. That happens at build time and again in the visitor's browser, so nothing goes stale if you don't rebuild.
- **Books / papers:** a book with `cover: null` gets a typeset cover drawn in CSS, and its "Read on" button stays hidden while `link` is empty. Papers take an optional `tags` list.
- **Images:** originals go through `npm run images` (`tools/optimize_images.py`), which resizes them to the size they're displayed at and writes AVIF + WebP to `public/img/`. Add new ones to `JOBS` in that script.

## CV requests (no PDF is published)

"Request CV" opens a form: name, email, organisation, reason and an optional message. A hidden honeypot field catches bots.

**To get notified, set up Formspree once (free tier, about 5 minutes):**

1. Sign up at formspree.io with the address you want notifications sent to.
2. Create a form and copy its endpoint, e.g. `https://formspree.io/f/abcdwxyz`.
3. Put it in `src/data/site.js` → `cvRequest.endpoint`, then rebuild and deploy.
4. In the form settings, add `laveshbabooram.github.io` as an allowed domain.

Each request then arrives as an email with reply-to set to the requester, so you just hit Reply and attach the CV. Formspree also keeps every submission in its dashboard. Fields you receive:

| field | example |
|---|---|
| name, email, organisation | Jane Doe, jane@company.com, Company Ltd |
| reason | Hiring / recruiting |
| message | (free text) |
| requested_at | Tue, 17 Nov 2026, 22:39 (Mauritius time) |
| visitor_timezone | Europe/London |
| page | https://laveshbabooram.github.io/ |

The endpoint isn't a secret (it's a public form URL). The Content-Security-Policy only allows the page to post to `formspree.io`. Until the endpoint is set, the button falls back to opening a pre-filled email to you.

## Deploying (switching GitHub Pages from v1 to v2)

The existing workflow builds the repo root. To deploy v2 instead, change `.github/workflows/deploy.yml`:

```yaml
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: lav-website-v2/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: lav-website-v2

      - name: Build site
        run: npm run build
        working-directory: lav-website-v2
      # ...
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './lav-website-v2/dist'
```

## How it's built

- **Prerendered:** `vite.config.js` renders the whole page from `site.js` at build time (`src/render/page.js`), so the HTML is complete for search engines, link previews and visitors without JavaScript. The browser JS only refreshes the date-dependent parts, wires the interactions and plays the motion.
- **Style:** lav-ui tokens, components and motion rules (one easing curve, about 8 px rises, damped staggers, reduced motion honoured), with the accent switched to the site's cyan. Fonts are self-hosted, so there are no Google Fonts requests.
- **Glyphs** (`src/js/glyphs.js`, `field.js`, `portrait.js`):
  - Headings decode out of glyphs without shifting the layout.
  - A glyph "signal field" runs behind the hero: carrier waves, packets, and ripples that follow the pointer.
  - The portrait arrives as glyphs, and a glyph lens follows the cursor (a tap on phones).
  - All of it pauses off-screen and becomes static for reduced motion.
- **Accessible:**
  - Semantic landmarks, a skip link and keyboard support everywhere (including the bookshelf arrows).
  - Tooltips work on hover, focus and tap.
  - The CV form is a native `<dialog>` and closes with Escape.
- **Security:** strict CSP in the built page (scripts from self plus one hashed inline boot line; requests only to self and Formspree). No secrets anywhere.

## Checks

```bash
npm run build && npx vite preview                       # serve dist on :4173
python -I tools/shot.py http://localhost:4173 --vp 1440x900 --vp 390x844
python -I tools/interact.py http://localhost:4173       # 24 browser checks (Formspree is mocked: nothing is sent)
python -I tools/brand.py http://localhost:4173          # favicons + og.jpg
```

`shot.py` reports JS errors, any request leaving localhost, and horizontal overflow. `interact.py` drives the site: tooltips, copy, filters, bookshelf, log, CV form validation and payload, honeypot, mobile menu, no-JS, reduced motion, and "time travel" to other dates. Requires `pip install playwright && python -m playwright install chromium`.
