The core Roldr object: one table, one card, in the swipe deck. Needs a `position: relative` parent with an explicit height.

```jsx
<SwipeCard
  title="La Tumba de Aniquilación"
  system="D&D 5e · campaña larga"
  gm="Marta R." imageUrl={art}
  tags={['Terror', 'Presencial', 'Principiantes']}
  distance="a 3,2 km" seats={2} live
/>
```

Stack the next two cards behind with `offset={1}` / `offset={2}`. `decision` tints green/red at 18% while the user drags.
