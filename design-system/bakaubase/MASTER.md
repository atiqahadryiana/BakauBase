# BakauBase design system

This file is the implementation-facing source of truth. It complements `.ui-craft/brief.md` and `.ui-craft/tokens.md`; those project decisions override generated recommendations.

## Direction

- Calm, botanical conservation operations UI.
- Evidence, location and field actions come before decoration.
- One dominant decision per screen; supporting controls stay quiet.
- Light theme only for the prototype. Do not imply an untested dark mode.

## Colour roles

| Role | Value | Token |
| --- | --- | --- |
| Primary and text | `#1F3A2B` | `--green-deep` |
| Interactive accent | `#5B7B4A` | `--green-leaf` |
| Secondary ecological data | `#7FA08A` | `--eucalyptus` |
| Structure | `#A8B89A` | `--sage` |
| Selected surface | `#C9D9A0` | `--pistachio` |
| Supporting surface | `#D6E4D0` | `--green-light` |
| Canvas | `#F3F1E6` | `--cream` |
| Destructive or high risk | `#8C4C43` | `--maroon` |

Moss is the primary accent. Status colours are functional exceptions and always require a text label or second cue.

## Typography

- Display headings: Cormorant Garamond 600.
- Body and controls: DM Sans 400–700.
- Data uses tabular numerals.
- Sentence case is standard. Tracked uppercase is limited to occasional 11–13px category labels.

## Components

- Minimum target size: 44px.
- Inputs: 6px radius; buttons: 8px; cards: 10px; map and large panels: 14px.
- Controls expose hover, pressed, disabled and `:focus-visible` states.
- Buttons name an outcome. Controls without implemented behavior are rendered as information, not fake buttons.
- Forms use visible labels, inline errors and explicit required markers.
- Tables use a focusable overflow wrapper, readable headers and tabular numbers.

## Responsive behavior

- Small phone: 375px; tablet: 768px; desktop shell: 1024px and wider.
- The fixed sidebar becomes a dismissible top-anchored drawer on small screens.
- Forms collapse from two columns to one. Primary submit actions become full width.
- Maps retain a useful minimum height and controls remain reachable without hover.

## Motion and accessibility

- Feedback: 140ms. Panels: 240ms. Exit should be faster than enter.
- Animate only opacity and transform where possible.
- Honor `prefers-reduced-motion` globally.
- Keep normal text at 4.5:1 contrast or better.
- Preserve logical heading order, route focus, skip navigation and descriptive image alternatives.

## Avoid

- Repeated equal-weight cards, excessive pills and decorative gradients.
- Emoji or text characters as structural icons.
- Full-dark dashboard chrome, glass effects and decorative motion.
- Placeholder controls, certification language, or presenting demo remote sensing and carbon values as live science.
