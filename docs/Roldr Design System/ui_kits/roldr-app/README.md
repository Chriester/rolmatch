# UI kit · Roldr app (iOS/Android, 390×844)

A click-through recreation of the Roldr mobile app, composed entirely from the design-system
components in `components/`. Nothing here re-implements a primitive.

## Flow
`Onboarding` → **Empezar a buscar** → `Discover` (swipe deck)
· tap a card → `TableDetail` → **Pedir plaza**
· ✕ / bookmark / d20 buttons advance the deck; the d20 (join) triggers `MatchBanner`
· filter icon in the header opens the `Sheet` with the full chip set
· tabs: Buscar · Matches · Mesas · Perfil

## Files
| File | What |
|---|---|
| `index.html` | 390×844 frame, loads the bundle + screens |
| `App.jsx` | Screen router and tab state |
| `Screens.jsx` | `Onboarding`, `Discover`, `TableDetail`, `Matches`, `Profile` |
| `data.js` | Fake tables, matches and filter list (Spanish copy) |

## Known gaps
- **No photography was supplied.** Table cards and the detail hero fall back to the brand
  gradient at 55%, as specified for the missing-art case. Drop real cover art into
  `table.imageUrl` when it exists.
- Swipe is driven by the action buttons; no drag gesture is wired (the `decision` tint prop
  on `SwipeCard` is what a drag would set).
- "Mesas" (chat) reuses the Matches list — no chat screen exists in the supplied handoff, so
  it is intentionally not invented.
