# BakauBase product design brief

## 1. Product

BakauBase is a field-first mangrove conservation prototype for Malaysia. It helps communities record planting work, monitor survival, understand estimated blue carbon, and share evidence with partners.

## 2. Primary users and decisions

- Community volunteers decide what to record and which plot needs a follow-up.
- Field researchers decide where ecological conditions or survival trends need attention.
- Public partners decide whether progress is credible and where support is needed.
- Administrators maintain the demonstration data and assumptions.

The main dashboard decision is: **which plots need attention, and is restoration progressing?**

## 3. Voice and visual intent

- Calm, botanical, grounded, and credible.
- Friendly enough for community field use; precise enough for NGOs and agencies.
- Editorial display typography paired with clear, compact interface typography.
- Real imagery and verifiable locations take priority over decorative illustration.

## 4. Ranked principles

1. **Evidence before decoration.** GPS, survival, photos, sources, and assumptions must be easier to find than ornamental content.
2. **Action before completeness.** Surface urgent plots and next actions; move methodology and detail behind progressive disclosure.
3. **Field clarity over density.** Controls must remain legible and tappable outdoors and on small screens.
4. **Honest prototype language.** Demo satellite layers and placeholder carbon values must never appear certified or live.
5. **Malaysia is specific, not generic.** Use the established mangrove palette, local place names, bilingual copy, and real Malaysian mangrove imagery.

## 5. Constraints

- React + Vite with existing vanilla CSS; do not introduce another styling system.
- Preserve English and Bahasa Malaysia parity.
- Preserve the Forest, Moss, Eucalyptus, Sage, Pistachio, Mint and Cream palette.
- Preserve Cormorant Garamond for editorial display and DM Sans for UI text.
- Mobile controls target at least 44px.
- Motion is restrained and respects `prefers-reduced-motion`.

## 6. Learned constraints

- 2026-10-14: Avoid generic AI-dashboard styling. Repeated equal-weight cards, excessive pills, gradients, and decorative animation are not part of the BakauBase character.
- 2026-10-14: Keep the supplied BakauBase logo and the calm green mood-board direction.
- 2026-10-14: Apply the established UI system across every visible route. New screens must reuse the shared field, state, navigation and data patterns instead of introducing a separate visual style.

