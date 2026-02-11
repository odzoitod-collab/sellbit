import { useState, useEffect, useRef } from 'react';
import { Asset } from '../types';
import { fetchCryptoPricesInRub } from '../lib/cryptoPrices';

const FETCH_INTERVAL_MS = 60_000; // 1 раз в минуту (лимит CoinGecko без ключа)

/** Живые цены из бесплатного API (CoinGecko). Обновление раз в минуту. */
export function useLiveAssets(baseAssets: Asset[]): Asset[] {
  const [assets, setAssets] = useState<Asset[]>(() => baseAssets.map((a) => ({ ...a })));
  const baseRef = useRef(baseAssets);

  useEffect(() => {
    baseRef.current = baseAssets;
    setAssets(baseAssets.map((a) => ({ ...a })));
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
