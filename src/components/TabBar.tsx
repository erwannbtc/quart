// Barre d'onglets reprise de Verdex (src/components/layout/TabBar.tsx), adaptée à Quart.
import { animate, motion, useMotionValue, useTransform, useVelocity } from 'framer-motion';
import { BriefcaseBusiness, House, SlidersHorizontal } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export type Tab = 'home' | 'postes' | 'reglages';

const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: 'home', label: 'Accueil', Icon: House },
  { id: 'postes', label: 'Postes', Icon: BriefcaseBusiness },
  { id: 'reglages', label: 'Réglages', Icon: SlidersHorizontal }
];
const PAD = 8; // marge intérieure de la barre (px)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Petit « cran » sous le doigt quand la goutte franchit un onglet (Android). */
const tick = () => {
  try {
    navigator.vibrate?.(6);
  } catch {
    /* non disponible */
  }
};

/**
 * Barre d'onglets façon Liquid Glass.
 * La pastille de sélection est une « goutte » :
 * - on peut la faire glisser au doigt d'un onglet à l'autre (elle grossit comme une loupe pendant le glisser) ;
 * - elle s'étire selon sa vitesse puis reprend sa forme, et s'aimante sur l'onglet au lâcher ;
 * - un simple toucher sur un onglet fonctionne toujours.
 */
export function TabBar({ tab, onSelect }: { tab: Tab; onSelect: (t: Tab, again: boolean) => void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const drag = useRef<{ startX: number; active: boolean } | null>(null);
  const hoverRef = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const placed = useRef(false);

  const activeIdx = TABS.findIndex((t) => t.id === tab);
  const seg = width ? (width - PAD * 2) / TABS.length : 0;
  const centerOf = (i: number) => PAD + seg * (i + 0.5);
  const pillW = Math.max(0, seg - 6);

  // Position (centre) de la goutte + déformation selon la vitesse
  const pillX = useMotionValue(0);
  const velocity = useVelocity(pillX);
  const stretchX = useTransform(velocity, (v) => 1 + Math.min(Math.abs(v) / 2600, 0.3));
  const squashY = useTransform(stretchX, (s) => 1 / Math.sqrt(s));
  const pillLeft = useTransform(pillX, (x) => x - pillW / 2);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => setWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // La goutte rejoint (et s'aimante sur) l'onglet actif
  useEffect(() => {
    if (!seg || dragging) return;
    const target = centerOf(activeIdx);
    if (!placed.current) {
      pillX.set(target);
      placed.current = true;
    } else {
      animate(pillX, target, { type: 'spring', stiffness: 360, damping: 28, mass: 0.9 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, seg, dragging]);

  const select = (i: number, fromTap: boolean) => {
    const id = TABS[i].id;
    if (id !== tab) onSelect(id, false);
    else if (fromTap) onSelect(id, true);
  };

  /** Coordonnée x dans la barre (corrige le léger agrandissement pendant l'appui). */
  const localX = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect();
    return (clientX - r.left) * (width / r.width);
  };
  const trackLight = (clientX: number, clientY: number) => {
    const el = barRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--lx', `${clientX - r.left}px`);
    el.style.setProperty('--ly', `${clientY - r.top}px`);
  };
  const idxAt = (x: number) => clamp(Math.floor((x - PAD) / seg), 0, TABS.length - 1);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!seg) return;
    drag.current = { startX: e.clientX, active: false };
    setPressed(true);
    trackLight(e.clientX, e.clientY);

    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      trackLight(ev.clientX, ev.clientY);
      if (!d.active && Math.abs(ev.clientX - d.startX) > 6) {
        d.active = true;
        setDragging(true);
      }
      if (d.active) {
        const x = clamp(localX(ev.clientX), centerOf(0), centerOf(TABS.length - 1));
        pillX.set(x);
        const i = idxAt(x);
        if (hoverRef.current !== null && hoverRef.current !== i) tick(); // un cran à chaque onglet franchi
        hoverRef.current = i;
        setHoverIdx(i);
      }
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      setPressed(false);
      hoverRef.current = null;
      const d = drag.current;
      drag.current = null;
      if (d?.active) {
        // un clic peut suivre le relâchement : on l'ignore, la sélection vient du glisser
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 0);
        select(idxAt(clamp(localX(ev.clientX), centerOf(0), centerOf(TABS.length - 1))), false);
        setHoverIdx(null);
        setDragging(false);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const litIdx = dragging && hoverIdx !== null ? hoverIdx : activeIdx;

  return (
    <nav className="tabbar" aria-label="Navigation principale">
      <motion.div
        ref={barRef}
        animate={{ scale: pressed ? 1.03 : 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        onPointerDown={onPointerDown}
        className="liquid-glass tabbar-inner"
        style={{ paddingLeft: PAD, paddingRight: PAD, touchAction: 'none', ['--lglow' as string]: pressed ? 0.11 : 0 }}
      >
        <span className="lg-lens" />

        {/* Goutte de sélection */}
        {seg > 0 && (
          <motion.span
            className="tabbar-pill-slot"
            style={{ left: pillLeft, width: pillW }}
            animate={{ scale: dragging ? 1.14 : 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          >
            <motion.span className="lg-pill" style={{ scaleX: stretchX, scaleY: squashY }} />
          </motion.span>
        )}

        {TABS.map(({ id, label, Icon }, i) => {
          const lit = litIdx === i;
          return (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => {
                if (suppressClick.current) return;
                select(i, true);
              }}
              className="tabbar-btn"
            >
              <motion.span animate={{ scale: lit ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }} style={{ position: 'relative', display: 'flex' }}>
                <Icon size={22} strokeWidth={lit ? 2.1 : 1.7} className={`tabbar-icon${lit ? ' lit' : ''}`} />
              </motion.span>
            </button>
          );
        })}
      </motion.div>
    </nav>
  );
}
