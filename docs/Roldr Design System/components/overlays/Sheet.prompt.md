Bottom sheet — filters, table details, confirmations. Roldr has no centred dialogs.

```jsx
<Sheet open={open} title="Filtros" onClose={close}>
  <Chip label="Presencial" selected />
  <Button fullWidth>Ver 24 mesas</Button>
</Sheet>
```

Radius 24px on the top corners only; slides up 14px over 220ms with `--ease-out`. Its parent must be `position: relative`.
