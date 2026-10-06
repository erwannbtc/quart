import { useCallback, useState } from 'react';
import { Home, type Pop } from './screens/Home';
import { Postes } from './screens/Postes';
import { Reglages } from './screens/Reglages';
import { ShiftSheet } from './screens/ShiftSheet';
import { Toast } from './components/ui';
import { TabBar, type Tab } from './components/TabBar';
import { useStore } from './lib/store';

export default function App() {
  const st = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  // Toucher à nouveau l'onglet Postes ramène à la liste des employeurs.
  const [postesKey, setPostesKey] = useState(0);

  const closeSheet = useCallback(() => setSheetDate(null), []);
  const onSaved = useCallback((date: string) => setPop((p) => ({ date, tick: (p?.tick ?? 0) + 1 })), []);

  const select = (t: Tab, again: boolean) => {
    if (again) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (t === 'postes') setPostesKey((k) => k + 1);
      return;
    }
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
        {tab === 'postes' && <Postes key={postesKey} />}
        {tab === 'reglages' && <Reglages />}
      </main>
      <TabBar tab={tab} onSelect={select} />
      {sheetDate && <ShiftSheet key={sheetDate} date={sheetDate} onClose={closeSheet} onSaved={onSaved} />}
      <Toast />
    </>
  );
}
