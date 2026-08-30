import { defineConfig, loadEnv, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
// @ts-ignore The build helper intentionally remains a plain Node ESM module.
import { createSeoBuildPlugin, resolveSeoBuildConfig } from './scripts/seo-build.mjs';

function resolveViteConfig(mode: string) {
  const env = {
    ...loadEnv(mode, process.cwd(), ''),
    ...process.env,
  };
  const { release, siteOrigin } = resolveSeoBuildConfig(env);

  return {
    plugins: [react(), svgr(), createSeoBuildPlugin({ release, siteOrigin })],
    define: {
      __INFOPEDIA_SITE_ORIGIN__: JSON.stringify(siteOrigin),
      __INFOPEDIA_SEO_RELEASE__: JSON.stringify(release),
    },
    build: {
      manifest: true,
    },
    server: {
      port: 5173,
      host: true,
    },
  };
}

const config = defineConfig(({ mode }) => resolveViteConfig(mode));

// Vitest's mergeConfig cannot consume a callback. Resolve the same callback
// once when Vitest imports this shared config while leaving Vite's normal
// callback form intact for mode-aware production/preview builds.
const configForVitest = process.argv.some((argument) => argument.toLowerCase().includes('vitest'))
  ? config({ command: 'serve', mode: 'test', isSsrBuild: false, isPreview: false })
  : config;

// Vitest's mergeConfig API accepts a resolved UserConfig object type while
// Vite itself evaluates callback configs at build time. Keep the callback
// runtime shape and expose the compatible static type to the shared config.
export default configForVitest as UserConfig;
