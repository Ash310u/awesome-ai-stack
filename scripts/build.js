#!/usr/bin/env node

import * as esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'cli.js');

await esbuild.build({
  entryPoints: [path.join(ROOT, 'src', 'cli.js')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: OUT,
  packages: 'external',
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
  },
  jsx: 'automatic',
});

await fs.chmod(OUT, 0o755);
console.log('Built', path.relative(ROOT, OUT));
