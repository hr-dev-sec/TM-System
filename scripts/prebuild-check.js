import fs from 'node:fs';
import path from 'node:path';
import { transformSync } from 'esbuild';

const TARGET_DIRS = ['src', 'api'];
const TARGET_FILES = ['server.ts'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

let totalFilesChecked = 0;
let errorsFound = 0;

/**
 * Scan a directory recursively for relevant source files
 */
function getSourceFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        results.push(...getSourceFiles(fullPath));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * Check for corrupted or non-printable binary characters
 */
function checkForCorruptedCharacters(content, filePath) {
  const issues = [];
  const lines = content.split(/\r?\n/);

  // Look for zlib compression header 'x\x9c'
  if (content.includes('x\x9c')) {
    issues.push({
      line: 1,
      column: 1,
      message: 'Detected compressed binary data marker (zlib "x\\x9c"). File contains raw compressed binary chunks instead of plain text.'
    });
  }

  // Look for Unicode replacement character which signifies corrupted encoding
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (line.includes('\uFFFD')) {
      issues.push({
        line: lineIdx + 1,
        column: line.indexOf('\uFFFD') + 1,
        message: 'Detected Unicode replacement character (\\uFFFD) indicating corrupted text encoding.'
      });
      break;
    }

    // Check for null bytes or control characters (excluding tab \t, newline \n, CR \r)
    // eslint-disable-next-line no-control-regex
    const controlCharMatch = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.exec(line);
    if (controlCharMatch) {
      issues.push({
        line: lineIdx + 1,
        column: controlCharMatch.index + 1,
        message: `Detected invalid non-printable control character (code: ${controlCharMatch[0].charCodeAt(0)}) at column ${controlCharMatch.index + 1}.`
      });
      break;
    }
  }

  return issues;
}

/**
 * Validate JSX and TypeScript syntax using esbuild
 */
function validateSyntax(content, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const loader = ext === '.tsx' ? 'tsx' : ext === '.ts' ? 'ts' : ext === '.jsx' ? 'jsx' : 'js';

  try {
    transformSync(content, {
      loader,
      target: 'esnext',
      sourcemap: false
    });
    return null;
  } catch (err) {
    return {
      message: err.message,
      errors: err.errors || []
    };
  }
}

console.log('\x1b[36m%s\x1b[0m', '🔍 [Pre-build Check] Scanning source files for JSX syntax errors and corrupted characters...');
const startTime = Date.now();

const allFiles = [];
for (const dir of TARGET_DIRS) {
  allFiles.push(...getSourceFiles(dir));
}
for (const file of TARGET_FILES) {
  if (fs.existsSync(file)) {
    allFiles.push(file);
  }
}

for (const filePath of allFiles) {
  totalFilesChecked++;
  const rawBuffer = fs.readFileSync(filePath);
  const content = rawBuffer.toString('utf-8');

  // 1. Check for corrupted/binary characters
  const charIssues = checkForCorruptedCharacters(content, filePath);
  if (charIssues.length > 0) {
    errorsFound++;
    console.error('\n\x1b[41m\x1b[37m%s\x1b[0m \x1b[31m%s\x1b[0m', ' CORRUPTED DATA ERROR ', filePath);
    for (const issue of charIssues) {
      console.error(`  Line ${issue.line}, Col ${issue.column}: ${issue.message}`);
    }
  }

  // 2. Validate JSX / TypeScript syntax
  const syntaxErr = validateSyntax(content, filePath);
  if (syntaxErr) {
    errorsFound++;
    console.error('\n\x1b[41m\x1b[37m%s\x1b[0m \x1b[31m%s\x1b[0m', ' JSX / SYNTAX ERROR ', filePath);
    if (syntaxErr.errors && syntaxErr.errors.length > 0) {
      for (const err of syntaxErr.errors) {
        const line = err.location ? err.location.line : '?';
        const col = err.location ? err.location.column : '?';
        const lineText = err.location ? err.location.lineText : '';
        console.error(`  Line ${line}, Col ${col}: ${err.text}`);
        if (lineText) {
          console.error(`  > ${lineText}`);
        }
      }
    } else {
      console.error(`  ${syntaxErr.message}`);
    }
  }
}

const duration = Date.now() - startTime;

if (errorsFound > 0) {
  console.error('\n\x1b[31m%s\x1b[0m', `❌ [Pre-build Check Failed] Found ${errorsFound} issue(s) across ${totalFilesChecked} files (${duration}ms).`);
  console.error('\x1b[33m%s\x1b[0m\n', '⚠️ Please resolve the syntax errors or character corruptions above before building for production on Vercel.');
  process.exit(1);
} else {
  console.log('\x1b[32m%s\x1b[0m\n', `✓ [Pre-build Check Passed] Verified ${totalFilesChecked} files in ${duration}ms. No corrupted characters or JSX syntax errors found.`);
}
