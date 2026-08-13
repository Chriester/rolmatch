const { BottomNav } = window.RoldrDesignSystem_220ac8;
const NAV = [
  { icon:'dices', label:'Buscar' },
  { icon:'sparkles', label:'Matches' },
  { icon:'message-circle', label:'Mesas' },
  { icon:'user', label:'Perfil' },
];

function App() {
  const [entered, setEntered] = React.useState(false);
  const [tab, setTab] = React.useState(0);
  const [table, setTable] = React.useState(null);

  let screen;
  if (!entered) screen = <Onboarding onEnter={() => setEntered(true)} />;
  else if (table) screen = <TableDetail table={table} onBack={() => setTable(null)} />;
  else if (tab === 0) screen = <Discover onOpen={setTable} />;
  else if (tab === 1) screen = <Matches onOpen={m => setTable(window.ROLDR_DATA.tables.find(t => t.title === m.title))} />;
  else if (tab === 2) screen = <Matches onOpen={m => setTable(window.ROLDR_DATA.tables.find(t => t.title === m.title))} />;
  else screen = <Profile />;

  return (
    <div className="phone">
      <div className="viewport">{screen}</div>
      {entered && !table && <BottomNav items={NAV} active={tab} onChange={setTab} />}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
