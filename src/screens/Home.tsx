import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { activeData, activeToday, useStore } from '../lib/store';
import { computeMonth, holidayName } from '../lib/pay';
import { dayOfWeek, daysInMonth, parseISO, toISO } from '../lib/dates';
import { dayMonth, duration, euro, fmt, hm, hours, monthTitle, shortDay } from '../lib/format';
import { textOn, tint } from '../lib/colors';
import { Icon, Logo, Ring, Tween } from '../components/ui';
import type { Shift, ShiftType } from '../lib/types';

export interface Pop {
  date: string;
  tick: number;
}

const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function Home({ onOpenDay, pop }: { onOpenDay: (date: string) => void; pop: Pop | null }) {
  const st = useStore();
  const data = activeData(st);
  const today = activeToday(st);
  const [ty, tm] = parseISO(today);
  const [ym, setYm] = useState<[number, number]>([ty, tm]);

  // Quand « aujourd'hui » change (mode démo activé ou quitté), on revient au mois en cours.
  useEffect(() => setYm([ty, tm]), [ty, tm]);

  const [y, m] = ym;
  const sum = useMemo(() => computeMonth(data, y, m, today), [data, y, m, today]);
  const types = useMemo(() => new Map(data.shiftTypes.map((t) => [t.id, t])), [data.shiftTypes]);
  const byDate = useMemo(() => {
    const map = new Map<string, Shift>();
    for (const s of data.shifts) map.set(s.date, s);
    return map;
  }, [data.shifts]);

  const shiftMonth = (d: number) => {
    const idx = y * 12 + (m - 1) + d;
    setYm([Math.floor(idx / 12), (idx % 12) + 1]);
  };

  const cotis = data.settings.cotisations;
  const isLong = sum.brutToDate >= 10000;
  const addDate = ty === y && tm === m ? today : toISO(y, m, 1);

  // Carte « Aujourd'hui »
  const todayShift = byDate.get(today);
  const todayType = todayShift ? types.get(todayShift.typeId) : undefined;
  const todayEmp = todayShift ? data.employers.find((e) => e.id === todayShift.employerId) : undefined;
  const todayPay = todayShift ? computeMonth(data, ty, tm, today).perShift.get(todayShift.id) : undefined;

  return (
    <div className="screen">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span>Quart</span>
          {st.mode === 'demo' && <span className="badge demo">démo</span>}
        </div>
        <div className="monthnav">
          <button className="icon-btn" aria-label="Mois précédent" onClick={() => shiftMonth(-1)}>{Icon.left()}</button>
          <div className="label" aria-live="polite">{monthTitle(y, m)}</div>
          <button className="icon-btn" aria-label="Mois suivant" onClick={() => shiftMonth(1)}>{Icon.right()}</button>
        </div>
        <button className="add-btn" aria-label="Ajouter un poste" onClick={() => onOpenDay(addDate)}>{Icon.plus()}</button>
      </header>

      <section className="stats" aria-label="Synthèse du mois">
        <div className="glass stat center">
          <div className="lbl">Heures</div>
          <Ring ratio={sum.ratio} label={`${hours(sum.doneHours)} heures travaillées sur ${hours(sum.contractHours)}, ${Math.round(sum.ratio * 100)} %`} />
          <div className="ring-h">
            <Tween value={sum.doneHours} format={(n) => `${fmt(n, 1)} h`} />
            <span className="muted"> / {hours(sum.contractHours)}</span>
          </div>
          <div className="sub">reste <Tween value={sum.remainingHours} format={(n) => hours(n)} /> h</div>
        </div>

        <div className="glass stat">
          <div className="lbl">Brut du mois</div>
          <div className={`amount${isLong ? ' long' : ''}`}><Tween value={sum.brutToDate} format={(n) => fmt(n)} /></div>
          <div className="sub">euros, à date</div>
          <div className="plan">
            <div className="k">Prévu fin de mois</div>
            <div className="v">{euro(sum.brutPlanned, 0)}</div>
          </div>
        </div>

        <div className="glass stat">
          <div className="lbl">
            <span>Net</span>
            <span className="badge">estimation</span>
          </div>
          <div className={`amount${isLong ? ' long' : ''}`} style={{ color: 'var(--accent)' }}><Tween value={sum.netToDate} format={(n) => fmt(n)} /></div>
          <div className="sub">à date · cotis.&nbsp;~{hours(cotis, 1)}&nbsp;%</div>
          <div className="plan">
            <div className="k">Prévu fin de mois</div>
            <div className="v">{euro(sum.netPlanned, 0)}</div>
          </div>
        </div>
      </section>

      <Calendar y={y} m={m} today={today} byDate={byDate} types={types} pop={pop} onOpenDay={onOpenDay} />

      <div className="legend" aria-label="Légende">
        {data.shiftTypes.map((t) => (
          <span key={t.id}><i style={{ background: t.color }} />{t.name}</span>
        ))}
        <span><i className="dot" />Férié</span>
      </div>

      <button className="glass todaycard" onClick={() => onOpenDay(today)} aria-label={`Aujourd'hui : ${todayType ? todayType.name : 'aucun poste'}. Modifier`}>
        <div className="l">
          <div className="k">Aujourd'hui · {shortDay(today)}{todayEmp && todayType?.kind !== 'rest' ? ` · ${todayEmp.name}` : ''}</div>
          <div className="t">{todayType ? labelOf(todayType, todayShift!) : 'Aucun poste'}</div>
        </div>
        <div className="r">
          {todayPay && todayPay.hours > 0 ? (
            <>
              <div style={{ fontSize: 13 }}>{duration(todayPay.hours)}</div>
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>+{euro(todayPay.brut)} brut</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font)' }}>{todayType ? '0 h' : 'Ajouter'}</div>
          )}
        </div>
      </button>
    </div>
  );
}

function labelOf(t: ShiftType, s: Shift) {
  return t.kind === 'work' ? `${t.name} ${hm(s.start)} – ${hm(s.end)}` : t.name;
}

function Calendar({ y, m, today, byDate, types, pop, onOpenDay }: {
  y: number;
  m: number;
  today: string;
  byDate: Map<string, Shift>;
  types: Map<string, ShiftType>;
  pop: Pop | null;
  onOpenDay: (date: string) => void;
}) {
  const n = daysInMonth(y, m);
  const firstCol = ((dayOfWeek(toISO(y, m, 1)) + 6) % 7) + 1;
  const cells = [];
  for (let d = 1; d <= n; d++) {
    const date = toISO(y, m, d);
    const shift = byDate.get(date);
    const type = shift ? types.get(shift.typeId) : undefined;
    const isToday = date === today;
    const ferie = holidayName(date);
    const style: CSSProperties = { gridColumnStart: d === 1 ? firstCol : 'auto' };
    if (type) {
      style.background = tint(type.color, date <= today ? 0.3 : 0.14);
      if (!isToday) style.borderColor = tint(type.color, 0.4);
    }
    const popClass = pop && pop.date === date ? ` pop-${pop.tick % 2}` : '';
    const aria = `${dayMonth(date)}, ${type ? type.name : 'aucun poste'}${ferie ? `, ${ferie}` : ''}${isToday ? ', aujourd’hui' : ''}`;
    cells.push(
      <button key={date} className={`day${isToday ? ' today' : ''}${popClass}`} style={style} aria-label={aria} aria-current={isToday ? 'date' : undefined} onClick={() => onOpenDay(date)}>
        {ferie && <span className="ferie" aria-hidden="true" />}
        <span className="n">{d}</span>
        <span className="c" style={{ color: type ? textOn(type.color) : undefined }} aria-hidden="true">{type?.code ?? ''}</span>
      </button>
    );
  }
  return (
    <section className="glass lg cal" aria-label={`Calendrier de ${monthTitle(y, m)}`}>
      <div className="dow" aria-hidden="true">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
      <div className="grid">{cells}</div>
    </section>
  );
}
