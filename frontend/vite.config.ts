import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// This GitHub checkout runs as a Node web service on Render. The Sites checkout
// keeps its own Cloudflare/Sites bindings in its separate Vite configuration.
export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext()],
});
