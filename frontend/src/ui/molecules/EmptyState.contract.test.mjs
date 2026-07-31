import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';

const moleculesDir = import.meta.dirname;
const frontendRoot = path.resolve(moleculesDir, '..', '..', '..');
const source = readFileSync(path.resolve(moleculesDir, 'EmptyState.tsx'), 'utf8');
const story = readFileSync(path.resolve(moleculesDir, 'EmptyState.stories.tsx'), 'utf8');
const tokens = readFileSync(path.resolve(frontendRoot, 'src/styles/tokens.css'), 'utf8');

assert.match(source, /type EmptyStateVariant = 'default' \| 'outcome'/, 'EmptyState must expose a backwards-compatible outcome variant');
assert.match(source, /title: ReactNode/, 'EmptyState title must accept rich localized React content');
assert.match(source, /description\?: ReactNode/, 'EmptyState description must accept rich localized React content');
assert.match(source, /Omit<HTMLAttributes<HTMLElement>, 'children' \| 'title'>/, 'EmptyState must forward native section attributes without conflicting with its rich title');
assert.match(source, /partProps\?: EmptyStatePartProps/, 'EmptyState must expose exact paint-part hooks without leaking page concerns');
assert.match(source, /<section[\s\S]*\.\.\.sectionProps[\s\S]*aria-labelledby=\{labelledBy\}[\s\S]*aria-describedby=\{describedBy\}/, 'EmptyState must preserve role/data props and own accessible title/description wiring');
assert.match(source, /variant = 'default'/, 'Existing EmptyState consumers must retain the current default rendering contract');
assert.match(source, /variant === 'outcome'/, 'Outcome anatomy must be opt-in');
assert.match(source, /size-16[\s\S]*rounded-full[\s\S]*size-8/, 'Outcome paint must use the shared 64px circle and 32px icon box');
assert.match(source, /text-\[20px\][\s\S]*leading-\[20px\]/, 'Outcome title must render at the exact 20px/20px pair');
assert.match(source, /text-\[14px\][\s\S]*leading-\[14px\]/, 'Outcome description must render at the exact 14px/14px pair');
assert.match(source, /mt-6 w-full/, 'Outcome action region must start 24px below the copy and span the available width');
assert.doesNotMatch(source, /react-router|i18next|--shell-mobile-bottom-nav|100dvh|fixed|sticky|top-\[/, 'EmptyState must own paint only, not routing or page geometry');

assert.match(story, /export const Outcome/, 'EmptyState must provide a standard outcome story');
assert.match(story, /role: 'alert'/, 'The outcome story must exercise native role passthrough');
assert.match(story, /data-empty-state-story/, 'The outcome story must exercise data-attribute passthrough');
assert.match(story, /aria-labelledby/, 'The story play test must verify title association');
assert.match(story, /aria-describedby/, 'The story play test must verify description association');

assert.match(tokens, /--type-card-title-size:\s*20px;/, 'Card title token must resolve to the outcome 20px size');
assert.match(tokens, /--type-helper-size:\s*14px;/, 'Helper token must resolve to the outcome 14px size');

const classes = [
  'size-16',
  'size-8',
  'rounded-full',
  'text-[20px]',
  'leading-[20px]',
  'text-[14px]',
  'leading-[14px]',
  'mt-6',
  'w-full',
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

for (const [property, value] of [
  ['width', '4rem'],
  ['height', '4rem'],
  ['width', '2rem'],
  ['height', '2rem'],
  ['border-radius', '9999px'],
  ['font-size', '20px'],
  ['line-height', '20px'],
  ['font-size', '14px'],
  ['line-height', '14px'],
  ['margin-top', '1.5rem'],
  ['width', '100%'],
]) {
  assert.ok(hasDeclaration(property, value), `Outcome utilities must generate ${property}: ${value}`);
}
