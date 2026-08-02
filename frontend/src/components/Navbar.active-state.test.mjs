import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const navbarSource = readFileSync(path.resolve(import.meta.dirname, 'Navbar.tsx'), 'utf8');
const layoutSource = readFileSync(path.resolve(import.meta.dirname, 'Layout.tsx'), 'utf8');
const ru = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../locales/ru/translation.json'), 'utf8'));
const kk = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../locales/kk/translation.json'), 'utf8'));

assert.match(
  navbarSource,
  /href="#tools"[\s\S]*nav\.features[\s\S]*href="#featured-terms"[\s\S]*nav\.termBase[\s\S]*to="\/subscription"[\s\S]*nav\.subscription/,
  'Landing guest navbar should expose the three Figma actions in order',
);
assert.match(
  navbarSource,
  /px-\[70px\]/,
  'Landing guest navbar should use the Figma 70px desktop inset',
);
assert.match(navbarSource, /<header[^>]+max-md:hidden/, 'Guest desktop navbar should remain hidden on mobile');
assert.match(navbarSource, /to="\/login"[\s\S]*h-10[\s\S]*w-\[98px\][\s\S]*rounded-\[16px\]/, 'Guest login should match the Figma 98x40 radius-16 control');
assert.doesNotMatch(navbarSource, /SearchChoiceModal|searchModalOpen|SEARCH_NAV_PATHS/, 'Landing marketing navigation should not retain the superseded search modal action');
assert.doesNotMatch(navbarSource, /useAuthStore|FigmaProfileIcon|<NavLink/, 'Authenticated navigation belongs to DesktopSidebar');
assert.match(layoutSource, /resolveDesktopShell/, 'Layout should own authenticated desktop shell selection');
assert.match(layoutSource, /!authenticated && authHydrated && <Navbar \/>/, 'Navbar should render only for hydrated guests');

for (const key of ['features', 'termBase', 'subscription']) {
  assert.ok(ru.nav[key], `RU locale should define nav.${key}`);
  assert.ok(kk.nav[key], `KK locale should define nav.${key}`);
}
