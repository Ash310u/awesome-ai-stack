#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageSchema } from '../src/schemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Recursively collect JSON file paths under a directory.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectJsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsonFiles(fullPath)));
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * @param {string} filePath
 * @param {import('zod').ZodSchema} schema
 */
async function validateFile(filePath, schema) {
  const relative = path.relative(ROOT, filePath);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    schema.parse(data);
    console.log(`✅ ${relative}`);
    return true;
  } catch (err) {
    console.log(`❌ ${relative}`);
    if (err instanceof Error) {
      console.log(`   ${err.message}`);
    }
    return false;
  }
}

async function main() {
  const packageFiles = await collectJsonFiles(path.join(ROOT, 'packages'));

  let failed = 0;

  console.log('Validating packages…');
  for (const file of packageFiles) {
    if (!(await validateFile(file, packageSchema))) failed += 1;
  }

  if (failed > 0) {
    console.log(`\n${failed} validation error(s)`);
    process.exit(1);
  }

  console.log('\nAll registry files are valid.');
}

main();
