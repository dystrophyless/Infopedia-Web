import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const frontendDir = path.resolve(import.meta.dirname, '..');

function lex(source) {
  const tokens = [];
  const diagnostics = [];
  let index = 0;
  const add = (type, value, start, end, dynamic = false) => tokens.push({ type, value, start, end, dynamic });
  while (index < source.length) {
    const start = index;
    const character = source[index];
    const next = source[index + 1];
    if (/\s/.test(character)) { index += 1; continue; }
    if (character === '/' && next === '/') { index += 2; while (index < source.length && source[index] !== '\n') index += 1; continue; }
    if (character === '/' && next === '*') { index += 2; while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1; if (index >= source.length) diagnostics.push('unterminated block comment'); else index += 2; continue; }
    if (character === '/' && next !== '/' && next !== '*') { index += 1; let escaped = false; while (index < source.length) { if (!escaped && source[index] === '/') { index += 1; while (/[a-z]/i.test(source[index] ?? '')) index += 1; break; } escaped = !escaped && source[index] === '\\'; if (source[index] !== '\\') escaped = false; index += 1; } continue; }
    if (character === '\'' || character === '"' || character === '`') {
      const quote = character; index += 1; let value = ''; let dynamic = false; let escaped = false;
      while (index < source.length) { const current = source[index]; if (!escaped && current === quote) { index += 1; break; } if (quote === '`' && !escaped && current === '$' && source[index + 1] === '{') dynamic = true; if (!escaped) value += current; escaped = !escaped && current === '\\'; if (current !== '\\') escaped = false; index += 1; }
      if (source[index - 1] !== quote) diagnostics.push(`unterminated ${quote} string at ${start}`); add('string', value, start, index, dynamic); continue;
    }
    if (/[A-Za-z_$]/.test(character)) { index += 1; while (/[\w$]/.test(source[index] ?? '')) index += 1; const value = source.slice(start, index); add(value === 'true' || value === 'false' ? 'boolean' : 'identifier', value, start, index); continue; }
    if ('{}[]:,'.includes(character)) { add(character, character, start, ++index); continue; }
    add('unknown', character, start, ++index, true);
  }
  return { tokens, diagnostics };
}

function parseValue(tokens, cursor, diagnostics) {
  const token = tokens[cursor];
  if (!token) return { node: { kind: 'dynamic' }, cursor };
  if (token.type === '{') return parseObject(tokens, cursor, diagnostics);
  if (token.type === '[') { const items = []; cursor += 1; while (tokens[cursor]?.type !== ']' && cursor < tokens.length) { const parsed = parseValue(tokens, cursor, diagnostics); items.push(parsed.node); cursor = parsed.cursor; if (tokens[cursor]?.type === ',') cursor += 1; else if (tokens[cursor]?.type !== ']') { diagnostics.push(`malformed array near ${tokens[cursor]?.start}`); break; } } if (tokens[cursor]?.type !== ']') diagnostics.push('unterminated array'); return { node: { kind: 'array', items }, cursor: cursor + (tokens[cursor]?.type === ']' ? 1 : 0) }; }
  if (token.type === 'string') return { node: { kind: 'string', value: token.value, dynamic: token.dynamic }, cursor: cursor + 1 };
  if (token.type === 'boolean') return { node: { kind: 'boolean', value: token.value === 'true' }, cursor: cursor + 1 };
  return { node: { kind: 'dynamic' }, cursor: cursor + 1 };
}

function parseObject(tokens, start, diagnostics) {
  if (tokens[start]?.type !== '{') return { node: { kind: 'dynamic' }, cursor: start + 1 };
  const properties = []; let cursor = start + 1;
  while (cursor < tokens.length && tokens[cursor].type !== '}') {
    const key = tokens[cursor];
    if (!key || !['identifier', 'string'].includes(key.type) || tokens[cursor + 1]?.type !== ':') { diagnostics.push(`malformed object near ${key?.start ?? 'eof'}`); while (cursor < tokens.length && !['}', ','].includes(tokens[cursor].type)) cursor += 1; if (tokens[cursor]?.type === ',') cursor += 1; continue; }
    const parsed = parseValue(tokens, cursor + 2, diagnostics); properties.push({ key: key.value, value: parsed.node }); cursor = parsed.cursor; if (tokens[cursor]?.type === ',') cursor += 1;
  }
  if (tokens[cursor]?.type !== '}') diagnostics.push(`unterminated object at ${tokens[start].start}`);
  return { node: { kind: 'object', properties }, cursor: cursor + (tokens[cursor]?.type === '}' ? 1 : 0) };
}

function objectProperties(node, key) { return node?.kind === 'object' ? node.properties.filter((property) => property.key === key) : []; }
function staticStrings(node, key) { return objectProperties(node, key).map(({ value }) => value).filter((value) => value.kind === 'string' && !value.dynamic).map((value) => value.value); }
function hasBoolean(node, key, expected) { if (!node || node.kind !== 'object') return false; if (objectProperties(node, key).some(({ value }) => value.kind === 'boolean' && value.value === expected)) return true; return node.properties.some(({ value }) => hasBoolean(value, key, expected)); }
function collectObjects(node, output = []) { if (!node || node.kind !== 'object') return output; output.push(node); for (const { value } of node.properties) { if (value.kind === 'object') collectObjects(value, output); if (value.kind === 'array') value.items.forEach((item) => collectObjects(item, output)); } return output; }
function parseRelevantObjects(source, key = null) { const { tokens } = lex(source); const diagnostics = []; const objects = []; for (let index = 0; index < tokens.length - 2; index += 1) { const token = tokens[index]; if (!key && token.type === '{') { objects.push(parseObject(tokens, index, diagnostics).node); continue; } if (token.type !== 'identifier' && token.type !== 'string') continue; if (key && token.value !== key) continue; if (tokens[index + 1]?.type !== ':' || tokens[index + 2]?.type !== '{') continue; const parsed = parseObject(tokens, index + 2, diagnostics); objects.push(parsed.node); } return { objects, diagnostics }; }
function disabledRuleIds(node) { return collectObjects(node).flatMap((object) => { const ids = staticStrings(object, 'id'); const disabled = objectProperties(object, 'enabled').some(({ value }) => value.kind === 'boolean' && !value.value); return disabled ? ids : []; }); }
function dynamicPolicyFields(node, output = []) { if (!node || node.kind !== 'object') return output; for (const { key, value } of node.properties) { if (['a11y', 'test', 'id', 'enabled', 'disable'].includes(key) && (value.kind === 'dynamic' || (value.kind === 'string' && value.dynamic))) output.push(key); if (value.kind === 'object') dynamicPolicyFields(value, output); if (value.kind === 'array') value.items.forEach((item) => dynamicPolicyFields(item, output)); } return output; }
function analyzeA11y(source, label) { const parsed = parseRelevantObjects(source, 'a11y'); assert.equal(parsed.diagnostics.length, 0, `${label}: malformed/ambiguous policy: ${parsed.diagnostics.join('; ')}`); assert.equal(parsed.objects.length, 1, `${label}: expected exactly one a11y object`); assert.equal(dynamicPolicyFields(parsed.objects[0]).length, 0, `${label}: dynamic policy values are ambiguous`); return parsed.objects[0]; }

assert.deepEqual(disabledRuleIds(parseRelevantObjects("{ id: `region`, enabled: false }").objects[0]), ['region']);
assert.deepEqual(disabledRuleIds(parseRelevantObjects("{ 'enabled': false, \"id\": \"region\" }").objects[0]), ['region']);
assert.deepEqual(disabledRuleIds(parseRelevantObjects("{ note: \"id: 'color-contrast'\", id: 'region', enabled: false }").objects[0]), ['region']);
assert.deepEqual(disabledRuleIds(parseRelevantObjects("// { id: 'region', enabled: false }\n{ id: 'region', enabled: true }").objects[0]), []);
assert.equal(staticStrings(analyzeA11y("a11y: { test: 'error' }", 'single-quoted test'), 'test')[0], 'error');
assert.equal(staticStrings(analyzeA11y('a11y: { test: "error" }', 'double-quoted test'), 'test')[0], 'error');
assert.equal(staticStrings(analyzeA11y('a11y: { test: `error` }', 'template test'), 'test')[0], 'error');
assert.equal(staticStrings(analyzeA11y("a11y: {/* test: 'error' */ test: 'warn' }", 'commented test'), 'test')[0], 'warn');
assert.equal(hasBoolean(analyzeA11y("a11y: { note: 'disable: true' }", 'string disable'), 'disable', true), false);
assert.equal(hasBoolean(analyzeA11y('a11y: { config: { rules: [] }, disable: true }', 'nested disable'), 'disable', true), true);
assert.deepEqual(disabledRuleIds(parseRelevantObjects("{ rules: [{ id: 'color-contrast', enabled: false }, { id: 'color-contrast', enabled: false }] }").objects[0]), ['color-contrast', 'color-contrast']);
assert.throws(() => analyzeA11y('a11y: { test: `er${dynamic}` }', 'dynamic test'), /dynamic policy values/);

const previewSource = readFileSync(path.join(frontendDir, '.storybook', 'preview.ts'), 'utf8');
const previewA11y = analyzeA11y(previewSource, 'preview');
assert.deepEqual(staticStrings(previewA11y, 'test'), ['error'], 'project-level a11y tests must remain exactly error');
assert.equal(hasBoolean(previewA11y, 'disable', true), false, 'project-level a11y must not be blanket-disabled');
assert.deepEqual(disabledRuleIds(previewA11y), ['color-contrast'], 'global disabled rules must be exactly the approved exception');

function collectStoryFiles(directory) { return readdirSync(directory).flatMap((entry) => { const filePath = path.join(directory, entry); const stats = statSync(filePath); if (stats.isDirectory()) return collectStoryFiles(filePath); return entry.endsWith('.stories.tsx') ? [filePath] : []; }); }
const storyFiles = collectStoryFiles(path.join(frontendDir, 'src'));
const storyDisabledRules = [];
for (const storyPath of storyFiles) {
  const source = readFileSync(storyPath, 'utf8');
  const a11y = parseRelevantObjects(source, 'a11y');
  assert.equal(a11y.diagnostics.length, 0, `${path.relative(frontendDir, storyPath)}: malformed/ambiguous policy: ${a11y.diagnostics.join('; ')}`);
  for (const block of a11y.objects) assert.equal(hasBoolean(block, 'disable', true), false, `${path.relative(frontendDir, storyPath)} must not blanket-disable a11y tests`);
  const { tokens } = lex(source);
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type !== '{') continue;
    const diagnostics = [];
    const parsed = parseObject(tokens, index, diagnostics);
    const ids = staticStrings(parsed.node, 'id');
    const hasEnabled = objectProperties(parsed.node, 'enabled').length > 0;
    if (ids.length > 0 || hasEnabled) {
      assert.equal(dynamicPolicyFields(parsed.node).filter((key) => key === 'id' || key === 'enabled').length, 0, `${path.relative(frontendDir, storyPath)}: dynamic rule policy is ambiguous`);
      storyDisabledRules.push(...disabledRuleIds(parsed.node));
    }
  }
}
assert.equal(storyDisabledRules.filter((rule) => rule !== 'color-contrast').length, 0, 'all axe rules other than color-contrast must remain enabled');
console.log(`Storybook a11y contract passed (${storyFiles.length} story files checked)`);
