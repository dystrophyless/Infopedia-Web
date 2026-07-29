import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const patternsDir = import.meta.dirname;
const pattern = readFileSync(path.resolve(patternsDir, 'MobilePinnedAppBar.tsx'), 'utf8');
const frame = readFileSync(path.resolve(patternsDir, 'MobilePageFrame.tsx'), 'utf8');

assert.match(pattern, /export interface MobilePinnedAppBarProps/);
assert.match(pattern, /Omit<MobileAppBarProps, 'tone' \| 'size' \| 'safeArea' \| 'sticky' \| 'className'>/);
assert.match(pattern, /scrollRootRef\?: RefObject<HTMLElement \| null>/);
assert.match(pattern, /IntersectionObserver/);
assert.match(pattern, /fixed inset-x-0 top-0 z-sticky h-\[120px\] bg-surface pt-20 px-4 pb-4 border-b border-solid border-\[rgb\(213_211_217\)\]/);
assert.equal((pattern.match(/<MobileAppBar\b/g) ?? []).length, 1);
assert.doesNotMatch(frame, /IntersectionObserver/);
assert.doesNotMatch(frame, /appBarPinned/);
assert.match(frame, /<MobilePinnedAppBar/);
