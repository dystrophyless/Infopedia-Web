import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';

const patternsDir = import.meta.dirname;
const frontendRoot = path.resolve(patternsDir, '..', '..', '..');
const componentPath = path.resolve(patternsDir, 'BetweenBlocks.tsx');
const storyPath = path.resolve(patternsDir, 'BetweenBlocks.stories.tsx');

assert.ok(existsSync(componentPath), 'BetweenBlocks must exist as a reusable UI pattern');
assert.ok(existsSync(storyPath), 'BetweenBlocks must have a colocated standard story');

const source = readFileSync(componentPath, 'utf8');
const story = readFileSync(storyPath, 'utf8');
const index = readFileSync(path.resolve(patternsDir, 'index.ts'), 'utf8');

assert.match(source, /ComponentPropsWithoutRef<'div'>/, 'BetweenBlocks must accept native div props');
assert.match(source, /children: ReactNode/, 'BetweenBlocks must accept arbitrary outcome content');
assert.match(source, /outcomeClassName\?: string/, 'BetweenBlocks must expose a class hook for its outcome row');
assert.match(source, /\.\.\.props/, 'BetweenBlocks must forward role, aria, and data attributes');
assert.match(source, /grid min-w-0 flex-1 grid-rows-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/, 'BetweenBlocks must shrink safely and use symmetric intrinsic grid rows');
assert.match(source, /row-start-2/, 'BetweenBlocks must place the outcome in its middle row');
assert.doesNotMatch(source, /nav|appBar|router|footer|cta|viewport|100dvh|fixed|sticky|absolute|translate|overflow-(?:hidden|clip)/i, 'BetweenBlocks must stay agnostic to surrounding block types and avoid clipping/positioning math');
assert.match(index, /export \* from '.\/BetweenBlocks';/, 'BetweenBlocks must be publicly exported from UI patterns');
assert.match(story, /export const Standard/, 'BetweenBlocks must expose a standard testable story');
assert.match(story, /data-between-blocks-boundary/, 'The story must demonstrate generic structural boundaries');

const classes = [
  'grid',
  'min-w-0',
  'flex-1',
  'grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)]',
  'row-start-2',
];
const css = await postcss([
  tailwindcss({
    ...loadConfig(path.join(frontendRoot, 'tailwind.config.ts')),
    content: [{ raw: `<div class="${classes.join(' ')}"></div>`, extension: 'html' }],
  }),
]).process('@tailwind utilities;', { from: undefined });

function hasDeclaration(property, value) {
  let found = false;
  css.root.walkDecls(property, (declaration) => {
    if (declaration.value === value) found = true;
  });
  return found;
}

assert.ok(hasDeclaration('display', 'grid'), 'BetweenBlocks grid utility must generate display: grid');
assert.ok(hasDeclaration('min-width', '0px'), 'BetweenBlocks must be allowed to shrink inside flex and grid parents');
assert.ok(hasDeclaration('flex', '1 1 0%'), 'BetweenBlocks must grow through the available structural region');
assert.ok(
  hasDeclaration('grid-template-rows', 'minmax(0,1fr) auto minmax(0,1fr)'),
  'BetweenBlocks must generate symmetric flexible rows around intrinsic outcome paint',
);
assert.ok(hasDeclaration('grid-row-start', '2'), 'Outcome wrapper must generate grid row start 2');
