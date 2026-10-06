import { useRef } from 'react';
import { getRealData, replaceRealData, resetRealData, startDemo, stopDemo, useStore } from '../lib/store';
import { validateData } from '../lib/validate';
import { todayISO } from '../lib/dates';
import { longDate } from '../lib/format';
import { Icon, Switch, toast } from '../components/ui';

export function Reglages() {
  const st = useStore();
  const demo = st.mode === 'demo';
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getRealData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quart-sauvegarde-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Fichier de sauvegarde créé');
  };

  const importFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const data = validateData(parsed);
      if (!data) {
        toast("Ce fichier n'est pas une sauvegarde Quart valide");
        return;
      }
      const n = data.shifts.length;
      if (!window.confirm(`Remplacer vos données actuelles par ce fichier (${n} jour${n > 1 ? 's' : ''} de planning) ?`)) return;
      replaceRealData(data);
      toast(demo ? 'Données importées. Quittez le mode démo pour les voir.' : 'Données importées');
    } catch {
      toast('Fichier illisible');
    }
  };

  const reset = () => {
    if (window.confirm('Effacer toutes vos données (planning, postes, employeurs, taux) ? Cette action est définitive. Pensez à exporter avant.')) {
      resetRealData();
      toast('Données effacées');
    }
  };

  return (
    <div className="screen">
      <div className="page-head">
        <h1>Réglages</h1>
        <p>Vos données restent sur cet appareil.</p>
      </div>

      <div className="stack">
        <section className="glass lg section pb">
          <div className="section-head"><h2>Mode démo</h2></div>
          <div className="row">
            <div className="t">
              <div className="a">Données fictives</div>
              <div className="b">Pour filmer l'app sans montrer vos données</div>
            </div>
            <Switch checked={demo} onChange={(on) => { if (on) { startDemo(); toast('Mode démo activé'); } else { stopDemo(); toast('Retour à vos données'); } }} label="Mode démo" />
          </div>
          <p className="text-block" style={{ margin: 0 }}>
            {demo && st.demo
              ? `Démo active : employeur fictif « Atelier Nord », 14,20 €/h. Aujourd'hui est simulé au ${longDate(st.demo.today).toLowerCase()}. Vos vraies données sont intactes : désactivez pour les retrouver.`
              : 'Charge un planning fictif (Atelier Nord, 14,20 €/h, 151,67 h/mois, cotisations 22 %). Vos vraies données ne sont ni modifiées ni affichées. Les changements faits pendant la démo sont jetés quand vous la quittez.'}
          </p>
        </section>

        <section className="glass lg section pb">
          <div className="section-head"><h2>Vos données</h2></div>
          <p className="text-block first">
            Tout est enregistré uniquement dans ce navigateur. Exportez régulièrement un fichier de sauvegarde, par exemple avant de changer de téléphone.
            {demo && ' Ces boutons concernent vos vraies données, pas la démo.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn-secondary" onClick={exportData}>{Icon.download()} Exporter (fichier JSON)</button>
            <button className="btn-secondary" onClick={() => fileRef.current?.click()}>{Icon.upload()} Importer un fichier</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
                e.target.value = '';
              }}
            />
            <button className="btn-secondary btn-danger" onClick={reset}>Tout effacer</button>
          </div>
        </section>

        <section className="glass lg section pb">
          <div className="section-head"><h2>Règles de calcul</h2></div>
          <ul className="rules">
            <li><b>Durée payée</b> = fin − début − pause. Un poste de nuit qui passe minuit est compté en entier.</li>
            <li><b>Un poste compte pour le jour où il commence</b> : un poste qui débute un dimanche ou un jour férié est majoré en entier ; une nuit du samedi au dimanche ne l'est pas.</li>
            <li>Dimanche et férié le même jour : seule la majoration du <b>jour férié</b> s'applique.</li>
            <li><b>Nuit</b> : taux et plage propres à chaque employeur ; seules les heures dans la plage sont majorées, pause répartie au prorata.</li>
            <li><b>Heures sup.</b> : au-delà des heures du contrat, par mois et par employeur.</li>
            <li>Les majorations s'additionnent. <b>Net estimé</b> = brut × (1 − cotisations).</li>
            <li>Jours fériés : les 11 jours fériés nationaux, dont Pâques, l'Ascension et la Pentecôte calculés chaque année.</li>
          </ul>
        </section>

        <section className="glass lg section pb">
          <div className="section-head"><h2>À propos</h2></div>
          <p className="text-block first" style={{ color: 'var(--text)' }}>
            Les montants sont des <b>estimations</b>. Elles ne remplacent pas la fiche de paie.
          </p>
          <p className="text-block" style={{ margin: 0 }}>
            Quart fonctionne sans compte et hors ligne. Aucune donnée n'est envoyée sur internet, aucun suivi. Version 1.0.
          </p>
        </section>
      </div>
    </div>
  );
}
