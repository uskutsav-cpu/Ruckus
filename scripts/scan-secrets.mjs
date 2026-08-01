import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{30,}/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['Supabase secret key', /sb_secret_[A-Za-z0-9_-]{20,}/],
  ['Stripe live key', /sk_live_[A-Za-z0-9]{20,}/],
  ['personal absolute path', /\/Users\/[A-Za-z0-9._-]+\//]
];

const ignoredFiles = new Set(['scripts/scan-secrets.mjs']);
const listed = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' }
)
  .split('\0')
  .filter(Boolean)
  .filter((file) => !ignoredFiles.has(file));

const findings = [];
for (const file of listed) {
  let contents;
  try {
    contents = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (contents.includes('\0')) continue;
  for (const [label, pattern] of patterns) {
    if (pattern.test(contents)) findings.push(`${file}: ${label}`);
  }
}

const history = execFileSync('git', ['log', '--all', '-p', '--no-ext-diff'], {
  encoding: 'utf8',
  maxBuffer: 100 * 1024 * 1024
});
for (const [label, pattern] of patterns.slice(0, -1)) {
  if (pattern.test(history)) findings.push(`Git history: ${label}`);
}

if (findings.length) {
  console.error(
    `Potential public-repository findings:\n${[...new Set(findings)].join('\n')}`
  );
  process.exitCode = 1;
} else {
  console.log(
    `Secret scan passed for ${listed.length} working-tree files and Git history.`
  );
}
