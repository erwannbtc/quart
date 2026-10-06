import { useState } from 'react';
import { activeData, activeToday, update, useStore } from '../lib/store';
import { newId } from '../lib/defaults';
import { addDays, dayOfWeek, mondayOf } from '../lib/dates';
import { euro, fmt, hm, hours, longDate, parseDecimal, parseHM } from '../lib/format';
import { SHIFT_COLORS, textOn, tint } from '../lib/colors';
import { DateField, Icon, Sheet, Stepper, Switch, VStepper, toast } from '../components/ui';
import type { AppData, Employer, Rates, Shift, ShiftKind, ShiftType } from '../lib/types';

export function Postes() {
  const st = useStore();
  const data = activeData(st);
  const [editing, setEditing] = useState<ShiftType | 'new' | null>(null);
  const used = (typeId: string) => data.shifts.filter((s) => s.typeId === typeId).length;

  return (
    <div className="screen">
      <div className="page-head">
        <h1>Postes et taux</h1>
        <p>Ces valeurs servent au calcul du brut et du net estimé.</p>
      </div>

      <div className="stack">
        <section className="glass lg section">
          <div className="section-head">
            <h2>Types de postes</h2>
            <button className="link-btn" onClick={() => setEditing('new')}>Ajouter</button>
          </div>
          {data.shiftTypes.map((t) => (
            <div className="row" key={t.id}>
              <span className="typebar" style={{ background: t.color }} />
              <div className="t" style={{ flexGrow: 1 }}>
                <div className="a">{t.name}</div>
                <div className="b">
                  {t.kind === 'work' ? `Pause ${t.pause} min` : t.kind === 'rest' ? 'Non travaillé' : `Congé payé · ${hours(t.leaveHours)} h`}
                </div>
              </div>
              <div className="num" style={{ fontSize: 13, color: 'var(--text-4)' }}>
                {t.kind === 'work' ? `${hm(t.start)} – ${hm(t.end)}` : '—'}
              </div>
              <button className="icon-btn" style={{ marginRight: -10 }} aria-label={`Modifier le poste ${t.name}`} onClick={() => setEditing(t)}>
                {Icon.pencil()}
              </button>
            </div>
          ))}
        </section>

        <Employers data={data} />
        <Majorations data={data} />
        <Cotisations data={data} />
        <Cycle data={data} today={activeToday(st)} />
      </div>

      {editing && (
        <TypeSheet type={editing === 'new' ? null : editing} usedBy={editing === 'new' ? 0 : used(editing.id)} canDelete={data.shiftTypes.length > 1} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

/* ---------- Champ numérique à la française (validé à la sortie du champ) ---------- */

function DecimalInput({ id, value, onCommit, digits = 2, max = 10000 }: { id: string; value: number; onCommit: (v: number) => void; digits?: number; max?: number }) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? fmt(value, digits);
  const parsed = parseDecimal(shown);
  const invalid = parsed === null || parsed > max;
  return (
    <input
      id={id}
      className="input num"
      type="text"
      inputMode="decimal"
      value={shown}
      aria-invalid={invalid}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => {
        if (!invalid && parsed !== null) onCommit(parsed);
        setText(null);
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

function TextInput({ id, value, onCommit, maxLength = 40 }: { id: string; value: string; onCommit: (v: string) => void; maxLength?: number }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      id={id}
      className="input"
      type="text"
      maxLength={maxLength}
      value={text ?? value}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const v = (text ?? value).trim();
        if (v) onCommit(v);
        setText(null);
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

/* ---------- Employeurs ---------- */

function Employers({ data }: { data: AppData }) {
  const patch = (id: string, p: Partial<Employer>) =>
    update((d) => ({ ...d, employers: d.employers.map((e) => (e.id === id ? { ...e, ...p } : e)) }));
  const add = () => {
    update((d) => ({ ...d, employers: [...d.employers, { id: newId('emp'), name: `Employeur ${d.employers.length + 1}`, rate: d.employers[0]?.rate ?? 12, contractHours: 151.67 }] }));
    toast('Employeur ajouté');
  };
  const remove = (e: Employer) => {
    if (data.shifts.some((s) => s.employerId === e.id)) {
      toast(`Impossible : des postes utilisent « ${e.name} »`);
      return;
    }
    update((d) => ({ ...d, employers: d.employers.filter((x) => x.id !== e.id) }));
  };

  return (
    <section className="glass lg section pb">
      <div className="section-head">
        <h2>{data.employers.length > 1 ? 'Employeurs' : 'Employeur'}</h2>
        <button className="link-btn" onClick={add}>Ajouter</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {data.employers.map((e, i) => (
          <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: i > 0 ? '1px solid var(--glass-border)' : undefined, paddingTop: i > 0 ? 14 : 0 }}>
            <div className="field">
              <label htmlFor={`emp-nom-${e.id}`}>Nom</label>
              <TextInput id={`emp-nom-${e.id}`} value={e.name} maxLength={60} onCommit={(name) => patch(e.id, { name })} />
            </div>
            <div className="grid2">
              <div className="field">
                <label htmlFor={`emp-taux-${e.id}`}>Taux horaire brut (€/h)</label>
                <DecimalInput id={`emp-taux-${e.id}`} value={e.rate} max={1000} onCommit={(rate) => patch(e.id, { rate })} />
              </div>
              <div className="field">
                <label htmlFor={`emp-h-${e.id}`}>Heures contrat / mois</label>
                <DecimalInput id={`emp-h-${e.id}`} value={e.contractHours} max={744} onCommit={(contractHours) => patch(e.id, { contractHours })} />
              </div>
            </div>
            {data.employers.length > 1 && (
              <button className="link-btn" style={{ color: 'var(--danger)', alignSelf: 'flex-start' }} onClick={() => remove(e)}>
                Supprimer cet employeur
              </button>
            )}
          </div>
        ))}
        <div className="hint">0 heure contractuelle = pas d'heures sup. calculées (intérim sans volume fixe).</div>
      </div>
    </section>
  );
}

/* ---------- Majorations ---------- */

function Majorations({ data }: { data: AppData }) {
  const s = data.settings;
  const r = s.rates;
  const bump = (k: keyof Rates, d: number) =>
    update((x) => ({ ...x, settings: { ...x.settings, rates: { ...x.settings.rates, [k]: Math.max(0, Math.min(200, x.settings.rates[k] + d)) } } }));
  const setS = (p: Partial<AppData['settings']>) => update((x) => ({ ...x, settings: { ...x.settings, ...p } }));

  const defs: [keyof Rates, string, string][] = [
    ['sup1', 'Heures sup. (palier 1)', `Les ${hours(s.sup1Hours)} premières h au-delà du contrat`],
    ['sup2', 'Heures sup. (palier 2)', 'Les heures sup. suivantes'],
    ['night', 'Travail de nuit', `Heures entre ${hm(s.nightStart)} et ${hm(s.nightEnd)}`],
    ['sunday', 'Dimanche', 'Postes qui commencent un dimanche'],
    ['holiday', 'Jours fériés', 'Postes qui commencent un jour férié']
  ];

  return (
    <section className="glass lg section">
      <div className="section-head"><h2>Majorations</h2></div>
      {defs.map(([k, label, hint]) => (
        <div className="row" key={k}>
          <div className="t">
            <div className="a">{label}</div>
            <div className="b">{hint}</div>
          </div>
          <Stepper value={`+${r[k]} %`} label={label} onDec={() => bump(k, -5)} onInc={() => bump(k, 5)} decDisabled={r[k] <= 0} incDisabled={r[k] >= 200} />
        </div>
      ))}
      <div className="row">
        <div className="t">
          <label className="a" htmlFor="sup1h">Heures au palier 1</label>
          <div className="b">Par mois (34,67 h = 8 h × 4,33 sem.)</div>
        </div>
        <div style={{ width: 104 }}>
          <DecimalInput id="sup1h" value={s.sup1Hours} max={744} onCommit={(sup1Hours) => setS({ sup1Hours })} />
        </div>
      </div>
      <div className="row">
        <div className="t">
          <div className="a">Plage de nuit</div>
          <div className="b">Début et fin</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input aria-label="Début de la plage de nuit" className="input num time-input" type="time" step={900} value={hm(s.nightStart)}
            onChange={(e) => { const v = parseHM(e.target.value); if (v !== null) setS({ nightStart: v }); }} />
          <input aria-label="Fin de la plage de nuit" className="input num time-input" type="time" step={900} value={hm(s.nightEnd)}
            onChange={(e) => { const v = parseHM(e.target.value); if (v !== null) setS({ nightEnd: v }); }} />
        </div>
      </div>
    </section>
  );
}

/* ---------- Cotisations ---------- */

function Cotisations({ data }: { data: AppData }) {
  const c = data.settings.cotisations;
  const setC = (v: number) => update((x) => ({ ...x, settings: { ...x.settings, cotisations: Math.max(0, Math.min(60, v)) } }));
  return (
    <section className="glass lg section pb">
      <div className="section-head"><h2>Cotisations sociales</h2></div>
      <div className="row" style={{ marginBottom: 6 }}>
        <div className="t">
          <div className="a">Taux appliqué</div>
          <div className="b">Sert au net estimé</div>
        </div>
        <Stepper value={`${hours(c, 1)} %`} label="taux de cotisations" onDec={() => setC(Math.round(c) - 1)} onInc={() => setC(Math.round(c) + 1)} decDisabled={c <= 0} incDisabled={c >= 60} />
      </div>
      <div className="example">
        <span className="muted">100,00 € brut</span>
        <span className="muted">{Icon.arrow()}</span>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{euro(100 - c)} net estimé</span>
      </div>
    </section>
  );
}

/* ---------- Générateur de cycle 2x8 ---------- */

function Cycle({ data, today }: { data: AppData; today: string }) {
  const work = data.shiftTypes.filter((t) => t.kind === 'work');
  const matin = data.shiftTypes.find((t) => t.id === 'matin') ?? work[0];
  const apres = data.shiftTypes.find((t) => t.id === 'apres') ?? work[1] ?? work[0];
  const repos = data.shiftTypes.find((t) => t.kind === 'rest');

  const nextMonday = dayOfWeek(today) === 1 ? today : addDays(mondayOf(today), 7);
  const [start, setStart] = useState(nextMonday);
  const [weeks, setWeeks] = useState(4);
  const [firstMorning, setFirstMorning] = useState(true);
  const [replace, setReplace] = useState(false);
  const [employerId, setEmployerId] = useState(data.employers[0].id);
  const monday = mondayOf(start);

  if (!matin || !apres) {
    return (
      <section className="glass lg section pb">
        <div className="section-head"><h2>Cycle de rotation</h2></div>
        <p className="text-block first">Il faut au moins un type de poste travaillé pour générer un cycle.</p>
      </section>
    );
  }

  const order = firstMorning ? [matin, apres] : [apres, matin];
  const typeFor = (i: number): ShiftType | undefined => (i % 7 >= 5 ? repos : order[Math.floor(i / 7) % 2]);
  const preview = Array.from({ length: 14 }, (_, i) => typeFor(i));

  const generate = () => {
    const empId = data.employers.some((e) => e.id === employerId) ? employerId : data.employers[0].id;
    const created: Shift[] = [];
    for (let i = 0; i < weeks * 7; i++) {
      const t = typeFor(i);
      if (!t) continue;
      created.push({ id: newId('poste'), date: addDays(monday, i), typeId: t.id, start: t.start, end: t.end, pause: t.pause, employerId: empId });
    }
    let added = 0;
    update((d) => {
      const taken = new Set(d.shifts.map((s) => s.date));
      const keep = created.filter((s) => replace || !taken.has(s.date));
      added = keep.length;
      const dates = new Set(keep.map((s) => s.date));
      return { ...d, shifts: [...d.shifts.filter((s) => !dates.has(s.date)), ...keep] };
    });
    toast(added > 0 ? `${added} jours ajoutés au planning` : 'Aucun jour libre sur cette période');
  };

  return (
    <section className="glass lg section pb">
      <div className="section-head"><h2>Cycle de rotation</h2></div>
      <div className="row">
        <div className="t">
          <div className="a">Planning 2x8 automatique</div>
          <div className="b">1 semaine {matin.name.toLowerCase()}, 1 semaine {apres.name.toLowerCase()}{repos ? ', week-end en repos' : ''}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }} aria-label="Aperçu sur 14 jours">
        <div className="grid7 dow-mini" aria-hidden="true">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i}>{d}</div>)}</div>
        <div className="grid7">
          {preview.map((t, i) => (
            <div key={i} className="mini" style={t ? { background: tint(t.color, 0.2), borderColor: tint(t.color, 0.4), color: textOn(t.color) } : undefined}>
              {t?.code ?? ''}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <div className="flabel">Début du cycle (lundi)</div>
          <DateField label="Début du cycle" value={monday} display={longDate(monday)} onChange={(v) => setStart(mondayOf(v))} />
        </div>
        <div className="grid2">
          <div className="field">
            <div className="flabel">Durée</div>
            <Stepper value={`${weeks} sem.`} label="nombre de semaines" onDec={() => setWeeks(Math.max(1, weeks - 1))} onInc={() => setWeeks(Math.min(52, weeks + 1))} decDisabled={weeks <= 1} incDisabled={weeks >= 52} />
          </div>
          <div className="field">
            <div className="flabel" id="first-lbl">Première semaine</div>
            <div role="radiogroup" aria-labelledby="first-lbl" style={{ display: 'flex', gap: 6 }}>
              {[true, false].map((v) => {
                const t = v ? matin : apres;
                const on = firstMorning === v;
                return (
                  <button key={String(v)} className="chip" role="radio" aria-checked={on} aria-label={t.name} style={{ flex: 1, ...(on ? { background: tint(t.color, 0.22), borderColor: t.color } : {}) }} onClick={() => setFirstMorning(v)}>
                    <i style={{ background: t.color }} /><span>{t.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {data.employers.length > 1 && (
          <div className="field">
            <label htmlFor="cycle-emp">Employeur</label>
            <div className="select-wrap">
              <span>{data.employers.find((e) => e.id === employerId)?.name ?? data.employers[0].name}</span>
              <span className="right muted">{Icon.chevron()}</span>
              <select id="cycle-emp" value={employerId} onChange={(e) => setEmployerId(e.target.value)}>
                {data.employers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="row" style={{ minHeight: 52 }}>
          <div className="t">
            <div className="a">Remplacer les jours déjà remplis</div>
            <div className="b">Sinon, seuls les jours vides sont complétés</div>
          </div>
          <Switch checked={replace} onChange={setReplace} label="Remplacer les jours déjà remplis" />
        </div>
        <button className="btn-secondary" onClick={generate}>
          Générer {weeks} semaine{weeks > 1 ? 's' : ''} à partir du {longDate(monday).replace(/^Lundi /, '')}
        </button>
      </div>
    </section>
  );
}

/* ---------- Feuille d'édition d'un type de poste ---------- */

function TypeSheet({ type, usedBy, canDelete, onClose }: { type: ShiftType | null; usedBy: number; canDelete: boolean; onClose: () => void }) {
  const [t, setT] = useState<ShiftType>(
    () => type ?? { id: newId('type'), name: '', code: '', color: SHIFT_COLORS[5], start: 540, end: 1020, pause: 30, kind: 'work', leaveHours: 7 }
  );
  const set = (p: Partial<ShiftType>) => setT((x) => ({ ...x, ...p }));
  const wrap = (m: number) => ((m % 1440) + 1440) % 1440;
  const valid = t.name.trim().length > 0 && t.code.trim().length > 0;
  const KINDS: [ShiftKind, string][] = [['work', 'Travaillé'], ['rest', 'Repos'], ['leave', 'Congé']];

  const save = (close: () => void) => {
    const clean = { ...t, name: t.name.trim(), code: t.code.trim() };
    update((d) => ({
      ...d,
      shiftTypes: type ? d.shiftTypes.map((x) => (x.id === clean.id ? clean : x)) : [...d.shiftTypes, clean]
    }));
    toast(type ? 'Type de poste modifié' : 'Type de poste ajouté');
    close();
  };
  const remove = (close: () => void) => {
    update((d) => ({ ...d, shiftTypes: d.shiftTypes.filter((x) => x.id !== t.id) }));
    toast('Type de poste supprimé');
    close();
  };

  return (
    <Sheet title={type ? `Modifier « ${type.name} »` : 'Nouveau type de poste'} onClose={onClose}>
      {(close) => (
        <>
          <div className="grid2" style={{ gridTemplateColumns: '1fr 96px' }}>
            <div className="field">
              <label htmlFor="type-nom">Nom</label>
              <input id="type-nom" className="input" maxLength={24} value={t.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex. Journée" />
            </div>
            <div className="field">
              <label htmlFor="type-code">Lettre</label>
              <input id="type-code" className="input num" maxLength={2} value={t.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="J" style={{ textAlign: 'center' }} />
            </div>
          </div>

          <div className="field">
            <div className="flabel" id="color-lbl">Couleur</div>
            <div className="swatches" role="radiogroup" aria-labelledby="color-lbl">
              {SHIFT_COLORS.map((c) => (
                <button key={c} className="swatch" role="radio" aria-checked={t.color === c} aria-label={`Couleur ${c}`} onClick={() => set({ color: c })}>
                  <i style={{ background: c }} />
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <div className="flabel" id="kind-lbl">Nature</div>
            <div className="grid3" role="radiogroup" aria-labelledby="kind-lbl">
              {KINDS.map(([k, label]) => (
                <button key={k} className="chip" role="radio" aria-checked={t.kind === k} style={t.kind === k ? { background: tint(t.color, 0.22), borderColor: t.color } : undefined} onClick={() => set({ kind: k })}>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {t.kind === 'work' && (
            <div className="field">
              <div className="flabel">Horaires par défaut</div>
              <div className="grid3">
                <VStepper label="Début" value={hm(t.start)} onDec={() => set({ start: wrap(t.start - 15) })} onInc={() => set({ start: wrap(t.start + 15) })} decLabel="Début, 15 minutes plus tôt" incLabel="Début, 15 minutes plus tard" />
                <VStepper label="Fin" value={hm(t.end)} onDec={() => set({ end: wrap(t.end - 15) })} onInc={() => set({ end: wrap(t.end + 15) })} decLabel="Fin, 15 minutes plus tôt" incLabel="Fin, 15 minutes plus tard" />
                <VStepper label="Pause" value={`${t.pause} min`} onDec={() => set({ pause: Math.max(0, t.pause - 5) })} onInc={() => set({ pause: Math.min(180, t.pause + 5) })} decLabel="Pause, 5 minutes de moins" incLabel="Pause, 5 minutes de plus" />
              </div>
            </div>
          )}
          {t.kind === 'leave' && (
            <div className="row" style={{ borderTop: 0 }}>
              <div className="t"><div className="a">Heures payées</div><div className="b">Par jour de congé</div></div>
              <Stepper value={`${hours(t.leaveHours)} h`} label="heures payées par jour de congé" onDec={() => set({ leaveHours: Math.max(0, t.leaveHours - 0.5) })} onInc={() => set({ leaveHours: Math.min(12, t.leaveHours + 0.5) })} />
            </div>
          )}
          {t.kind === 'rest' && <div className="hint">Un repos compte 0 heure et 0 €.</div>}
          {type && usedBy > 0 && <div className="hint">Utilisé par {usedBy} jour{usedBy > 1 ? 's' : ''} du planning. Les horaires déjà saisis ne changent pas.</div>}

          <div className="btn-row">
            {type && canDelete && (
              <button className="btn-secondary btn-danger" disabled={usedBy > 0} onClick={() => remove(close)} title={usedBy > 0 ? 'Type utilisé dans le planning' : undefined}>
                Supprimer
              </button>
            )}
            <button className="btn-primary" disabled={!valid} onClick={() => save(close)}>Enregistrer</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
