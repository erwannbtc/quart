import { useMemo, useState } from 'react';
import { activeData, update, useStore } from '../lib/store';
import { holidayName, isSunday, shiftPay } from '../lib/pay';
import { newId } from '../lib/defaults';
import { duration, euro, fmt, hm, hours, longDate } from '../lib/format';
import { tint } from '../lib/colors';
import { DateField, Icon, Sheet, VStepper, toast } from '../components/ui';
import type { Shift } from '../lib/types';

const wrap = (m: number) => ((m % 1440) + 1440) % 1440;

export function ShiftSheet({ date, onClose, onSaved }: { date: string; onClose: () => void; onSaved: (date: string) => void }) {
  const st = useStore();
  const data = activeData(st);
  const existing = data.shifts.find((s) => s.date === date);
  const firstWork = data.shiftTypes.find((t) => t.kind === 'work') ?? data.shiftTypes[0];
  const initType = data.shiftTypes.find((t) => t.id === existing?.typeId) ?? firstWork;

  const [form, setForm] = useState<Omit<Shift, 'id'>>(() =>
    existing
      ? { ...existing }
      : { date, typeId: initType.id, start: initType.start, end: initType.end, pause: initType.pause, employerId: data.employers[0].id }
  );

  const type = data.shiftTypes.find((t) => t.id === form.typeId) ?? initType;
  const employer = data.employers.find((e) => e.id === form.employerId) ?? data.employers[0];
  const worked = type.kind === 'work';
  const pay = useMemo(() => shiftPay({ ...form, id: 'preview' }, type, employer, data.settings), [form, type, employer, data.settings]);
  const conflict = form.date !== date ? data.shifts.find((s) => s.date === form.date) : undefined;
  const conflictType = conflict && data.shiftTypes.find((t) => t.id === conflict.typeId);

  const set = (patch: Partial<Omit<Shift, 'id'>>) => setForm((f) => ({ ...f, ...patch }));

  const save = (close: () => void) => {
    const shift: Shift = { ...form, id: existing?.id ?? newId('poste') };
    update((d) => ({ ...d, shifts: [...d.shifts.filter((s) => s.id !== existing?.id && s.date !== form.date), shift] }));
    onSaved(form.date);
    close();
  };

  const remove = (close: () => void) => {
    if (!existing) return;
    update((d) => ({ ...d, shifts: d.shifts.filter((s) => s.id !== existing.id) }));
    onSaved(date);
    toast('Poste supprimé');
    close();
  };

  // Majorations de jour : rattachées au jour où le poste commence.
  const ferie = holidayName(form.date);
  const r = data.settings.rates;
  const notes: string[] = [];
  if (worked && ferie) notes.push(`${ferie} : +${r.holiday} %`);
  else if (worked && isSunday(form.date)) notes.push(`Dimanche : +${r.sunday} %`);
  if (worked && pay.nightHours > 0.001) notes.push(`dont ${duration(pay.nightHours)} de nuit (+${r.night} %)`);

  return (
    <Sheet title={existing ? 'Modifier le poste' : 'Ajouter un poste'} onClose={onClose}>
      {(close) => (
        <>
          <div className="field">
            <div className="flabel" id="type-lbl">Type de poste</div>
            <div className="grid3" role="radiogroup" aria-labelledby="type-lbl">
              {data.shiftTypes.map((t) => {
                const on = t.id === form.typeId;
                return (
                  <button
                    key={t.id}
                    className="chip"
                    role="radio"
                    aria-checked={on}
                    style={on ? { background: tint(t.color, 0.22), borderColor: t.color } : undefined}
                    onClick={() => set(t.kind === 'work' ? { typeId: t.id, start: t.start, end: t.end, pause: t.pause } : { typeId: t.id })}
                  >
                    <i style={{ background: t.color }} />
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <div className="flabel">Date</div>
            <DateField label="Date" value={form.date} display={longDate(form.date)} onChange={(v) => set({ date: v })} />
            {conflictType && <div className="hint warn">Remplacera le poste « {conflictType.name} » déjà prévu ce jour-là.</div>}
          </div>

          <div className={`field ${worked ? 'undim' : 'dim'}`} aria-disabled={!worked}>
            <div className="flabel">Horaires</div>
            <div className="grid3">
              <VStepper label="Début" value={worked ? hm(form.start) : '--:--'} disabled={!worked}
                onDec={() => set({ start: wrap(form.start - 15) })} onInc={() => set({ start: wrap(form.start + 15) })}
                decLabel="Début, 15 minutes plus tôt" incLabel="Début, 15 minutes plus tard" />
              <VStepper label="Fin" value={worked ? hm(form.end) : '--:--'} disabled={!worked}
                onDec={() => set({ end: wrap(form.end - 15) })} onInc={() => set({ end: wrap(form.end + 15) })}
                decLabel="Fin, 15 minutes plus tôt" incLabel="Fin, 15 minutes plus tard" />
              <VStepper label="Pause" value={worked ? `${form.pause} min` : '--'} disabled={!worked}
                onDec={() => set({ pause: Math.max(0, form.pause - 5) })} onInc={() => set({ pause: Math.min(180, form.pause + 5) })}
                decLabel="Pause, 5 minutes de moins" incLabel="Pause, 5 minutes de plus" />
            </div>
            {worked && form.end <= form.start && <div className="hint">Le poste se termine le lendemain.</div>}
          </div>

          <div className="field">
            <label htmlFor="shift-emp">Employeur</label>
            <div className="select-wrap">
              <span>{employer.name}</span>
              <span className="right">{fmt(employer.rate)} €/h<span className="muted">{Icon.chevron()}</span></span>
              <select id="shift-emp" value={form.employerId} onChange={(e) => set({ employerId: e.target.value })}>
                {data.employers.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({fmt(e.rate)} €/h)</option>
                ))}
              </select>
            </div>
          </div>

          <div className="summary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div className="k">Durée payée</div>
              <div className="v">{type.kind === 'leave' ? `${hours(pay.hours)} h (congé)` : duration(pay.hours)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
              <div className="k">Brut estimé</div>
              <div className="v" style={{ color: 'var(--accent)' }}>+{euro(pay.brut)}</div>
            </div>
          </div>
          {notes.length > 0 && <div className="hint" style={{ marginTop: -6 }}>{notes.join(' · ')} · hors heures sup.</div>}

          <div className="btn-row">
            {existing && (
              <button className="btn-secondary btn-danger" onClick={() => remove(close)}>Supprimer</button>
            )}
            <button className="btn-primary" onClick={() => save(close)}>Enregistrer</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
