Tinted Lucide glyph — use it anywhere Roldr UI needs an icon; colour comes from `currentColor`, so set `color` on the parent.

```jsx
<span style={{ color: 'var(--text-muted)' }}>
  <Icon name="map-pin" size={16} />
</span>
```

Notes: names are Lucide kebab-case (`dices`, `heart`, `x`, `users`, `sparkles`). Loaded from the lucide-static CDN as a CSS mask, so it needs network access. Decorative by default; pass `title` when the icon is the only label.
