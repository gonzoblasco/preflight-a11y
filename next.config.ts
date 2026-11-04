import type { NextConfig } from 'next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  // The parent workspace has its own lockfile, so Next would otherwise treat
  // the whole workspace as the root and trace half of it into the bundle.
  outputFileTracingRoot: here,
  // Playwright and the browser binaries must stay outside the server bundle.
  serverExternalPackages: ['playwright', 'playwright-core', 'axe-core', '@axe-core/playwright', 'jsdom'],
  experimental: {
    // The scanner is CPU-bound; keeping the route body limit generous lets a
    // batch endpoint exist later without a rewrite.
    serverActions: { bodySizeLimit: '1mb' },
  },
};

export default config;
