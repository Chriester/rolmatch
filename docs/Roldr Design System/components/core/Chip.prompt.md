Pill chip for game attributes and filters (`Terror`, `Presencial`, `Principiantes`, `Mesa llena`).

```jsx
<Chip label="Terror" />
<Chip label="Presencial" selected onClick={toggle} />
<Chip label="Mesa llena" tone="success" icon="users" />
```

Fill is always alpha over the dark surface: 12% resting, 28% selected; border 40% → 60%. Never solid-filled, never gradient.
