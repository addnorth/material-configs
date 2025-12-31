#!/usr/bin/env node

const fs = require('fs');

const ALLOWED_TYPES = ['feat', 'fix', 'docs'];
const COMMIT_REGEX = new RegExp(`^(${ALLOWED_TYPES.join('|')})(\\(.+\\))?: .+`);

// Read commit message from file (passed as argument by git)
const commitMsgFile = process.argv[2];
const commitMsg = fs.readFileSync(commitMsgFile, 'utf-8').trim();
const firstLine = commitMsg.split('\n')[0];

if (!COMMIT_REGEX.test(firstLine)) {
  console.error('❌ Invalid commit message format!\n');
  console.error('Commit messages must follow the format:');
  console.error('  feat: description');
  console.error('  fix: description');
  console.error('  docs: description');
  console.error('\nExamples:');
  console.error('  feat: Add PLA material configuration');
  console.error('  fix: Correct nozzle temperature for 0.6mm');
  console.error('  docs: Update setup guide');
  console.error(`\nYour message: ${firstLine}`);
  process.exit(1);
}

process.exit(0);
