import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const read = (relativePath) => readFileSync(path.resolve(srcDir, relativePath), 'utf8');

const navigationPolicyPath = path.resolve(srcDir, 'features/navigation/model/mobileBottomNavPolicy.ts');
const navigationContextPath = path.resolve(srcDir, 'features/navigation/MobileShellContext.tsx');
assert.ok(existsSync(navigationPolicyPath), 'Navigation policy should exist as a feature-level module');
assert.ok(existsSync(navigationContextPath), 'Mobile shell context should own route-local registrations');

const layoutSource = read('components/Layout.tsx');
const navSource = read('components/MobileBottomNav.tsx');
const contextSource = read('features/navigation/MobileShellContext.tsx');
const semanticSource = read('pages/SemanticSearch.tsx');
const semanticSearchPolicySource = read('features/navigation/model/semanticSearchNavPolicy.ts');
const analyzeSource = read('pages/Analyze.tsx');
const practiceSource = read('pages/PracticeByTopicPage.tsx');
const profileSource = read('pages/Profile.tsx');
const subscriptionSource = read('pages/Subscription.tsx');
const termPageSource = read('pages/TermDetail.tsx');
const termViewSource = read('features/terms/components/TermDetailView.tsx');

assert.match(layoutSource, /MobileShellProvider/, 'Layout should mount the shell provider');
assert.match(layoutSource, /useMobileBottomNavDecision/, 'Layout should consume one shared shell decision');
assert.match(layoutSource, /decision\.visible\s*&&\s*<MobileBottomNav\s+activeItem=\{decision\.activeItem\}\s*\/>/, 'Nav visibility and active item should come from the shared decision');
assert.match(layoutSource, /max-md:\[--mobile-page-available-height:100dvh\]/, 'Hidden shell should expose the full mobile viewport');
assert.match(layoutSource, /max-md:\[--mobile-page-available-height:calc\(100dvh-var\(--shell-mobile-bottom-nav-height\)\)\]/, 'Visible shell should subtract exactly the 88px reserve');
assert.match(layoutSource, /decision\.visible\s*\?\s*'[^']*max-md:pb-\[var\(--shell-mobile-bottom-nav-height\)\]'\s*:\s*'[^']*max-md:pb-0'/, 'The same decision should switch the page reserve');
assert.match(contextSource, /routeKey/, 'Shell registrations should be bound to the current route key');
assert.match(contextSource, /token/, 'Shell registrations should have owner tokens');
assert.match(contextSource, /registration\.token !== token/, 'Cleanup should only remove the registration that owns the token');
assert.match(contextSource, /candidate\.routeKey === routeKey/, 'Stale registrations from another route must not affect the current route');

assert.match(navSource, /activeItem\s*:/, 'MobileBottomNav should receive the active item from Layout');
assert.doesNotMatch(navSource, /useLocation|location\.pathname\.startsWith\('\/tests'\)/, 'MobileBottomNav should not derive route activity locally');
assert.match(navSource, /activeItem\s*===\s*'search'/, 'Search styling should use the shared active item');

assert.match(semanticSource, /useMobileBottomNavOverride/, 'SemanticSearch should register its in-flight state with the shell');
assert.match(semanticSource, /isSemanticSearchMobileNavHidden/, 'SemanticSearch should use a terminal-aware mobile navigation predicate');
assert.match(semanticSource, /terminalResult:\s*result/, 'SemanticSearch should pass the SSE result to its terminal-aware predicate');
assert.doesNotMatch(semanticSource, /submitting\s*\|\|\s*Boolean\(taskId\s*&&\s*isLoading\)/, 'SemanticSearch should not show navigation merely because transport loading ended');
assert.match(semanticSearchPolicySource, /terminalResult\?\.task_id\s*===\s*taskId/, 'SemanticSearch terminal state should belong to the active task');
assert.match(semanticSearchPolicySource, /new Set\(\['success',\s*'failure'\]\)/, 'SemanticSearch should require explicit success or failure terminal status');

assert.match(analyzeSource, /useMobileBottomNavOverride/, 'Analyze should register its task state with the shell');
assert.match(analyzeSource, /!isLatestView\s*&&\s*\(submitting\s*\|\|\s*Boolean\(taskId\s*&&\s*!isTerminal\)\)/, 'Analyze hide predicate should keep nonterminal tasks hidden even after transport errors');
const analyzeNavPredicate = analyzeSource.match(/const mobileNavHidden =[^;]+;/)?.[0] ?? '';
assert.ok(analyzeNavPredicate, 'Analyze should expose one mobile navigation predicate');
assert.doesNotMatch(analyzeNavPredicate, /pollError/, 'Analyze transport errors must not make a nonterminal task navigable');

assert.match(practiceSource, /useMobileBottomNavOverride/, 'Practice should register ready/loading state with the shell');
assert.match(practiceSource, /data\.state\s*===\s*'ready'[\s\S]*activeItem:\s*'tests'/, 'Ready Practice should show the Tests active item');

assert.match(profileSource, /useMobileBottomNavOverride/, 'Profile should register nested settings state with the shell');
assert.match(profileSource, /activeTab\s*===\s*'settings'[\s\S]*settingsView\s*===\s*'account'[\s\S]*settingsView\s*===\s*'username'[\s\S]*settingsView\s*===\s*'password'/, 'Profile should hide only nested account/username/password branches');

assert.match(subscriptionSource, /planTouched/, 'Subscription should track whether a plan radio was touched');
assert.match(subscriptionSource, /setPlanTouched\(true\)/, 'Any plan interaction should mark Subscription state as touched');
assert.match(subscriptionSource, /const mobileNavHidden = planTouched/, 'Subscription should hide shell after plan interaction');
assert.match(subscriptionSource, /data-subscription-cta[^>]*type="button"[^>]*disabled/, 'Unavailable subscription action should remain disabled without payment flow');

assert.match(termPageSource, /useMobileBottomNavDecision/, 'TermDetail should read the shared shell decision');
assert.match(termPageSource, /bottomNavVisible=\{decision\.visible\}/, 'TermDetail should pass shared visibility to its view');
assert.match(termViewSource, /bottomNavVisible/, 'TermDetailView CTA should depend on shared visibility, not authentication');
assert.match(termViewSource, /bottomNavVisible\s*\?\s*'max-md:bottom-\[128px\]'\s*:\s*'max-md:bottom-10'/, 'Term CTA should use responsive 128px/40px offsets based on nav visibility');
assert.match(termViewSource, /<button[^>]*disabled[^>]*aria-disabled="true"/, 'Term CTA should remain a native disabled control while the action is unavailable');
assert.match(termViewSource, /max-md:fixed[^"]*md:hidden/, 'Term CTA should be fixed only on mobile and hidden on desktop');

for (const relativePath of [
  'features/tests/components/TestsHubView.tsx',
  'features/tests/components/TestQuestionView.tsx',
  'features/tests/components/TestStatusView.tsx',
  'features/tests/components/TestResultView.tsx',
  'features/tests/components/PracticeByTopicView.tsx',
]) {
  const source = read(relativePath);
  assert.doesNotMatch(source, /min-h-\[calc\(100dvh-88px\)\]/, `${relativePath} should not subtract shell chrome locally`);
  assert.match(source, /var\(--mobile-page-available-height,100dvh\)/, `${relativePath} should use the shared available-height variable`);
}
