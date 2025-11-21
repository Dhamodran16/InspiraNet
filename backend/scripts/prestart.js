#!/usr/bin/env node
/**
 * Ensures the dev server port is free before starting locally.
 * In managed environments like Render/production the platform
 * handles port binding, so we skip running kill-port there.
 */

const port = process.env.PORT || 5000;
const isManagedEnv = process.env.RENDER || process.env.CI || process.env.NODE_ENV === 'production';

if (isManagedEnv) {
  console.log(`[prestart] Skipping kill-port for managed environment (PORT=${port})`);
  process.exit(0);
}

let killPort;
try {
  killPort = require('kill-port');
} catch (err) {
  console.warn('[prestart] kill-port package not found. Skipping port cleanup.');
  process.exit(0);
}

killPort(port, 'tcp')
  .then(() => {
    console.log(`[prestart] Freed port ${port}`);
    process.exit(0);
  })
  .catch((err) => {
    console.warn(`[prestart] kill-port not available or failed (${err?.message || err}). Continuing...`);
    process.exit(0);
  });

