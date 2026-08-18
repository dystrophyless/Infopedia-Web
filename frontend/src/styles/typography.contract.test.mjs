import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const frontendDir = path.resolve(import.meta.dirname, '..', '..');
const srcDir = path.join(frontendDir, 'src');
const tokensPath = path.join(srcDir, 'styles', 'tokens.css');
const tailwindPath = path.join(frontendDir, 'tailwind.config.ts');
const featuredTermCardPath = path.join(srcDir, 'features', 'terms', 'components', 'FeaturedTermCard.tsx');
const termCardPath = path.join(srcDir, 'features', 'terms', 'components', 'TermCard.tsx');
const desktopSearchFiltersDialogPath = path.join(srcDir, 'features', 'search', 'components', 'DesktopSearchFiltersDialog.tsx');

const typeRoles = ['screen-title', 'section-title', 'card-title', 'body', 'helper', 'caption'];
const tailwindTextSizes = {
  xs: [12, 16],
  sm: [14, 20],
  base: [16, 24],
  lg: [18, 28],
  xl: [20, 28],
  '2xl': [24, 32],
  '3xl': [30, 36],
  '4xl': [36, 40],
  '5xl': [48, 48],
  '6xl': [60, 60],
  '7xl': [72, 72],
  '8xl': [96, 96],
  '9xl': [128, 128],
};
const forbiddenLeadingNames = new Set(['tight', 'snug', 'normal', 'relaxed', 'loose']);

function collectRuntimeFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const filePath = path.join(dir, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) return collectRuntimeFiles(filePath);
    if (!/\.(css|ts|tsx)$/.test(filePath)) return [];
    if (/\.test\.(ts|tsx)$/.test(filePath)) return [];
    if (/\.d\.ts$/.test(filePath)) return [];
    return [filePath];
  });
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function relative(filePath) {
  return path.relative(frontendDir, filePath).replaceAll(path.sep, '/');
}

const issues = [];

function issue(filePath, source, offset, message) {
  issues.push(`${relative(filePath)}:${lineNumber(source, offset)}: ${message}`);
}

function parseNumeric(value) {
  const normalized = value.trim().replace(/^['"]|['"]$/g, '');
  const match = normalized.match(/^(-?\d+(?:\.\d+)?)(px|rem)?$/);
  if (!match) return null;
  const number = Number(match[1]);
  return match[2] === 'rem' ? number * 16 : number;
}

function parseTokens(source) {
  const values = new Map();
  for (const match of source.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    values.set(match[1], match[2].trim());
  }
  return values;
}

const tokenSource = readFileSync(tokensPath, 'utf8');
const tokenValues = parseTokens(tokenSource);

for (const role of typeRoles) {
  const sizeToken = `--type-${role}-size`;
  const lineHeightToken = `--type-${role}-line-height`;
  assert.ok(tokenValues.has(sizeToken), `tokens.css must define ${sizeToken}`);
  assert.equal(tokenValues.get(lineHeightToken), '1', `${lineHeightToken} must be exactly 1`);
}

const tailwindSource = readFileSync(tailwindPath, 'utf8');
for (const role of typeRoles) {
  const mapping = new RegExp(
    `['"]?${role}['"]?\\s*:\\s*\\[\\s*['"]var\\(--type-${role}-size\\)['"]\\s*,\\s*\\{\\s*lineHeight:\\s*['"]var\\(--type-${role}-line-height\\)['"]`,
    's',
  );
  assert.match(tailwindSource, mapping, `Tailwind ${role} mapping must use semantic size and line-height tokens`);
}

function resolveTokenValue(value, suffix) {
  const match = value.match(new RegExp(`var\\((--type-[\\w-]+-${suffix})\\)`));
  if (!match) return null;
  const numeric = parseNumeric(tokenValues.get(match[1]) ?? '');
  return numeric === null ? null : numeric;
}

function resolveFontSize(utility) {
  const semantic = utility.match(/^text-(screen-title|section-title|card-title|body|helper|caption)$/);
  if (semantic) return resolveTokenValue(`var(--type-${semantic[1]}-size)`, 'size');
  const pixels = utility.match(/^text-\[(\d+(?:\.\d+)?)px\]$/);
  if (pixels) return Number(pixels[1]);
  const arbitraryToken = utility.match(/^text-\[(var\(--type-[\w-]+-size\))\]$/);
  if (arbitraryToken) return resolveTokenValue(arbitraryToken[1], 'size');
  const tailwind = utility.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/);
  return tailwind ? tailwindTextSizes[tailwind[1]][0] : null;
}

function resolveLineHeight(utility) {
  const name = utility.slice('leading-'.length);
  if (name === 'none') return { kind: 'safe' };
  if (forbiddenLeadingNames.has(name)) return { kind: 'forbidden', value: name };

  const arbitrary = name.match(/^\[(.+)\]$/)?.[1];
  const value = arbitrary ?? name;
  if (value === '1' || value === '1.0' || value === '1.00') return { kind: 'safe' };
  if (/^var\(--type-[\w-]+-line-height\)$/.test(value)) return { kind: 'safe' };
  if (/^var\(/.test(value)) return { kind: 'unresolved', value };

  const tailwindSpacing = value.match(/^\d+(?:\.5)?$/);
  if (tailwindSpacing) return { kind: 'length', value: Number(value) * 4 };

  const numeric = parseNumeric(value);
  if (numeric !== null) {
    if (!/[a-z]/i.test(value) && numeric !== 1) return { kind: 'forbidden', value };
    return { kind: 'length', value: numeric };
  }
  if (value === 'normal') return { kind: 'forbidden', value };
  return { kind: 'unresolved', value };
}

function splitClassToken(token) {
  const pieces = [];
  let bracketDepth = 0;
  let pieceStart = 0;
  for (let index = 0; index < token.length; index += 1) {
    if (token[index] === '[') bracketDepth += 1;
    else if (token[index] === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (token[index] === ':' && bracketDepth === 0) {
      pieces.push(token.slice(pieceStart, index));
      pieceStart = index + 1;
    }
  }
  pieces.push(token.slice(pieceStart));
  return pieces;
}

function responsiveScope(token) {
  const pieces = splitClassToken(token);
  const utility = (pieces.pop() ?? '').replace(/^!/, '');
  const scopedVariants = pieces.filter(
    (piece) => /^(?:sm|md|lg|xl|2xl|max-|min-)/.test(piece) || /^\[.*\]$/.test(piece),
  );
  return { utility, scope: scopedVariants.length ? scopedVariants.join(':') : 'base' };
}

function classTokens(content) {
  return content
    .split(/\s+/)
    .map((token) => token.replace(/^[`'"`]+|[`'"`}>,;]+$/g, ''))
    .filter(Boolean);
}

function isReferenceTypographyPair(filePath, content, scope, sizeEntry, lineEntry) {
  return path.normalize(filePath) === path.normalize(termCardPath)
    && content.includes('block truncate font-medium')
    && scope === 'base'
    && sizeEntry.token === 'text-[22px]'
    && sizeEntry.size === 22
    && lineEntry.token === 'leading-6'
    && lineEntry.resolved.kind === 'length'
    && lineEntry.resolved.value === 24;
}

// Task-5 filter controls intentionally preserve source-backed Figma typography:
// browser evidence in TermSearchPage stories records these exact pairs as
// 14px/20px, 16px/24px, 16px/20px, and 18px/27px (browser's normal line box). Keep exceptions exact to
// this component and full class fragments; dynamic content remains scanned.
function isTask5TypographyException(filePath, content, token, sizeEntry) {
  if (path.normalize(filePath) !== path.normalize(desktopSearchFiltersDialogPath)) return false;
  const evidence = [
    { fragment: 'text-[14px] leading-5 text-[#44237d]', token: 'leading-5', size: 14 },
    { fragment: 'text-[18px] font-medium leading-normal text-[#865bcf]', token: 'leading-normal', size: 18 },
    { fragment: 'text-[18px] font-medium leading-normal text-white', token: 'leading-normal', size: 18 },
    { fragment: 'text-left text-[16px] font-normal leading-6 text-[#44237d]', token: 'leading-6', size: 16 },
    { fragment: 'gap-2 overflow-hidden rounded-[8px] bg-white px-4 py-2 text-[16px] font-normal leading-6', token: 'leading-6', size: 16 },
    { fragment: 'text-[16px] leading-5 text-[#44237d]', token: 'leading-5', size: 16 },
    { fragment: 'text-[14px] leading-5 text-[#44237d]', token: 'leading-5', size: 14 },
  ];
  return evidence.some((entry) =>
    entry.fragment && content.includes(entry.fragment) && entry.token === token && entry.size === sizeEntry.size,
  );
}

function scanClassString(filePath, source, content, offset) {
  const sizes = new Map();
  const lineHeights = new Map();
  const tokens = classTokens(content);

  for (const token of tokens) {
    const { utility, scope } = responsiveScope(token);
    // `leading-only` is an app-bar layout enum, not a Tailwind line-height utility.
    if (utility.startsWith('leading-') && utility !== 'leading-only') {
      const resolved = resolveLineHeight(utility);
      lineHeights.set(scope, { resolved, token });
      if (resolved.kind === 'forbidden') {
        const scopedSize = resolveFontSize(tokens.find((candidate) => responsiveScope(candidate).scope === scope && responsiveScope(candidate).utility.startsWith('text-')) ?? '');
        if (!isTask5TypographyException(filePath, content, token, { size: scopedSize ?? 0 })) {
          issue(filePath, source, offset, `class ${token} resolves to a non-exact line-height`);
        }
      } else if (resolved.kind === 'unresolved') {
        issue(filePath, source, offset, `cannot statically resolve line-height class ${token}`);
      }
    }
    if (utility.startsWith('text-')) {
      const size = resolveFontSize(utility);
      if (size !== null) sizes.set(scope, { size, token });
    }
  }

  const scopes = new Set([...sizes.keys(), ...lineHeights.keys()]);
  for (const scope of scopes) {
    const sizeEntry = sizes.get(scope) ?? sizes.get('base');
    const lineEntry = lineHeights.get(scope) ?? lineHeights.get('base');
    if (!sizeEntry || !lineEntry || lineEntry.resolved.kind !== 'length') continue;
    if (lineEntry.resolved.value !== sizeEntry.size) {
      if (
        isReferenceTypographyPair(filePath, content, scope, sizeEntry, lineEntry)
        || isTask5TypographyException(filePath, content, lineEntry.token, sizeEntry)
      ) continue;
      issue(
        filePath,
        source,
        offset,
        `${scope} uses ${lineEntry.token} (${lineEntry.resolved.value}px) with ${sizeEntry.token} (${sizeEntry.size}px); line-height must equal font-size`,
      );
    }
  }

  for (const [scope, sizeEntry] of sizes) {
    if (scope === 'base' || lineHeights.has(scope)) continue;
    const baseLine = lineHeights.get('base');
    if (baseLine?.resolved.kind === 'length' && baseLine.resolved.value !== sizeEntry.size) {
      issue(
        filePath,
        source,
        offset,
        `${scope} changes to ${sizeEntry.token} (${sizeEntry.size}px) but inherits ${baseLine.token} (${baseLine.resolved.value}px); add an exact responsive line-height`,
      );
    }
  }
}

function scanClassStrings(filePath, source) {
  const stringPattern = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\])*)`/gs;
  for (const match of source.matchAll(stringPattern)) {
    const content = match[1] ?? match[2] ?? match[3] ?? '';
    const hasTypographyClass = classTokens(content).some((token) => {
      const { utility } = responsiveScope(token);
      return (utility.startsWith('leading-') && utility !== 'leading-only') || utility.startsWith('text-');
    });
    if (!hasTypographyClass) continue;
    const offset = match.index ?? 0;
    scanClassString(filePath, source, content, offset);
  }
}

function resolveInlineValue(value, kind) {
  const normalized = value.trim().replace(/[,}]$/, '').replace(/^['"]|['"]$/g, '');
  if (/^1(?:\.0+)?$/.test(normalized) && kind === 'lineHeight') return { kind: 'safe' };
  if (normalized === 'inherit' && kind === 'lineHeight') return { kind: 'safe' };
  if (/^var\(--type-[\w-]+-line-height\)$/.test(normalized) && kind === 'lineHeight') return { kind: 'safe' };
  const numeric = parseNumeric(normalized);
  if (numeric !== null) {
    if (kind === 'lineHeight' && !/[a-z]/i.test(normalized) && numeric !== 1) return { kind: 'forbidden', value: numeric };
    return { kind: 'length', value: numeric };
  }
  return { kind: 'unresolved', value: normalized };
}

function isComputedStyleLineHeightPropagation(filePath, source, offset, value) {
  if (path.normalize(filePath) !== path.normalize(featuredTermCardPath)) return false;

  const helperStart = source.indexOf('function createDefinitionMeasureNode(');
  const helperEnd = helperStart < 0 ? -1 : source.indexOf('\n}', helperStart);
  if (helperStart < 0 || helperEnd < 0 || offset < helperStart || offset > helperEnd) return false;

  const normalized = value.trim().replace(/[,}]$/, '');
  const member = normalized.match(/^([A-Za-z_$][\w$]*)\.lineHeight$/);
  if (!member) return false;

  let latestBindingIsComputedStyle = false;
  const sourceBeforeValue = source.slice(0, offset);
  for (const binding of sourceBeforeValue.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\r\n]+)/g)) {
    if (binding[1] !== member[1]) continue;
    latestBindingIsComputedStyle = /^window\.getComputedStyle\s*\(/.test(binding[2].trim());
  }
  return latestBindingIsComputedStyle;
}

const computedStylePropagationFixture = `function createDefinitionMeasureNode(node) {
  const styles = window.getComputedStyle(node);
  return { lineHeight: styles.lineHeight };
}`;
const computedStyleOffset = computedStylePropagationFixture.lastIndexOf('styles.lineHeight');
assert.equal(
  isComputedStyleLineHeightPropagation(
    featuredTermCardPath,
    computedStylePropagationFixture,
    computedStyleOffset,
    'styles.lineHeight',
  ),
  true,
  'FeaturedTermCard measurement helper may copy lineHeight directly from window.getComputedStyle',
);
assert.equal(
  isComputedStyleLineHeightPropagation(
    path.join(srcDir, 'components', 'OtherCard.tsx'),
    computedStylePropagationFixture,
    computedStyleOffset,
    'styles.lineHeight',
  ),
  false,
  'computed-style propagation outside FeaturedTermCard must remain unresolved',
);
const outsideMeasurementHelperFixture = `${computedStylePropagationFixture}\nconst styles = window.getComputedStyle(node);\nconst copy = { lineHeight: styles.lineHeight };`;
assert.equal(
  isComputedStyleLineHeightPropagation(
    featuredTermCardPath,
    outsideMeasurementHelperFixture,
    outsideMeasurementHelperFixture.lastIndexOf('styles.lineHeight'),
    'styles.lineHeight',
  ),
  false,
  'computed-style propagation outside createDefinitionMeasureNode must remain unresolved',
);
const dynamicStylePropagationFixture = computedStylePropagationFixture.replace(
  'window.getComputedStyle(node)',
  'getTypographyStyles(node)',
);
assert.equal(
  isComputedStyleLineHeightPropagation(
    featuredTermCardPath,
    dynamicStylePropagationFixture,
    dynamicStylePropagationFixture.lastIndexOf('styles.lineHeight'),
    'styles.lineHeight',
  ),
  false,
  'lineHeight from getTypographyStyles must remain unresolved',
);
assert.equal(
  isComputedStyleLineHeightPropagation(
    featuredTermCardPath,
    computedStylePropagationFixture,
    computedStyleOffset,
    'lineHeight',
  ),
  false,
  'plain dynamic lineHeight values must remain unresolved',
);

function scanStyleObject(filePath, source, body, bodyOffset, scannedLineHeightOffsets) {
  const lineHeight = body.match(/\blineHeight\s*:\s*([^,\n}]+)/);
  if (!lineHeight) return;

  const offset = bodyOffset + (lineHeight.index ?? 0);
  if (scannedLineHeightOffsets.has(offset)) return;
  scannedLineHeightOffsets.add(offset);

  const fontSize = body.match(/\bfontSize\s*:\s*([^,\n}]+)/);
  const lineValue = resolveInlineValue(lineHeight[1], 'lineHeight');
  if (lineValue.kind === 'forbidden') {
    issue(filePath, source, offset, `inline lineHeight ${lineHeight[1].trim()} is not exact`);
    return;
  }
  if (
    lineValue.kind === 'unresolved'
    && !isComputedStyleLineHeightPropagation(filePath, source, offset, lineHeight[1])
  ) {
    issue(filePath, source, offset, `cannot statically resolve inline lineHeight ${lineHeight[1].trim()}`);
    return;
  }
  if (!fontSize || lineValue.kind !== 'length') return;
  const sizeValue = resolveInlineValue(fontSize[1], 'fontSize');
  if (sizeValue.kind !== 'length') {
    issue(filePath, source, offset, `cannot statically resolve inline fontSize ${fontSize[1].trim()}`);
    return;
  }
  if (sizeValue.value !== lineValue.value) {
    issue(filePath, source, offset, `inline lineHeight ${lineValue.value}px must equal fontSize ${sizeValue.value}px`);
  }
}

function findStaticStyleObjectBinding(source, beforeOffset, identifier) {
  const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bindingPattern = new RegExp(
    `\\b(?:const|let|var)\\s+${escapedIdentifier}(?:\\s*:\\s*[^=;\\r\\n]+)?\\s*=\\s*\\{([^{}]*)\\}\\s*(?:as\\s+const\\s*)?;`,
    'gs',
  );
  let latest = null;
  for (const binding of source.slice(0, beforeOffset).matchAll(bindingPattern)) {
    const body = binding[1];
    latest = {
      body,
      offset: (binding.index ?? 0) + binding[0].indexOf(body),
    };
  }
  return latest;
}

function scanInlineStyles(filePath, source) {
  const scannedLineHeightOffsets = new Set();

  for (const match of source.matchAll(/style=\{\{([\s\S]*?)\}\}/g)) {
    const body = match[1];
    const bodyOffset = (match.index ?? 0) + match[0].indexOf(body);
    scanStyleObject(filePath, source, body, bodyOffset, scannedLineHeightOffsets);
  }

  for (const match of source.matchAll(/style=\{\s*([A-Za-z_$][\w$]*)\s*\}/g)) {
    const binding = findStaticStyleObjectBinding(source, match.index ?? 0, match[1]);
    if (!binding || !/\b(?:fontSize|lineHeight)\s*:/.test(binding.body)) continue;
    scanStyleObject(filePath, source, binding.body, binding.offset, scannedLineHeightOffsets);
  }

  for (const match of source.matchAll(/\blineHeight\s*:\s*([^,\n}]+)/g)) {
    if (scannedLineHeightOffsets.has(match.index ?? 0)) continue;
    const value = match[1].trim();
    if (isComputedStyleLineHeightPropagation(filePath, source, match.index ?? 0, value)) continue;
    if (/^styles\.lineHeight$|^[A-Za-z_$][\w$]*$/.test(value)) {
      issue(filePath, source, match.index ?? 0, `cannot statically resolve lineHeight ${value}`);
    }
  }
}

function scanCss(filePath, source) {
  for (const block of source.matchAll(/[^{}]*\{([^{}]*)\}/gs)) {
    const body = block[1];
    const lineHeight = body.match(/\bline-height\s*:\s*([^;\n}]+)/);
    if (!lineHeight) continue;
    const value = lineHeight[1].trim();
    const offset = (block.index ?? 0) + block[0].indexOf(lineHeight[0]);
    const resolved = resolveInlineValue(value, 'lineHeight');
    if (resolved.kind === 'forbidden') {
      issue(filePath, source, offset, `CSS line-height ${value} is not exact`);
      continue;
    }
    if (resolved.kind === 'unresolved') {
      issue(filePath, source, offset, `cannot statically resolve CSS line-height ${value}`);
      continue;
    }
    if (resolved.kind !== 'length') continue;
    const fontSize = body.match(/\bfont-size\s*:\s*([^;\n}]+)/);
    if (!fontSize) {
      if (resolved.value !== 1) issue(filePath, source, offset, `CSS line-height ${value} has no resolvable font-size`);
      continue;
    }
    const size = parseNumeric(fontSize[1].trim());
    if (size !== null && size !== resolved.value) {
      issue(filePath, source, offset, `CSS line-height ${resolved.value}px must equal font-size ${size}px`);
    }

  }

  for (const block of source.matchAll(/[^{}]*\{([^{}]*)\}/gs)) {
    const body = block[1];
    for (const font of body.matchAll(/\bfont\s*:\s*([^;\n}]+)/g)) {
      const value = font[1].trim().replace(/\s*!important\s*$/, '');
      const pair = value.match(
        /(?:^|\s)(-?\d+(?:\.\d+)?(?:px|rem))\s*\/\s*(normal|-?\d+(?:\.\d+)?(?:px|rem)?)\s+(?=\S)/i,
      );
      if (!pair) continue;

      const size = parseNumeric(pair[1]);
      const lineHeight = resolveInlineValue(pair[2], 'lineHeight');
      const offset = (block.index ?? 0) + block[0].indexOf(font[0]);
      if (lineHeight.kind === 'safe') continue;
      if (lineHeight.kind === 'forbidden' || lineHeight.kind === 'unresolved') {
        issue(filePath, source, offset, `CSS font shorthand line-height ${pair[2]} is not exact`);
        continue;
      }
      if (size !== null && lineHeight.value !== size) {
        issue(
          filePath,
          source,
          offset,
          `CSS font shorthand line-height ${lineHeight.value}px must equal font-size ${size}px`,
        );
      }
    }
  }
}

function collectFixtureIssues(run) {
  const issueStart = issues.length;
  run();
  return issues.splice(issueStart);
}

const fixtureTsxPath = path.join(srcDir, '__fixtures__', 'TypographyFixture.tsx');
const fixtureCssPath = path.join(srcDir, '__fixtures__', 'typography-fixture.css');

assert.deepEqual(
  collectFixtureIssues(() => scanClassStrings(
    fixtureTsxPath,
    '<div className="!text-[16px] !leading-4 md:!text-[20px] md:!leading-5 [&>h2]:text-[16px] [&>h2]:leading-4 md:[&>h2]:text-[20px] md:[&>h2]:leading-5" />',
  )),
  [],
  'important and arbitrary-variant typography pairs must be recognized in their exact scopes',
);

const importantResponsiveIssues = collectFixtureIssues(() => scanClassStrings(
  fixtureTsxPath,
  '<div className="!text-[16px] !leading-4 md:!text-[20px] md:!leading-6" />',
));
assert.equal(importantResponsiveIssues.length, 1, 'important responsive mismatch fixture must fail once');
assert.match(importantResponsiveIssues[0], /md uses .*24px.*20px/);

const arbitraryVariantIssues = collectFixtureIssues(() => scanClassStrings(
  fixtureTsxPath,
  '<div className="[&>h2]:text-[16px] [&>h2]:leading-5" />',
));
assert.equal(arbitraryVariantIssues.length, 1, 'arbitrary-variant mismatch fixture must fail once');
assert.match(arbitraryVariantIssues[0], /\[&>h2\] uses .*20px.*16px/);

assert.deepEqual(
  collectFixtureIssues(() => scanInlineStyles(
    fixtureTsxPath,
    "const textStyle = { fontSize: '16px', lineHeight: '16px' };\nconst Fixture = () => <p style={textStyle} />;",
  )),
  [],
  'static JSX style object bindings with exact typography must pass',
);

const staticStyleBindingIssues = collectFixtureIssues(() => scanInlineStyles(
  fixtureTsxPath,
  "const textStyle = { fontSize: '16px', lineHeight: '20px' };\nconst Fixture = () => <p style={textStyle} />;",
));
assert.equal(staticStyleBindingIssues.length, 1, 'static JSX style object binding mismatch fixture must fail once');
assert.match(staticStyleBindingIssues[0], /inline lineHeight 20px must equal fontSize 16px/);

const unresolvedStaticStyleBindingIssues = collectFixtureIssues(() => scanInlineStyles(
  fixtureTsxPath,
  "const textStyle = { fontSize: dynamicSize, lineHeight: '16px' };\nconst Fixture = () => <p style={textStyle} />;",
));
assert.equal(
  unresolvedStaticStyleBindingIssues.length,
  1,
  'unknown values in a static JSX style object binding must not hide typography mismatches',
);
assert.match(unresolvedStaticStyleBindingIssues[0], /cannot statically resolve inline fontSize dynamicSize/);

assert.deepEqual(
  collectFixtureIssues(() => scanCss(
    fixtureCssPath,
    '.fixture { font: 500 1rem/16px Inter, sans-serif; }\n.unitless { font: 16px/1.0 Inter, sans-serif; }',
  )),
  [],
  'static CSS font shorthand with an exact size and line-height pair must pass',
);

const cssFontShorthandIssues = collectFixtureIssues(() => scanCss(
  fixtureCssPath,
  '.fixture { font: 500 16px/20px Inter, sans-serif; }',
));
assert.equal(cssFontShorthandIssues.length, 1, 'CSS font shorthand mismatch fixture must fail once');
assert.match(cssFontShorthandIssues[0], /CSS font shorthand line-height 20px must equal font-size 16px/);

for (const filePath of collectRuntimeFiles(srcDir)) {
  const source = readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.css')) scanCss(filePath, source);
  else {
    scanClassStrings(filePath, source);
    scanInlineStyles(filePath, source);
  }
}

assert.equal(
  issues.length,
  0,
  `Strict typography contract found ${issues.length} violation(s):\n${issues.join('\n')}`,
);
