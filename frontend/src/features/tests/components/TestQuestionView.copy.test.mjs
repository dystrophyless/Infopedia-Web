import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const componentPath = path.resolve(import.meta.dirname, 'TestQuestionView.tsx');
const componentSource = readFileSync(componentPath, 'utf8');
const requiredKeys = [
  'backToTests',
  'questionProgress',
  'questionCounter',
  'answerOptions',
  'explanationTitle',
  'checkAnswerButton',
  'nextQuestionButton',
];

assert.doesNotMatch(componentSource, /Р[^"]{1,4}Р/, 'TestQuestionView must not ship mojibake fallback copy');
for (const key of requiredKeys) {
  assert.match(componentSource, new RegExp(`tests\\.${key}`), `TestQuestionView should translate tests.${key}`);
}

for (const language of ['ru', 'kk']) {
  const localePath = path.resolve(import.meta.dirname, '../../../locales', language, 'translation.json');
  const locale = JSON.parse(readFileSync(localePath, 'utf8'));
  for (const key of requiredKeys) {
    assert.equal(typeof locale.tests?.[key], 'string', `${language} locale should define tests.${key}`);
    assert.notEqual(locale.tests[key].trim(), '', `${language} locale tests.${key} should not be empty`);
  }
}

console.log('TestQuestionView copy contract passed');
