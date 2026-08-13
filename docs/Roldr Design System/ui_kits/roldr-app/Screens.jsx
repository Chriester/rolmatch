const { Button, Chip, Badge, Card, Icon, Input, Avatar, TopBar, BottomNav, Sheet, SwipeCard, SwipeActions, MatchBanner } = window.RoldrDesignSystem_220ac8;
const D = window.ROLDR_DATA;

function Onboarding({ onEnter }) {
  return (
    <div style={{ position:'absolute', inset:0, background:'url(../../assets/background-gradient.png) center/cover', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'var(--space-6) var(--screen-gutter) var(--space-8)' }}>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(10,9,12,.94) 0%,rgba(10,9,12,.35) 55%,rgba(10,9,12,.15) 100%)' }} />
      <img src="../../assets/logo-mark.png" alt="" style={{ position:'relative', width:96, height:96, marginBottom:'var(--space-6)' }} />
      <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
        <h1 style={{ font:'var(--text-display-1)', letterSpacing:'var(--ls-display)', textWrap:'pretty' }}>Desliza hasta<br/>tu próxima mesa</h1>
        <p style={{ font:'var(--text-body-lg)', color:'var(--text-muted)', maxWidth:300 }}>
          Partidas de rol cerca de ti y en línea. Tú dices qué te apetece jugar; el máster dice si hay sitio.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)', marginTop:'var(--space-2)' }}>
          <Button fullWidth icon="dices" onClick={onEnter}>Empezar a buscar</Button>
          <Button variant="ghost" fullWidth onClick={onEnter}>Ya tengo cuenta</Button>
        </div>
      </div>
    </div>
  );
}

function Discover({ onOpen }) {
  const [i, setI] = React.useState(0);
  const [decision, setDecision] = React.useState(null);
  const [matched, setMatched] = React.useState(null);
  const [filters, setFilters] = React.useState(['Presencial']);
  const [sheet, setSheet] = React.useState(false);
  const deck = D.tables.slice(i, i + 3);

  const advance = (d) => {
    setDecision(d);
    const card = D.tables[i];
    setTimeout(() => {
      setDecision(null);
      setI(n => (n + 1) % D.tables.length);
      if (d === 'yes') setMatched(card);
    }, 260);
  };
  const toggle = t => setFilters(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t]);

  return (
    <>
      <TopBar logoSrc="../../assets/logo-d20.png" title="Buscar mesa" actionIcon="sliders-horizontal" action={() => setSheet(true)} />
      <div style={{ display:'flex', gap:'var(--space-2)', padding:'0 var(--screen-gutter) var(--space-3)', overflowX:'auto' }}>
        {D.filters.slice(0,5).map(t => <Chip key={t} label={t} selected={filters.includes(t)} onClick={() => toggle(t)} style={{ flex:'0 0 auto' }} />)}
      </div>
      <div style={{ position:'relative', flex:1, margin:'0 var(--screen-gutter)' }}>
        {deck.map((t, k) => (
          <SwipeCard key={t.id} {...t} offset={deck.length - 1 - k}
            decision={k === 0 ? decision : null}
            onClick={k === 0 ? () => onOpen(t) : undefined}
            style={{ zIndex: 10 - k, cursor: k === 0 ? 'pointer' : 'default' }} />
        )).reverse()}
      </div>
      <SwipeActions style={{ padding:'var(--space-5) 0' }} onNo={() => advance('no')} onYes={() => advance('yes')} onSuper={() => advance('super')} />
      <Sheet open={sheet} title="Filtros" onClose={() => setSheet(false)}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-2)', marginBottom:'var(--space-5)' }}>
          {D.filters.map(t => <Chip key={t} label={t} selected={filters.includes(t)} onClick={() => toggle(t)} />)}
        </div>
        <Button fullWidth onClick={() => setSheet(false)}>Ver 24 mesas</Button>
      </Sheet>
      {matched && <MatchBanner title={matched.title} gm={matched.gm} onOpen={() => { setMatched(null); onOpen(matched); }} onKeep={() => setMatched(null)} />}
    </>
  );
}

function TableDetail({ table, onBack }) {
  const [joined, setJoined] = React.useState(false);
  return (
    <>
      <TopBar onBack={onBack} title={table.system.split(' · ')[0]} actionIcon="share-2" />
      <div style={{ flex:1, overflowY:'auto', paddingBottom:'var(--space-8)' }}>
        <div style={{ position:'relative', height:200, background:'var(--gradient-brand)' }}>
          <div style={{ position:'absolute', inset:0, background:'var(--scrim-bottom)' }} />
          <div style={{ position:'absolute', left:'var(--screen-gutter)', right:'var(--screen-gutter)', bottom:'var(--space-4)', display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
            <div style={{ display:'flex', gap:'var(--space-2)' }}>
              {table.live && <Badge tone="live" dot>En directo</Badge>}
              <Badge tone="success">{table.seats} plazas</Badge>
            </div>
            <h1 style={{ font:'var(--text-display-2)', letterSpacing:'var(--ls-display)', textWrap:'pretty' }}>{table.title}</h1>
          </div>
        </div>
        <div style={{ padding:'var(--space-5) var(--screen-gutter)', display:'flex', flexDirection:'column', gap:'var(--section-gap)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
            <Avatar name={table.gm} size={48} ring live />
            <div style={{ flex:1 }}>
              <div style={{ font:'var(--text-body-strong)' }}>{table.gm}</div>
              <div style={{ font:'var(--text-caption)', color:'var(--text-muted)' }}>Máster · 18 mesas dirigidas</div>
            </div>
            <Button variant="secondary" size="sm" icon="message-circle">Escribir</Button>
          </div>
          <p style={{ font:'var(--text-body-lg)', color:'var(--text-muted)', textWrap:'pretty' }}>{table.pitch}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'var(--stack-gap)' }}>
            {[['calendar', table.when], ['map-pin', table.place], ['dices', table.system]].map(([ic, tx]) => (
              <Card key={tx} raised padding="12px 14px" style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                <span style={{ color:'var(--brand-lilac)', display:'flex' }}><Icon name={ic} size={18} /></span>
                <span style={{ font:'var(--text-body)' }}>{tx}</span>
              </Card>
            ))}
          </div>
          <div>
            <h2 style={{ font:'var(--text-title-2)', marginBottom:'var(--space-3)' }}>En la mesa</h2>
            <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
              <div style={{ display:'flex' }}>
                {table.players.map((p, k) => <Avatar key={p} name={p} size={38} ring={k===0} style={{ marginLeft: k ? -10 : 0, boxShadow:'0 0 0 2px var(--bg)', borderRadius:999 }} />)}
              </div>
              <span style={{ font:'var(--text-caption)', color:'var(--text-muted)' }}>{table.players.length} jugando · {table.seats} libres</span>
            </div>
          </div>
          <div>
            <h2 style={{ font:'var(--text-title-2)', marginBottom:'var(--space-3)' }}>Cómo se juega aquí</h2>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-2)' }}>
              {[...table.tags, 'Cámara opcional', 'Reglas en la mesa'].map(t => <Chip key={t} label={t} />)}
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding:'var(--space-3) var(--screen-gutter) var(--space-4)', borderTop:'1px solid var(--border)', background:'rgba(19,17,25,.86)', backdropFilter:'blur(var(--blur-glass))' }}>
        {joined
          ? <Button variant="secondary" fullWidth icon="check" onClick={() => setJoined(false)}>Solicitud enviada a {table.gm}</Button>
          : <Button fullWidth icon="dices" onClick={() => setJoined(true)}>Pedir plaza</Button>}
      </div>
    </>
  );
}

function Matches({ onOpen }) {
  return (
    <>
      <TopBar logoSrc="../../assets/logo-d20.png" title="Matches" actionIcon="search" />
      <div style={{ flex:1, overflowY:'auto', padding:'0 var(--screen-gutter) var(--space-6)', display:'flex', flexDirection:'column', gap:'var(--stack-gap)' }}>
        <p style={{ font:'var(--text-caption)', color:'var(--text-muted)' }}>Mesas donde el máster te ha guardado sitio.</p>
        {D.matches.map(m => (
          <Card key={m.id} onClick={() => onOpen(m)} style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', cursor:'pointer' }}>
            <Avatar name={m.gm} size={46} ring />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
                <span style={{ font:'var(--text-body-strong)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.title}</span>
              </div>
              <div style={{ font:'var(--text-caption)', color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.gm} · {m.last}</div>
            </div>
            {m.unread > 0
              ? <Badge tone="live">{m.unread}</Badge>
              : <span style={{ font:'var(--text-caption)', color:'var(--text-muted)' }}>{m.when.split(' ')[0]}</span>}
          </Card>
        ))}
        <h2 style={{ font:'var(--text-title-2)', marginTop:'var(--space-4)' }}>Guardadas</h2>
        <Card raised style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
          <span style={{ color:'var(--brand-lilac)', display:'flex' }}><Icon name="bookmark" size={20} /></span>
          <span style={{ flex:1, font:'var(--text-body)' }}>Ars Magica: el invierno del pacto</span>
          <Button variant="ghost" size="sm">Ver</Button>
        </Card>
      </div>
    </>
  );
}

function Profile() {
  const [online, setOnline] = React.useState(['Online','Presencial']);
  return (
    <>
      <TopBar logoSrc="../../assets/logo-d20.png" title="Perfil" actionIcon="settings" />
      <div style={{ flex:1, overflowY:'auto', padding:'0 var(--screen-gutter) var(--space-8)', display:'flex', flexDirection:'column', gap:'var(--section-gap)' }}>
        <Card ambient style={{ display:'flex', alignItems:'center', gap:'var(--space-4)' }}>
          <Avatar name="Nil Bosch" size={64} live />
          <div>
            <div style={{ font:'var(--text-title-2)' }}>Nil Bosch</div>
            <div style={{ font:'var(--text-caption)', color:'var(--text-muted)' }}>Madrid · 12 mesas jugadas</div>
            <div style={{ marginTop:8 }}><Badge tone="success">Puntual</Badge></div>
          </div>
        </Card>
        <div>
          <h2 style={{ font:'var(--text-title-2)', marginBottom:'var(--space-3)' }}>Qué me gusta jugar</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-2)' }}>
            {['Terror','Investigación','Rol pesado','One-shot','D&D 5e','Vaesen','Cyberpunk RED'].map(t => <Chip key={t} label={t} selected />)}
            <Chip label="Añadir" icon="plus" />
          </div>
        </div>
        <div>
          <h2 style={{ font:'var(--text-title-2)', marginBottom:'var(--space-3)' }}>Cómo quiero jugar</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-2)' }}>
            {['Online','Presencial','Tardes','Fines de semana'].map(t =>
              <Chip key={t} label={t} selected={online.includes(t)} onClick={() => setOnline(o => o.includes(t) ? o.filter(x => x !== t) : [...o, t])} />)}
          </div>
        </div>
        <Input label="Ciudad" icon="map-pin" defaultValue="Madrid" hint="Buscamos mesas en un radio de 15 km" />
        <Button variant="danger" fullWidth icon="log-out">Cerrar sesión</Button>
      </div>
    </>
  );
}

Object.assign(window, { Onboarding, Discover, TableDetail, Matches, Profile });
