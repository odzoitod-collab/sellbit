import { useState, useEffect, useRef } from 'react';
import { Asset } from '../types';
import { fetchCryptoPricesInRub, getCachedPrices } from '../lib/cryptoPrices';

const FETCH_INTERVAL_MS = 60_000; // обновление раз в минуту

/** Начальное состояние: baseAssets + кеш (цены в RUB) */
function mergeWithCache(base: Asset[]): Asset[] {
  const cached = getCachedPrices();
  if (!cached || Object.keys(cached).length === 0) return base.map((a) => ({ ...a }));
  return base.map((a) => {
    const data = cached[a.ticker];
    if (!data) return { ...a };
    return { ...a, price: data.price, change24h: data.change24h };
  });
}

/** Живые цены из API с кешем. Цены в RUB — конвертация в валюту через CurrencyContext. */
export function useLiveAssets(baseAssets: Asset[]): Asset[] {
  const [assets, setAssets] = useState<Asset[]>(() => mergeWithCache(baseAssets));
  const baseRef = useRef(baseAssets);

  useEffect(() => {
    baseRef.current = baseAssets;
    setAssets(mergeWithCache(baseAssets));
  }, [baseAssets]);

  useEffect(() => {
    const tickers = baseRef.current.map((a) => a.ticker);
    if (tickers.length === 0) return;

    const update = async () => {
      const prices = await fetchCryptoPricesInRub(tickers);
      if (Object.keys(prices).length === 0) return;
      setAssets((prev) =>
        prev.map((a) => {
          const data = prices[a.ticker];
          if (!data) return a;
          return {
            ...a,
            price: data.price,
            change24h: data.change24h,
          };
        })
      );
    };

    update();
    const t = setInterval(update, FETCH_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  return assets;
}
