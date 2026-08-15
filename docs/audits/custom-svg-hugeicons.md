# Custom SVG and HugeIcons audit

Audit date: 2026-08-15. Scope: the whole repository, excluding `node_modules`, `.git`, `.venv`, `dist`, `build`, `storybook-static`, `coverage`, caches, and `test-results`.

## Method and totals

The scan covered physical `*.svg` files, JSX/HTML inline `<svg>`, `*.svg?react`, `data:image/svg+xml`, and CSS/Tailwind `url()`, background, and mask forms. It found:

- 22 unique physical SVG entities;
- 0 inline JSX/HTML SVG entities outside the physical files themselves;
- 7 `?react` references, all pointing to entities already counted below;
- 0 SVG data URIs;
- 3 runtime SVG-mask consumers (the duplicated standard/WebKit declarations are one consumer each).

Status totals: 9 `replace`, 7 `unused`, 2 `needs-user-selection`, 2 `keep-brand`, 1 `keep-decoration`, and 1 `keep-data-viz`.

Figma exports are generated-origin assets, but their status below reflects the runtime decision rather than double-counting them as `generated`. No standalone vendor-only, generated-only, or test-fixture-only SVG entity remains in the included tree. Test assertions, manifests, and detector regexes that merely mention an SVG are reference-only usage sites, not separate SVG entities.

Exact export candidates were verified against the installed `@hugeicons/core-free-icons@4.2.2`. A “search name” is intentionally not claimed as an installed exact export.

## Entity inventory

### 1. Document attachment

- Asset: `frontend/public/figma-document-attachment.svg:1`
- Usage sites: none.
- Visual/form: 32×32 outlined document with two text lines and a paperclip; standalone public asset.
- Origin/category: Figma export; product icon.
- HugeIcons candidate: `DocumentAttachmentIcon` (verified export).
- Confidence: High — the installed export has the same named document-plus-attachment metaphor.
- Status: `unused` — remove in a separate cleanup or use the verified icon if the flow returns.

### 2. User AI

- Asset: `frontend/public/figma-user-ai.svg:1`
- Usage sites: `frontend/src/features/analyze/components/AnalyzeDesktopUploadGuide.tsx:332`.
- Visual/form: 32×32 outlined user in a circle with an AI sparkle; public `<img>`.
- Origin/category: Figma export; product icon.
- HugeIcons candidate: `UserAiIcon` (verified export).
- Confidence: High — exact concept and export name match.
- Status: `replace`.

### 3. Browser controls

- Asset: `frontend/public/figma/analyze-desktop/browser-controls.svg:1`
- Usage sites: `frontend/src/features/analyze/components/AnalyzeDesktopUploadGuide.tsx:117`.
- Visual/form: three neutral 8px circles arranged horizontally; public `<img>`.
- Origin/category: Figma export; decorative browser-window chrome.
- HugeIcons candidate: none; this is layout decoration, not an icon glyph.
- Confidence: High — replacing three exact dots with a semantic icon would change the composition.
- Status: `keep-decoration`.

### 4. Google mark

- Asset: `frontend/public/figma/onboarding/google-black-icon.svg:1`
- Runtime usage: `frontend/src/components/AuthShell.tsx:379`.
- Reference-only sites: `frontend/public/figma/onboarding/manifest.json:5`, `frontend/src/pages/Onboarding.desktop.visual.mjs:149`, `frontend/src/pages/Onboarding.desktop.test.mjs:28`, `frontend/src/pages/Onboarding.desktop.test.mjs:147`.
- Visual/form: 16×16 filled Google “G” mark in product purple; public `<img>`.
- Origin/category: third-party brand asset exported from Figma.
- HugeIcons candidate: none; a generic Google/social glyph would not preserve the approved brand artwork.
- Confidence: High — brand marks should not be substituted by a general UI icon library.
- Status: `keep-brand`.

### 5. Test lock

- Asset: `frontend/public/figma/tests/lock-keyhole.svg:1`
- Runtime usage: `frontend/src/features/tests/components/DesktopTestOptionCard.tsx:29`.
- Reference-only site: `frontend/src/pages/Tests.desktop.figma.test.mjs:18`.
- Visual/form: 24×24 white outlined padlock with circular keyhole; public `<img>`.
- Origin/category: Figma export; product icon.
- HugeIcons candidate: `LockKeyIcon` (verified export).
- Confidence: Medium — the lock/key metaphor is direct, but visual parity should confirm its keyhole proportions.
- Status: `replace`.

### 6. Test target

- Asset: `frontend/public/figma/tests/target-03.svg:1`
- Runtime usage: `frontend/src/features/tests/components/DesktopTestOptionCard.tsx:23`.
- Reference-only site: `frontend/src/pages/Tests.desktop.figma.test.mjs:19`.
- Visual/form: 24×24 white outlined three-ring bullseye; public `<img>`.
- Origin/category: Figma export; product icon.
- HugeIcons candidate: `Target03Icon` (verified export).
- Confidence: High — exact Figma group name and installed export name match.
- Status: `replace`.

### 7. Test trend arrow

- Asset: `frontend/public/figma/tests/trending-up.svg:1`
- Runtime usage: `frontend/src/features/tests/components/DesktopChapterTestCard.tsx:120` (CSS mask; standard and WebKit declarations are one usage).
- Reference-only site: `frontend/src/pages/Tests.desktop.figma.test.mjs:20`.
- Visual/form: 20×20 zig-zag trend arrow; recolored by `currentColor` through a mask and mirrored for the opposite direction.
- Origin/category: Figma export; product icon/mask.
- HugeIcons candidate: `ChartUpIcon` (verified export).
- Confidence: Medium — the semantic match is strong, but mirroring and current-color rendering need visual confirmation.
- Status: `replace`.

### 8. Infopedia logo

- Asset: `frontend/public/logo.svg:1`
- Runtime usages: `frontend/index.html:5`, `frontend/src/components/Navbar.tsx:17`, `frontend/src/components/MobileRouteSplash.tsx:39`, `frontend/src/components/DesktopSidebar.tsx:137`, `frontend/src/components/AuthShell.tsx:50`, `frontend/src/components/AuthShell.tsx:65`, `frontend/src/components/AuthShell.tsx:172`, `frontend/src/pages/Landing.tsx:437`.
- Reference-only site: `frontend/src/pages/AdaptiveOutcomeStates.visual.mjs:186`.
- Visual/form: 170×44 filled Infopedia logomark and wordmark; favicon and `<img>`.
- Origin/category: first-party brand identity.
- HugeIcons candidate: none.
- Confidence: High — a brand wordmark is outside HugeIcons’ replacement scope.
- Status: `keep-brand`.

### 9. AI co-editing

- Asset: `frontend/src/assets/figma-profile/ai-co-editing.svg:1`
- Runtime usages: `frontend/src/components/DesktopSidebar.tsx:17`, `frontend/src/components/DesktopSidebar.tsx:195`, `frontend/src/components/DesktopSidebar.tsx:199`, `frontend/src/pages/Profile.tsx:48`, `frontend/src/pages/Profile.tsx:488`, `frontend/src/pages/Profile.tsx:2169`, `frontend/src/pages/Profile.tsx:2170`, `frontend/src/pages/Subscription.tsx:15`, `frontend/src/pages/Subscription.tsx:135`.
- Reference-only sites: `frontend/src/pages/Profile.figma-mobile.test.mjs:15`, `frontend/src/pages/Profile.figma-mobile.test.mjs:72`, `frontend/src/pages/Profile.figma-mobile.test.mjs:80`, `frontend/src/pages/Profile.figma-mobile.test.mjs:83`, `frontend/src/pages/Profile.desktop-settings.contract.test.mjs:50`.
- Visual/form: 32×32 two users collaborating around an AI sparkle; `<img>` plus recolored CSS masks.
- Origin/category: Figma export; premium/product concept icon.
- HugeIcons candidate: `AiUserIcon` or `UserMultipleIcon` (both verified exports); search name “AI collaboration”.
- Confidence: Low — neither verified export is known to combine both collaboration and AI in this exact composition.
- Status: `needs-user-selection`.

### 10. Languages

- Asset: `frontend/src/assets/figma-profile/languages.svg:1`
- Runtime usages: `frontend/src/pages/Profile.tsx:49`, `frontend/src/pages/Profile.tsx:2124`.
- Reference-only sites: `frontend/src/pages/Profile.desktop-settings.contract.test.mjs:48`, `frontend/src/pages/Profile.desktop-settings.contract.test.mjs:49`.
- Visual/form: 20×20 outlined multilingual characters; imported URL rendered as `<img>`.
- Origin/category: Figma export; settings icon.
- HugeIcons candidate: `TranslateIcon` (verified export).
- Confidence: High — the icon encodes the same multilingual A/character translation metaphor.
- Status: `replace`.

### 11. Mobile profile avatar

- Asset: `frontend/src/assets/figma-profile/profile-1.svg:1`
- Runtime usages: `frontend/src/pages/Profile.tsx:47`, `frontend/src/pages/Profile.tsx:472`.
- Reference-only sites: `frontend/src/pages/Profile.figma-mobile.test.mjs:79`, `frontend/src/pages/Profile.figma-mobile.test.mjs:82`.
- Visual/form: 64×64 filled circular anonymous-user avatar; imported URL rendered as `<img>`.
- Origin/category: Figma export; product icon.
- HugeIcons candidate: `UserCircleIcon` (verified export).
- Confidence: Medium — the metaphor and outline are direct, while the current asset’s filled silhouette may need a deliberate HugeIcons variant/weight choice.
- Status: `replace`.

### 12. Subscription day 6

- Asset: `frontend/src/assets/figma-subscription/timeline-day-6.svg:1`
- Runtime usages: `frontend/src/pages/Subscription.tsx:17`, `frontend/src/pages/Subscription.tsx:129`, rendered by the timeline `<img>` map in `frontend/src/pages/Subscription.tsx:139`.
- Reference-only site: `frontend/src/pages/Subscription.contract.test.mjs:29`.
- Visual/form: 24×24 pale circular badge containing an outlined credit card; imported URL rendered as `<img>`.
- Origin/category: Figma export; timeline icon with decorative badge.
- HugeIcons candidate: `CreditCardIcon` (verified export) inside the existing CSS circle treatment.
- Confidence: High — the inner glyph is a direct match; the circle remains CSS decoration.
- Status: `replace`.

### 13. Subscription day 7

- Asset: `frontend/src/assets/figma-subscription/timeline-day-7.svg:1`
- Runtime usages: `frontend/src/pages/Subscription.tsx:18`, `frontend/src/pages/Subscription.tsx:129`, rendered by the timeline `<img>` map in `frontend/src/pages/Subscription.tsx:139`.
- Reference-only site: `frontend/src/pages/Subscription.contract.test.mjs:29`.
- Visual/form: 24×24 pale circular badge containing an outlined notification bell; imported URL rendered as `<img>`.
- Origin/category: Figma export; timeline icon with decorative badge.
- HugeIcons candidate: `Notification01Icon` (verified export) inside the existing CSS circle treatment.
- Confidence: High — the Figma group is named `notification-01`, matching the installed export.
- Status: `replace`.

### 14. Subscription today

- Asset: `frontend/src/assets/figma-subscription/timeline-today.svg:1`
- Runtime usages: `frontend/src/pages/Subscription.tsx:16`, `frontend/src/pages/Subscription.tsx:129`, rendered by the timeline `<img>` map in `frontend/src/pages/Subscription.tsx:139`.
- Reference-only site: `frontend/src/pages/Subscription.contract.test.mjs:29`.
- Visual/form: 24×24 pale circular badge containing a user plus key; imported URL rendered as `<img>`.
- Origin/category: Figma export; timeline icon with decorative badge.
- HugeIcons candidate: search name “user key” or compose `UserAccountIcon` with `Key01Icon` (both verified exports); there is no installed `UserKeyIcon` export.
- Confidence: Low — composition would be custom and a single exact export was not found.
- Status: `needs-user-selection`.

### 15. Feature analytics

- Asset: `frontend/src/assets/icons/feature-analytics.svg:1`
- Reference-only usage: `frontend/src/components/FigmaIcons.tsx:7` (`FigmaFeatureAnalyticsIcon` re-export); no consumer of that symbol was found.
- Visual/form: 24×21 four-line vertical bar chart; SVGR `?react` component.
- Origin/category: custom product icon.
- HugeIcons candidate: `Analytics01Icon` (verified export).
- Confidence: Medium — semantic match is direct, but the custom baseline-plus-bars geometry differs.
- Status: `unused`.

### 16. Feature description

- Asset: `frontend/src/assets/icons/feature-description.svg:1`
- Reference-only usage: `frontend/src/components/FigmaIcons.tsx:6` (`FigmaFeatureDescriptionIcon` re-export); no consumer of that symbol was found.
- Visual/form: 21×18 three left-aligned text lines; SVGR `?react` component.
- Origin/category: custom product icon.
- HugeIcons candidate: `TextAlignLeft01Icon` (verified export).
- Confidence: High — same three-line text-alignment metaphor.
- Status: `unused`.

### 17. Feature search

- Asset: `frontend/src/assets/icons/feature-search.svg:1`
- Reference-only usage: `frontend/src/components/FigmaIcons.tsx:5` (`FigmaFeatureSearchIcon` re-export); no consumer of that symbol was found.
- Visual/form: 21×21 magnifying glass; SVGR `?react` component.
- Origin/category: custom product icon.
- HugeIcons candidate: `Search01Icon` (verified export).
- Confidence: High — direct standard search glyph.
- Status: `unused`.

### 18. Desktop profile glyph

- Asset: `frontend/src/assets/icons/profile.svg:1`
- Runtime usages: `frontend/src/components/FigmaIcons.tsx:1`, `frontend/src/pages/Profile.tsx:46`, `frontend/src/pages/Profile.tsx:1501`.
- Reference-only sites: `frontend/src/components/Navbar.active-state.test.mjs:23`, `frontend/src/pages/Profile.desktop-workspace.contract.test.mjs:12`, `frontend/src/pages/Profile.desktop-shell.contract.test.mjs:41`.
- Visual/form: 82×82 circular user silhouette with CSS-variable color; SVGR `?react` component.
- Origin/category: custom product icon.
- HugeIcons candidate: `UserCircleIcon` (verified export).
- Confidence: Medium — concept is exact, but the current large filled silhouette differs from the default stroke treatment.
- Status: `replace`.

### 19. Stat books

- Asset: `frontend/src/assets/icons/stat-books.svg:1`
- Reference-only usage: `frontend/src/components/FigmaIcons.tsx:2` (`FigmaStatBooksIcon` re-export); no consumer of that symbol was found.
- Visual/form: 55×80 two-tone folded book/document illustration; SVGR `?react` component.
- Origin/category: custom product illustration.
- HugeIcons candidate: `Book02Icon` (verified export).
- Confidence: Low — the candidate preserves meaning but not the custom two-tone dimensional illustration.
- Status: `unused`.

### 20. Stat terms

- Asset: `frontend/src/assets/icons/stat-terms.svg:1`
- Reference-only usage: `frontend/src/components/FigmaIcons.tsx:4` (`FigmaStatTermsIcon` re-export); no consumer of that symbol was found.
- Visual/form: 55×80 two-tone tag/document with three text lines; SVGR `?react` component.
- Origin/category: custom product illustration.
- HugeIcons candidate: `File02Icon` (verified export); search name “tag document text” for a closer metaphor.
- Confidence: Low — no verified single export was confirmed to preserve both tag and document semantics.
- Status: `unused`.

### 21. Stat topics

- Asset: `frontend/src/assets/icons/stat-topics.svg:1`
- Reference-only usage: `frontend/src/components/FigmaIcons.tsx:3` (`FigmaStatTopicsIcon` re-export); no consumer of that symbol was found.
- Visual/form: 60×80 two layered two-tone documents; SVGR `?react` component.
- Origin/category: custom product illustration.
- HugeIcons candidate: `Files02Icon` (verified export).
- Confidence: Medium — layered-files semantics match, but not the custom filled geometry.
- Status: `unused`.

### 22. Test result score ring

- Asset: `frontend/src/features/tests/figma/assets/result-score-ring.svg:1`
- Runtime usages: `frontend/src/features/tests/components/DesktopTestResultView.tsx:7`, `frontend/src/features/tests/components/DesktopTestResultView.tsx:31`.
- Reference-only sites: `frontend/src/features/tests/figma/assets/manifest.json:4`, `frontend/src/features/tests/figma/desktop-runner.figma.test.mjs:76`.
- Visual/form: 144×144 two-layer circular progress ring with rounded active stroke; imported URL rendered as `<img>` behind a live numeric score.
- Origin/category: Figma export; data visualization.
- HugeIcons candidate: none; `ChartRingIcon` is an icon glyph, not a value-bearing progress visualization.
- Confidence: High — replacing this with a static icon would lose the visualized score contract.
- Status: `keep-data-viz`.

## Replacement order

The lowest-risk replacements are `UserAiIcon`, `Target03Icon`, `TranslateIcon`, `CreditCardIcon`, `Notification01Icon`, and `Search01Icon`. The profile/avatar and trend/lock candidates need screenshot comparison because their stroke/fill treatment differs. AI co-editing and user-key should not be replaced until a user-selected HugeIcons glyph or approved composition exists.
