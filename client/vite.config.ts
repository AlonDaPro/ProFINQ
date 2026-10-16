/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const DEV_SERVER_PORT = 5173;
const DEFAULT_API_PROXY_TARGET = 'http://localhost:4000';
const RANDOM_USER_ORIGIN = 'https://randomuser.me';

/**
 * Adds a Content-Security-Policy to the production build only: Vite's dev server
 * injects inline styles and an HMR socket that a strict policy would block.
 * (`frame-ancestors` cannot be set from a <meta> tag; the host should send it as a header.)
 */
function contentSecurityPolicy(apiBaseUrl: string): Plugin {
  const apiOrigin = URL.canParse(apiBaseUrl) ? new URL(apiBaseUrl).origin : '';
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "font-src 'self'",
    `img-src 'self' ${RANDOM_USER_ORIGIN}`,
    `connect-src 'self' ${RANDOM_USER_ORIGIN} ${apiOrigin}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // `||` rather than `??`: an empty API_PROXY_TARGET= line in .env should also fall back.
  const apiProxyTarget = env.API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET;

  return {
    plugins: [vue(), tailwindcss(), contentSecurityPolicy(env.VITE_API_BASE_URL || '')],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: DEV_SERVER_PORT,
      strictPort: true,
      // Same-origin /api in development (and `vite preview`), so the browser never needs CORS locally.
      proxy: { '/api': { target: apiProxyTarget, changeOrigin: true } },
    },
    test: {
      environment: 'jsdom',
      include: ['test/**/*.test.ts'],
    },
  };
});
