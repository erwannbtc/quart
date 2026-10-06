import { useCallback, useState, type ReactNode } from 'react';
import { Home, type Pop } from './screens/Home';
import { Postes } from './screens/Postes';
import { Reglages } from './screens/Reglages';
import { ShiftSheet } from './screens/ShiftSheet';
import { Icon, Toast } from './components/ui';
import { useStore } from './lib/store';

type Tab = 'home' | 'postes' | 'reglages';

const TABS: [Tab, string, () => ReactNode][] = [
  ['home', 'Accueil', () => Icon.calendar()],
  ['postes', 'Postes', () => Icon.clock()],
  ['reglages', 'Réglages', () => Icon.sliders()]
];

export default function App() {
  const st = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);

  const closeSheet = useCallback(() => setSheetDate(null), []);
  const onSaved = useCallback((date: string) => setPop((p) => ({ date, tick: (p?.tick ?? 0) + 1 })), []);

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <div className="halos" aria-hidden="true">
        <div className="halo a" />
        <div className="halo b" />
        <div className="halo c" />
      </div>
      <main className="app" key={`${tab}-${st.mode}`}>
        {tab === 'home' && <Home onOpenDay={setSheetDate} pop={pop} />}
        {tab === 'postes' && <Postes />}
        {tab === 'reglages' && <Reglages />}
      </main>
      <nav className="nav" aria-label="Navigation principale">
        {TABS.map(([id, label, icon]) => (
          <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            {icon()}
            {label}
          </button>
        ))}
      </nav>
      {sheetDate && <ShiftSheet key={sheetDate} date={sheetDate} onClose={closeSheet} onSaved={onSaved} />}
      <Toast />
    </>
  );
}
