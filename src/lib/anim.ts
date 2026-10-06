import { useEffect, useRef, useState } from 'react';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Fait glisser un nombre vers sa cible : 1,5 s depuis 0 à la première
 * apparition, puis 0,6 s à chaque changement (design : « count » et « ringUpdate »).
 */
export function useTween(target: number, firstMs = 1500, laterMs = 600): number {
  const [value, setValue] = useState(() => (reduced() ? target : 0));
  const current = useRef(value);
  const introDone = useRef(false);

  useEffect(() => {
    if (reduced()) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    if (from === target) {
      introDone.current = true;
      return;
    }
    const duration = introDone.current ? laterMs : firstMs;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const v = from + (target - from) * easeOutCubic(p);
      current.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(step);
      else introDone.current = true;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, firstMs, laterMs]);

  return value;
}
