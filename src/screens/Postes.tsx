import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { activeData, activeToday, update, useStore } from '../lib/store';
import { newId, WORK_TEMPLATES } from '../lib/defaults';
import { addDays, dayOfWeek, mondayOf } from '../lib/dates';
import { euro, fmt, hm, hours, longDate, parseDecimal, parseHM } from '../lib/format';
import { SHIFT_COLORS, textOn, tint } from '../lib/colors';
import { DateField, Icon, Sheet, Stepper, Switch, VStepper, toast } from '../components/ui';
import type { AppData, Employer, Rates, Shift, ShiftKind, ShiftType } from '../lib/types';

type Editing = { type: ShiftType | null; employerId: string | null };

export function Postes() {
  const st = useStore();
  const data = activeData(st);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const open = data.employers.find((e) => e.id === openId);

  const addEmployer = () => {
    const id = newId('emp');
    update((d) => ({
      ...d,
      employers: [...d.employers, { id, name: `Employeur ${d.employers.length + 1}`, rate: d.employers[0]?.rate ?? 12, contractHours: 0 }]
    }));
    setOpenId(id);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="screen">
      {open ? (
        <EmployerPage
          key={open.id}
          data={data}
          employer={open}
          today={activeToday(st)}
          onBack={() => {
            setOpenId(null);
            window.scrollTo({ top: 0 });
          }}
          onEditType={(type) => setEditing({ type, employerId: open.id })}
        />
      ) : (
        <>
          <div className="page-head">
            <h1>Postes et taux</h1>
            <p>Chaque employeur a son taux, son contrat et ses postes.</p>
          </div>
          <div className="stack">
            <section className="glass lg section">
              <div className="section-head">
                <h2>{data.employers.length > 1 ? 'Employeurs' : 'Employeur'}</h2>
                <button className="link-btn" onClick={addEmployer}>Ajouter</button>
              </div>
              {data.employers.map((e) => {
                const types = data.shiftTypes.filter((t) => t.employerId === e.id);
                return (
                  <button key={e.id} className="row row-btn" onClick={() => { setOpenId(e.id); window.scrollTo({ top: 0 }); }} aria-label={`Ouvrir ${e.name}`}>
                    <span className="dots" aria-hidden="true">
                      {types.slice(0, 4).map((t) => <i key={t.id} style={{ background: t.color }} />)}
                      {types.length === 0 && <i style={{ background: 'var(--field-border)' }} />}
                    </span>
                    <div className="t" style={{ flexGrow: 1 }}>
                      <div className="a">{e.name}</div>
                      <div className="b num-lite">
                        {fmt(e.rate)} €/h · {e.contractHours > 0 ? `${hours(e.contractHours)} h/mois` : 'sans contrat'} · {types.length} poste{types.length > 1 ? 's' : ''}
                      </div>
                    </div>
                    <ChevronRight size={18} className="muted" aria-hidden="true" />
                  </button>
                );
              })}
            </section>

            <CommonTypes data={data} onEdit={(type) => setEditing({ type, employerId: null })} />
            <Majorations data={data} />
            <Cotisations data={data} />
          </div>
        </>
      )}

      {editing && (
        <TypeSheet
          type={editing.type}
          employerId={editing.employerId}
          usedBy={editing.type ? data.shifts.filter((s) => s.typeId === editing.type!.id).length : 0}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* ---------- Page d'un employeur ---------- */

function EmployerPage({ data, employer: e, today, onBack, onEditType }: {
  data: AppData;
  employer: Employer;
  today: string;
  onBack: () => void;
  onEditType: (t: ShiftType | null) => void;
}) {
  const types = data.shiftTypes.filter((t) => t.employerId === e.id);
  const patch = (p: Partial<Employer>) => update((d) => ({ ...d, employers: d.employers.map((x) => (x.id === e.id ? { ...x, ...p } : x)) }));
  const usedDays = data.shifts.filter((s) => s.employerId === e.id).length;

  const addTemplate = (key: string) => {
    const tpl = WORK_TEMPLATES.find((t) => t.key === key)!;
    const { key: _k, ...rest } = tpl;
    update((d) => ({ ...d, shiftTypes: [...d.shiftTypes, { ...rest, id: newId('type'), employerId: e.id }] }));
  };

  const remove = () => {
    if (usedDays > 0) {
      toast(`Impossible : ${usedDays} jour${usedDays > 1 ? 's' : ''} du planning utilisent « ${e.name} »`);
      return;
    }
    if (!window.confirm(`Supprimer « ${e.name} » et ses postes ?`)) return;
    update((d) => ({
      ...d,
      employers: d.employers.filter((x) => x.id !== e.id),
      shiftTypes: d.shiftTypes.filter((t) => t.employerId !== e.id)
    }));
    toast('Employeur supprimé');
    onBack();
  };

  const missing = WORK_TEMPLATES.filter((tpl) => !types.some((t) => t.name === tpl.name));

  return (
    <>
      <button className="back-btn" onClick={onBack}>
        <ChevronLeft size={20} aria-hidden="true" /> Postes et taux
      </button>
      <div className="page-head" style={{ paddingTop: 4 }}>
        <h1>{e.name}</h1>
        <p>Taux, contrat et postes de cet employeur.</p>
      </div>

      <div className="stack">
        <section className="glass lg section pb">
          <div className="section-head"><h2>Employeur</h2></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="field">
              <label htmlFor="emp-nom">Nom</label>
              <TextInput id="emp-nom" value={e.name} maxLength={60} onCommit={(name) => patch({ name })} />
            </div>
            <div className="grid2">
              <div className="field">
                <label htmlFor="emp-taux">Taux horaire brut (€/h)</label>
                <DecimalInput id="emp-taux" value={e.rate} max={1000} onCommit={(rate) => patch({ rate })} />
              </div>
              <div className="field">
                <label htmlFor="emp-h">Heures contrat / mois</label>
                <DecimalInput id="emp-h" value={e.contractHours} max={744} onCommit={(contractHours) => patch({ contractHours })} />
              </div>
            </div>
            <div className="hint">0 h de contrat (intérim sans volume fixe) : pas d'heures sup. calculées.</div>
          </div>
        </section>

        <section className="glass lg section">
          <div className="section-head">
            <h2>Postes</h2>
            <button className="link-btn" onClick={() => onEditType(null)}>Ajouter</button>
          </div>
          {types.map((t) => (
            <div className="row" key={t.id}>
              <span className="typebar" style={{ background: t.color }} />
              <div className="t" style={{ flexGrow: 1 }}>
                <div className="a">{t.name}</div>
                <div className="b">Pause {t.pause} min</div>
              </div>
              <div className="num" style={{ fontSize: 13, color: 'var(--text-4)' }}>{hm(t.start)} – {hm(t.end)}</div>
              <button className="icon-btn" style={{ marginRight: -10 }} aria-label={`Modifier le poste ${t.name}`} onClick={() => onEditType(t)}>
                {Icon.pencil()}
              </button>
            </div>
          ))}
          {missing.length > 0 && (
            <div className="quick">
              <div className="hint">{types.length === 0 ? 'Aucun poste. Ajout rapide :' : 'Ajout rapide :'}</div>
              <div className="quick-row">
                {missing.map((tpl) => (
                  <button key={tpl.key} className="chip" onClick={() => addTemplate(tpl.key)} aria-label={`Ajouter le poste ${tpl.name}, ${hm(tpl.start)} à ${hm(tpl.end)}`}>
                    <i style={{ background: tpl.color }} /><span>+ {tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {types.length > 0 && <Cycle data={data} employer={e} types={types} today={today} />}

        {data.employers.length > 1 && (
          <button className="btn-secondary btn-danger" onClick={remove}>Supprimer cet employeur</button>
        )}
      </div>
    </>
  );
}

/* ---------- Jours sans travail (communs à tous les employeurs) ---------- */

function CommonTypes({ data, onEdit }: { data: AppData; onEdit: (t: ShiftType | null) => void }) {
  const common = data.shiftTypes.filter((t) => t.employerId === null);
  return (
    <section className="glass lg section">
      <div className="section-head">
        <h2>Jours sans travail</h2>
        <button className="link-btn" onClick={() => onEdit(null)}>Ajouter</button>
      </div>
      {common.map((t) => (
        <div className="row" key={t.id}>
          <span className="typebar" style={{ background: t.color }} />
          <div className="t" style={{ flexGrow: 1 }}>
            <div className="a">{t.name}</div>
            <div className="b">{t.kind === 'leave' ? `Congé payé · ${hours(t.leaveHours)} h` : 'Non travaillé · 0 h'}</div>
          </div>
          <button className="icon-btn" style={{ marginRight: -10 }} aria-label={`Modifier ${t.name}`} onClick={() => onEdit(t)}>
            {Icon.pencil()}
          </button>
        </div>
      ))}
      <div className="hint" style={{ padding: '2px 0 12px' }}>Communs à tous les employeurs.</div>
    </section>
  );
}

/* ---------- Champs à la française (validés à la sortie du champ) ---------- */

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

/* ---------- Générateur de cycle (2x8 ou rotation sur deux postes) ---------- */

function TypeChips({ types, value, onChange, label }: { types: ShiftType[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <div className="quick-row" role="radiogroup" aria-label={label}>
      {types.map((t) => {
        const on = t.id === value;
        return (
          <button key={t.id} className="chip" role="radio" aria-checked={on} style={on ? { background: tint(t.color, 0.22), borderColor: t.color } : undefined} onClick={() => onChange(t.id)}>
            <i style={{ background: t.color }} /><span>{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function Cycle({ data, employer, types, today }: { data: AppData; employer: Employer; types: ShiftType[]; today: string }) {
  const repos = data.shiftTypes.find((t) => t.kind === 'rest' && t.employerId === null);
  const nextMonday = dayOfWeek(today) === 1 ? today : addDays(mondayOf(today), 7);
  const [start, setStart] = useState(nextMonday);
  const [weeks, setWeeks] = useState(4);
  const [week1, setWeek1] = useState(types[0].id);
  const [week2, setWeek2] = useState((types[1] ?? types[0]).id);
  const [replace, setReplace] = useState(false);
  const monday = mondayOf(start);
  const find = (id: string) => types.find((t) => t.id === id) ?? types[0];
  const order = [find(week1), find(week2)];

  const typeFor = (i: number): ShiftType | undefined => (i % 7 >= 5 ? repos : order[Math.floor(i / 7) % 2]);
  const preview = Array.from({ length: 14 }, (_, i) => typeFor(i));

  const generate = () => {
    const created: Shift[] = [];
    for (let i = 0; i < weeks * 7; i++) {
      const t = typeFor(i);
      if (!t) continue;
      created.push({ id: newId('poste'), date: addDays(monday, i), typeId: t.id, start: t.start, end: t.end, pause: t.pause, employerId: employer.id });
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
          <div className="a">Planning automatique</div>
          <div className="b">Semaines alternées du lundi au vendredi{repos ? ', week-end en repos' : ''}</div>
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
        {types.length > 1 && (
          <>
            <div className="field"><div className="flabel">Semaine 1</div><TypeChips types={types} value={week1} onChange={setWeek1} label="Poste de la semaine 1" /></div>
            <div className="field"><div className="flabel">Semaine 2</div><TypeChips types={types} value={week2} onChange={setWeek2} label="Poste de la semaine 2" /></div>
          </>
        )}
        <div className="field">
          <div className="flabel">Début du cycle (lundi)</div>
          <DateField label="Début du cycle" value={monday} display={longDate(monday)} onChange={(v) => setStart(mondayOf(v))} />
        </div>
        <div className="row" style={{ minHeight: 52 }}>
          <div className="t"><div className="a">Durée</div></div>
          <Stepper value={`${weeks} sem.`} label="nombre de semaines" onDec={() => setWeeks(Math.max(1, weeks - 1))} onInc={() => setWeeks(Math.min(52, weeks + 1))} decDisabled={weeks <= 1} incDisabled={weeks >= 52} />
        </div>
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

/* ---------- Feuille d'édition d'un poste (d'un employeur) ou d'un jour sans travail ---------- */

function TypeSheet({ type, employerId, usedBy, onClose }: { type: ShiftType | null; employerId: string | null; usedBy: number; onClose: () => void }) {
  const isWork = employerId !== null;
  const [t, setT] = useState<ShiftType>(
    () =>
      type ??
      (isWork
        ? { id: newId('type'), name: '', code: '', color: SHIFT_COLORS[5], start: 540, end: 1020, pause: 30, kind: 'work', leaveHours: 0, employerId }
        : { id: newId('type'), name: '', code: '', color: SHIFT_COLORS[6], start: 0, end: 0, pause: 0, kind: 'leave', leaveHours: 7, employerId: null })
  );
  const set = (p: Partial<ShiftType>) => setT((x) => ({ ...x, ...p }));
  const wrap = (m: number) => ((m % 1440) + 1440) % 1440;
  const valid = t.name.trim().length > 0 && t.code.trim().length > 0;
  const KINDS: [ShiftKind, string][] = [['rest', 'Repos (0 h)'], ['leave', 'Congé payé']];

  const save = (close: () => void) => {
    const clean = { ...t, name: t.name.trim(), code: t.code.trim() };
    update((d) => ({
      ...d,
      shiftTypes: type ? d.shiftTypes.map((x) => (x.id === clean.id ? clean : x)) : [...d.shiftTypes, clean]
    }));
    toast(type ? 'Modifié' : 'Ajouté');
    close();
  };
  const remove = (close: () => void) => {
    update((d) => ({ ...d, shiftTypes: d.shiftTypes.filter((x) => x.id !== t.id) }));
    toast('Supprimé');
    close();
  };

  const title = type ? `Modifier « ${type.name} »` : isWork ? 'Nouveau poste' : 'Nouveau jour sans travail';

  return (
    <Sheet title={title} onClose={onClose}>
      {(close) => (
        <>
          <div className="grid2" style={{ gridTemplateColumns: '1fr 96px' }}>
            <div className="field">
              <label htmlFor="type-nom">Nom</label>
              <input id="type-nom" className="input" maxLength={24} value={t.name} onChange={(e) => set({ name: e.target.value })} placeholder={isWork ? 'Ex. Journée' : 'Ex. Arrêt maladie'} />
            </div>
            <div className="field">
              <label htmlFor="type-code">Lettre</label>
              <input id="type-code" className="input num" maxLength={2} value={t.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder={isWork ? 'J' : 'AM'} style={{ textAlign: 'center' }} />
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

          {!isWork && (
            <div className="field">
              <div className="flabel" id="kind-lbl">Nature</div>
              <div className="grid2" role="radiogroup" aria-labelledby="kind-lbl">
                {KINDS.map(([k, label]) => (
                  <button key={k} className="chip" role="radio" aria-checked={t.kind === k} style={t.kind === k ? { background: tint(t.color, 0.22), borderColor: t.color } : undefined} onClick={() => set({ kind: k })}>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
              <div className="t"><div className="a">Heures payées</div><div className="b">Par jour</div></div>
              <Stepper value={`${hours(t.leaveHours)} h`} label="heures payées par jour" onDec={() => set({ leaveHours: Math.max(0, t.leaveHours - 0.5) })} onInc={() => set({ leaveHours: Math.min(12, t.leaveHours + 0.5) })} />
            </div>
          )}
          {type && usedBy > 0 && <div className="hint">Utilisé par {usedBy} jour{usedBy > 1 ? 's' : ''} du planning. Les horaires déjà saisis ne changent pas.</div>}

          <div className="btn-row">
            {type && (
              <button className="btn-secondary btn-danger" disabled={usedBy > 0} onClick={() => remove(close)} title={usedBy > 0 ? 'Utilisé dans le planning' : undefined}>
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
