The Roldr app tab bar — always fixed to the bottom of the 390px frame.

```jsx
<BottomNav
  active={tab} onChange={setTab}
  items={[
    { icon: 'dices', label: 'Buscar' },
    { icon: 'sparkles', label: 'Matches' },
    { icon: 'message-circle', label: 'Mesas' },
    { icon: 'user', label: 'Perfil' },
  ]}
/>
```
