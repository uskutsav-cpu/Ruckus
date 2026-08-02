import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * AppIcon renders an unrecognised name as literal text rather than failing, so a
 * typo like icon="shield" ships silently and shows the word "shield" to users.
 * This test reads the icon vocabulary straight from the component and asserts
 * that every name used anywhere in the app resolves to a real glyph.
 */
const iconSource = readFileSync('src/components/ui/app-icon.tsx', 'utf8');

function collectNames(pattern: RegExp): Set<string> {
  const names = new Set<string>();
  for (const match of iconSource.matchAll(pattern)) {
    const name = match[1];
    if (name) names.add(name);
  }
  return names;
}

const symbolNames = collectNames(/^ {2}([a-zA-Z][a-zA-Z0-9]*):\s*\{/gm);
const aliasNames = collectNames(/^ {2}'?([^\s':]+)'?:\s*'[a-zA-Z]+',?$/gm);
const known = new Set([...symbolNames, ...aliasNames]);

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (full.endsWith('.tsx')) found.push(full);
  }
  return found;
}

const iconProps = /(?:\bicon|leadingIcon|mark|trailingIcon)="([a-zA-Z][a-zA-Z0-9]*)"/g;

describe('app icon vocabulary', () => {
  it('reads a non-trivial icon vocabulary from the component', () => {
    expect(symbolNames.size).toBeGreaterThan(10);
    expect(known.has('safety')).toBe(true);
    expect(known.has('warning')).toBe(true);
  });

  it('resolves every icon name used across app and component source', () => {
    const files = [...walk('app'), ...walk('src')];
    const unresolved: string[] = [];

    for (const file of files) {
      const contents = readFileSync(file, 'utf8');
      for (const match of contents.matchAll(iconProps)) {
        const name = match[1];
        if (name && !known.has(name)) unresolved.push(`${file}: ${name}`);
      }
    }

    expect(unresolved).toEqual([]);
  });
});
