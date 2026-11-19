import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';
import { site } from './src/data/site.js';
import { renderHead, renderBody, BOOT_SCRIPT } from './src/render/page.js';

/* Prerender: the whole page is rendered from src/data/site.js at build time
   (and on every dev request), so the shipped HTML is complete without JS. */
function prerender() {
  return {
    name: 'lav-prerender',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const now = new Date();
        return html
          .replace('<!--head-->', renderHead(site))
          .replace('<!--body-->', renderBody(site, now));
      },
    },
  };
}

/* Content-Security-Policy, production build only (Vite's dev server injects
   inline scripts that a strict policy would block). The one inline script,
   the boot flag in <head>, is allowed by its hash, not by 'unsafe-inline'. */
function csp() {
  const hash = createHash('sha256').update(BOOT_SCRIPT).digest('base64');
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'sha256-${hash}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://formspree.io",
    "form-action 'self' https://formspree.io",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
  return {
    name: 'lav-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="utf-8">',
        `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${policy}">`);
    },
  };
}

export default defineConfig({
  plugins: [prerender(), csp()],
  server: { port: 3000 },
  preview: { port: 4173 },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
  },
});
