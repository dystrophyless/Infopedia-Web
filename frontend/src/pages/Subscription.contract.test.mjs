import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
const dir = import.meta.dirname;
const source = readFileSync(path.resolve(dir, 'Subscription.tsx'), 'utf8');
const app = readFileSync(path.resolve(dir, '../App.tsx'), 'utf8');
const profile = readFileSync(path.resolve(dir, 'Profile.tsx'), 'utf8');
assert.match(source, /MobilePageFrame[\s\S]*contentClassName="!pt-\[26px\]"/);
assert.match(source, /title:\s*<span className="text-\[16px\] font-medium leading-\[16px\] text-\[#252329\]">\{t\('profile\.subscriptionTitle'\)\}<\/span>/);
assert.match(source, /navigate\('\/profile'\)/);
assert.match(source, /function SubscriptionPlanCard/);
assert.match(source, /type="radio"/);
assert.match(source, /import \{ ArrowLeft01Icon, CheckIcon, Tick02Icon \} from '@hugeicons\/core-free-icons';/);
assert.match(source, /selected && <HugeiconsIcon icon=\{CheckIcon\} size=\{14\} \/>/);
assert.doesNotMatch(source, /selected && <HugeiconsIcon icon=\{CheckIcon\} \/>/);
assert.doesNotMatch(source, /✓/);
assert.doesNotMatch(source, /selected && <span className="text-\[14px\] leading-none">/);
assert.doesNotMatch(source, /ChoiceGroup|RadioOption/);
assert.match(source, /useState<Plan>\('annual'\)/);
for (const text of ['2490₸', '9900₸', '-67%', '#EFEBF6', '#252329', '#A585DB', '#F8F5FC', '#DED2F1', '#EFEAF8', '#6A37C3']) assert.match(source, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.doesNotMatch(source, /-60%/);
assert.doesNotMatch(source, /1490|17880|−40|Infopedia Premium/);
assert.equal((source.match(/h-px w-full bg-\[#EFEAF8\]/g) ?? []).length, 3);
for (const asset of ['timeline-today.svg', 'timeline-day-6.svg', 'timeline-day-7.svg']) {
  const assetPath = path.resolve(dir, `../assets/figma-subscription/${asset}`);
  assert.ok(existsSync(assetPath)); assert.ok(statSync(assetPath).size > 500); assert.match(source, new RegExp(asset.replace('.', '\\.')));
}
assert.doesNotMatch(source, /https:\/\/www\.figma\.com\/api\/mcp\/asset/);
for (const key of ['subscriptionPurchase', 'subscriptionPremiumTitle', 'subscriptionTimelineToday', 'subscriptionTimelineDay6', 'subscriptionTimelineDay7', 'subscriptionBenefitsEyebrow', 'subscriptionBenefitPlan', 'subscriptionBenefitTests', 'subscriptionBenefitTopics']) assert.match(source, new RegExp(key));
assert.match(source, /aria-live="polite"/); assert.doesNotMatch(source, /fetch\(|axios\.|localStorage|sessionStorage/);
assert.match(app, /path="\/subscription"[\s\S]*<Protected>[\s\S]*<Subscription\s*\/>/); assert.match(profile, /navigate\('\/subscription'\)/);
for (const localeName of ['ru', 'kk']) { const raw = readFileSync(path.resolve(dir, `../locales/${localeName}/translation.json`), 'utf8'); const keys = [...raw.matchAll(/^\s+"(subscription[A-Za-z0-9]+)"\s*:/gm)].map(m => m[1]); assert.equal(keys.length, new Set(keys).size, `${localeName} duplicate subscription keys`); assert.match(raw, /"subscriptionDiscount": "-67%"/); assert.doesNotMatch(raw, /"subscriptionDiscount": "-60%"/); }
console.log('Subscription contract passed');
