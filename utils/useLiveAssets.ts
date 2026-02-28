import { useState, useEffect, useRef } from 'react';
import { Asset } from '../types';
import { fetchCryptoPricesInRub, getCachedPrices } from '../lib/cryptoPrices';

const FETCH_INTERVAL_MS = 10_000;
const RETRY_AFTER_MS = 3_000;

function tickerKey(assets: Asset[]): string {
  return assets.map((a) => a.ticker).sort().join(',');
}

/** Начальное состояние: baseAssets + кеш (цены в RUB). Без кеша возвращаем копии base (цены моковые). */
function mergeWithCache(base: Asset[]): Asset[] {
  const cached = getCachedPrices();
  if (!cached || Object.keys(cached).length === 0) return base.map((a) => ({ ...a }));
  return base.map((a) => {
    const data = cached[a.ticker];
    if (!data) return { ...a };
    return { ...a, price: data.price, change24h: data.change24h };
  });
}

/**
 * Слияние base + кеш с сохранением предыдущих реальных цен.
 * Не подменяем реальные цены моковыми: если в кеше нет тикера — оставляем prev.
 */
function mergeWithCachePreservingPrev(base: Asset[], prev: Asset[]): Asset[] {
  const cached = getCachedPrices();
  return base.map((a) => {
    const data = cached?.[a.ticker];
    if (data) return { ...a, price: data.price, change24h: data.change24h };
    const prevAsset = prev.find((p) => p.ticker === a.ticker);
    if (prevAsset) return prevAsset;
    return { ...a };
  });
}

/** Живые цены из API с кешем. Частичное обновление и retry при пустом ответе — без лагов и статичных цен. */
export function useLiveAssets(baseAssets: Asset[]): Asset[] {
  const [assets, setAssets] = useState<Asset[]>(() => mergeWithCache(baseAssets));
  const baseRef = useRef(baseAssets);
  const tickerKeyRef = useRef(tickerKey(baseAssets));

  useEffect(() => {
    const nextKey = tickerKey(baseAssets);
    if (nextKey !== tickerKeyRef.current) {
      tickerKeyRef.current = nextKey;
      baseRef.current = baseAssets;
      setAssets((prev) => mergeWithCachePreservingPrev(baseAssets, prev));
    } else {
      baseRef.current = baseAssets;
    }
  }, [baseAssets]);

  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tickers = baseRef.current.map((a) => a.ticker);
    if (tickers.length === 0) return;

    const update = async () => {
      const prices = await fetchCryptoPricesInRub(tickers);
      setAssets((prev) =>
        prev.map((a) => {
          const data = prices[a.ticker];
          if (!data) return a;
          return { ...a, price: data.price, change24h: data.change24h };
        })
      );
      if (Object.keys(prices).length === 0 && retryTimeoutRef.current === null) {
        retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          update();
        }, RETRY_AFTER_MS);
      }
    };

    update();
    const t = setInterval(update, FETCH_INTERVAL_MS);
    return () => {
      clearInterval(t);
      if (retryTimeoutRef.current != null) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  return assets;
}
