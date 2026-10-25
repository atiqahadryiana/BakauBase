# BakauBase design tokens

## Colour

- Forest / primary text and strong actions: `#1F3A2B`
- Moss / interactive accent and healthy data: `#5B7B4A`
- Eucalyptus / secondary ecological data: `#7FA08A`
- Sage / borders and quiet structure: `#A8B89A`
- Pistachio / selected and highlighted surfaces: `#C9D9A0`
- Mint / supporting surfaces: `#D6E4D0`
- Cream / canvas: `#F3F1E6`
- Maroon / destructive and high-risk state: `#8C4C43`

Use Moss as the primary accent. Status colours are functional exceptions and must also include text or another non-colour cue.

## Typography

- Display: Cormorant Garamond 600; italic 500 for botanical emphasis only.
- Interface and body: DM Sans 400–700.
- Large impact numbers may use Cormorant Garamond; dense tables and chart labels use DM Sans with tabular numerals.
- Sentence case is standard. Uppercase is limited to small, tracked category labels.

## Spacing and sizing

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px.
- Minimum interactive target: 44px.
- Dashboard panel padding: 16–22px.
- Main content gap: 16–24px.

## Radius and elevation

- Inputs and small controls: 6px.
- Buttons: 8px.
- Cards and sections: 10–12px.
- Large map/workspace panels: 14px.
- Use quiet layered green-tinted shadows only for raised or interactive surfaces; structural sections may use hairline borders without shadows.

## Motion

- Hover/focus feedback: 120–150ms.
- Panels and mobile navigation: 200–250ms.
- No idle, bouncing, or decorative motion.
- All motion collapses under `prefers-reduced-motion`.

