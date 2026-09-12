import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pageDir = import.meta.dirname;
const attemptPage = readFileSync(path.resolve(pageDir, 'UntAnalysisPage.tsx'), 'utf8');
const datePage = readFileSync(path.resolve(pageDir, 'UntAnalysisDatePage.tsx'), 'utf8');
const stories = readFileSync(path.resolve(pageDir, 'UntAnalysisPage.stories.tsx'), 'utf8');

assert.match(
  attemptPage,
  /min-h-screen[^\"]*md:min-h-\[1080px\]/,
  'attempt page should use the viewport height on mobile and preserve the Figma canvas height on desktop',
);
assert.match(
  attemptPage,
  /min-w-0[^\"]*overflow-x-clip/,
  'attempt page should keep its responsive content rail from creating horizontal overflow',
);
assert.match(
  attemptPage,
  /min-h-\[96px\][^\"]*px-4[^\"]*md:px-8/,
  'attempt rows should reduce their mobile inset while preserving the desktop Figma spacing',
);
assert.match(
  attemptPage,
  /min-w-0[\s\S]*break-words/,
  'attempt copy should be allowed to wrap inside a shrinking row',
);

assert.match(
  datePage,
  /min-h-screen[^\"]*md:min-h-\[1080px\]/,
  'date page should use the viewport height on mobile and preserve the Figma canvas height on desktop',
);
assert.match(
  datePage,
  /className=\"flex w-full flex-col[^\"]*xl:flex-row[^\"]*\" data-unt-analysis-date-panels/,
  'date panels should stack until the content rail is wide enough for the desktop composition',
);
assert.match(
  datePage,
  /className=\"flex w-full[^\"]*xl:w-\[373px\][^\"]*\" data-unt-analysis-calendar/,
  'calendar should fill the mobile rail and keep its 373px desktop width',
);
assert.match(
  datePage,
  /className=\"grid w-full grid-cols-7[^\"]*xl:gap-x-\[7\.5px\]/,
  'calendar cells should use fluid grid tracks and preserve the desktop grid gap',
);
assert.match(
  datePage,
  /md:max-w-\[373px\][^\"]*md:self-center/,
  'stacked tablet calendars should retain the Figma grid width instead of stretching date cells',
);
assert.match(
  datePage,
  /className=\"flex h-auto min-h-\[220px\][^\"]*xl:h-\[220px\][^\"]*\" data-unt-analysis-date-why/,
  'explanation card should grow with localized mobile copy but keep the desktop height',
);
assert.match(
  datePage,
  /className=\"flex w-full flex-wrap[^\"]*justify-between[^\"]*gap-3\" data-unt-analysis-date-actions/,
  'date actions should wrap instead of overflowing on narrow rails',
);

for (const story of [
  'MobileDefault',
  'MobileJanuaryCalendar',
  'MobileJanuaryCalendar24thSelected',
  'DesktopNarrow',
]) {
  assert.match(stories, new RegExp(`export const ${story}`), `Storybook should expose ${story}`);
}
assert.match(stories, /mobile320/, 'responsive stories should cover the narrowest supported mobile viewport');
assert.match(stories, /mobile430/, 'responsive stories should cover the Figma mobile viewport');
assert.match(stories, /desktop1024/, 'responsive stories should cover a narrow desktop viewport');

console.log('UNT analysis responsive contracts passed');
