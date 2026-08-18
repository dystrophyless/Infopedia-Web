import assert from 'node:assert/strict';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';

const frontendRoot = path.resolve(import.meta.dirname, '..', '..');
const config = loadConfig(path.join(frontendRoot, 'tailwind.config.ts'));
const representativeClasses = [
  'bg-primary/12',
  'border-border/45',
  'border-border/55',
  'bg-surface/65',
  'bg-surface/72',
  'text-muted',
  'text-inverse',
  'text-muted/45',
  'text-decorative-muted',
  'text-success',
  'bg-success-surface',
  'text-danger',
  'bg-danger-surface',
  'bg-danger-accent',
  'bg-action-primary/35',
  'text-status-low-foreground',
  'bg-status-review-surface',
  'border-status-good-border',
  'bg-status-excellent-progress',
  'p-ui-6',
  'text-screen-title',
  'text-body',
  'rounded-control',
  'h-control-md',
  'shadow-card',
  'duration-fast',
  'z-overlay',
  '!text-[14px]',
  '!leading-[14px]',
];

const result = await postcss([
  tailwindcss({
    ...config,
    content: [{ raw: `<div class="${representativeClasses.join(' ')}"></div>`, extension: 'html' }],
  }),
]).process('@tailwind utilities;', { from: undefined });

function findRule(className) {
  const selector = `.${className
    .replaceAll('/', '\\/')
    .replaceAll('!', '\\!')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')}`;
  let matchingRule;

  result.root.walkRules((rule) => {
    if (rule.selector === selector) matchingRule = rule;
  });

  assert.ok(matchingRule, `Tailwind did not generate ${selector}`);
  return matchingRule;
}

function assertDeclaration(className, property, expectedValue) {
  const rule = findRule(className);
  const declaration = rule.nodes.find(
    (node) => node.type === 'decl' && node.prop === property && node.value === expectedValue,
  );

  assert.ok(
    declaration,
    `${className} must emit ${property}: ${expectedValue}; received: ${rule.toString()}`,
  );
}

function assertImportantDeclaration(className, property, expectedValue) {
  const rule = findRule(className);
  const declaration = rule.nodes.find(
    (node) => node.type === 'decl' && node.prop === property && node.value === expectedValue && node.important,
  );

  assert.ok(
    declaration,
    `${className} must emit ${property}: ${expectedValue} !important; received: ${rule.toString()}`,
  );
}

assertDeclaration(
  'bg-primary/12',
  'background-color',
  'rgb(var(--color-action-primary-rgb) / 0.12)',
);
assertDeclaration(
  'border-border/45',
  'border-color',
  'rgb(var(--color-border-default-rgb) / 0.45)',
);
assertDeclaration(
  'border-border/55',
  'border-color',
  'rgb(var(--color-border-default-rgb) / 0.55)',
);
assertDeclaration(
  'bg-surface/65',
  'background-color',
  'rgb(var(--color-surface-rgb) / 0.65)',
);
assertDeclaration(
  'bg-surface/72',
  'background-color',
  'rgb(var(--color-surface-rgb) / 0.72)',
);
assertDeclaration(
  'text-muted',
  'color',
  'rgb(var(--color-text-muted-rgb) / var(--tw-text-opacity, 1))',
);
assertDeclaration(
  'text-inverse',
  'color',
  'rgb(var(--color-text-inverse-rgb) / var(--tw-text-opacity, 1))',
);
assertDeclaration(
  'text-muted/45',
  'color',
  'rgb(var(--color-text-muted-rgb) / 0.45)',
);
assertDeclaration(
  'text-decorative-muted',
  'color',
  'rgb(var(--color-decorative-muted-rgb) / calc(0.5 * var(--tw-text-opacity, 1)))',
);
assertDeclaration(
  'text-success',
  'color',
  'rgb(var(--color-success-text-rgb) / var(--tw-text-opacity, 1))',
);
assertDeclaration(
  'bg-success-surface',
  'background-color',
  'rgb(var(--color-success-surface-rgb) / var(--tw-bg-opacity, 1))',
);
assertDeclaration(
  'text-danger',
  'color',
  'rgb(var(--color-danger-text-rgb) / var(--tw-text-opacity, 1))',
);
assertDeclaration(
  'bg-danger-surface',
  'background-color',
  'rgb(var(--color-danger-surface-rgb) / var(--tw-bg-opacity, 1))',
);
assertDeclaration(
  'bg-danger-accent',
  'background-color',
  'rgb(var(--color-danger-accent-rgb) / var(--tw-bg-opacity, 1))',
);
assertDeclaration(
  'bg-action-primary/35',
  'background-color',
  'rgb(var(--color-action-primary-rgb) / 0.35)',
);
assertDeclaration(
  'text-status-low-foreground',
  'color',
  'rgb(var(--color-status-low-foreground-rgb) / var(--tw-text-opacity, 1))',
);
assertDeclaration(
  'bg-status-review-surface',
  'background-color',
  'rgb(var(--color-status-review-surface-rgb) / var(--tw-bg-opacity, 1))',
);
assertDeclaration(
  'border-status-good-border',
  'border-color',
  'rgb(var(--color-status-good-border-rgb) / var(--tw-border-opacity, 1))',
);
assertDeclaration(
  'bg-status-excellent-progress',
  'background-color',
  'rgb(var(--color-status-excellent-progress-rgb) / var(--tw-bg-opacity, 1))',
);
assertDeclaration('p-ui-6', 'padding', 'var(--space-6)');
assertDeclaration('text-screen-title', 'font-size', 'var(--type-screen-title-size)');
assertDeclaration('text-screen-title', 'line-height', 'var(--type-screen-title-line-height)');
assertDeclaration('text-body', 'font-size', 'var(--type-body-size)');
assertDeclaration('text-body', 'line-height', 'var(--type-body-line-height)');
assertDeclaration('rounded-control', 'border-radius', 'var(--radius-control)');
assertDeclaration('h-control-md', 'height', 'var(--control-height-md)');
assertDeclaration('shadow-card', '--tw-shadow', 'var(--elevation-card)');
assertDeclaration('duration-fast', 'transition-duration', 'var(--motion-duration-fast)');
assertDeclaration('z-overlay', 'z-index', 'var(--z-overlay)');
assertImportantDeclaration('!text-[14px]', 'font-size', '14px');
assertImportantDeclaration('!leading-[14px]', 'line-height', '14px');
