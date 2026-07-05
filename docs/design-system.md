# Infopedia Design System

This document is the implementation-facing design-system guide for Infopedia.
For visual direction, use `docs/mobile-design-style.md` as the companion style
guide.

## Core Rule For New UI

New UI must start from `frontend/src/ui` atoms before writing custom Tailwind.
Use custom classes only for page-specific layout, one-off Figma positioning, or
states that are not yet represented in the design system.

## Atoms

Atoms live in `frontend/src/ui/atoms` and are exported from `frontend/src/ui`.
They are app-agnostic primitives: no API clients, stores, router imports, or
translation hooks.

Use atoms for:

- `Button`: primary, secondary, danger, ghost, and surface actions.
- `IconButton`: icon-only controls with accessible labels supplied by callers.
- `Input`: raw input controls; pair with form molecules for labels and errors.
- `Chip`: compact metadata, selected filters, and status-like labels.
- `Surface`: white or soft layout surfaces that respect mobile flattening.
- `Heading` and `Text`: stable type roles using design tokens.
- `Divider`: subtle separation.
- `Spinner`: loading affordance inside controls or compact status areas.

## Token Rules

Use `frontend/src/styles/tokens.css` for semantic values. Keep brand palette
tokens stable unless the Figma source changes. Prefer semantic tokens such as
control height, radius, mobile rail, and type size over scattered hardcoded
values in reusable components.

Raw Figma values may still appear in page-level code when matching a specific
screen contract, but reusable UI should prefer design tokens and Tailwind theme
aliases.

