import { useState, useEffect, useRef } from 'react';
import { Asset } from '../types';

/** Живые цены: обновление каждые ~2.5 сек с лёгким случайным сдвигом */
export function useLiveAssets(baseAssets: Asset[]): Asset[] {
  const [assets, setAssets] = useState<Asset[]>(() => baseAssets.map((a) => ({ ...a })));
  const baseRef = useRef(baseAssets);

  useEffect(() => {
    baseRef.current = baseAssets;
    setAssets(baseAssets.map((a) => ({ ...a })));
  }, [baseAssets]);

  useEffect(() => {
    const t = setInterval(() => {
      setAssets((prev) =>
        prev.map((a, i) => {
          const base = baseRef.current[i];
          if (!base) return a;
          const drift = 0.0008 * (Math.random() - 0.5);
          const newPrice = a.price * (1 + drift);
          const changeDrift = 0.15 * (Math.random() - 0.5);
          const newChange = Math.max(-20, Math.min(20, (base.change24h || 0) + changeDrift));
          return {
            ...a,
            price: newPrice,
            change24h: newChange,
          };
        })
      );
    }, 2500);
    return () => clearInterval(t);
  }, []);

  return assets;
}
