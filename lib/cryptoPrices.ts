/**
 * Цены монет только из бесплатных API.
 * Кеширование в localStorage (цены в RUB) для показа при переходах и обновлении.
 */

const CACHE_KEY = 'neonflow_crypto_prices';
const CACHE_TTL_MS = 30 * 1000; // 30 секунд

export interface CachedPrices {
  prices: Record<string, { price: number; change24h: number }>;
  timestamp: number;
}

export function getCachedPrices(): Record<string, { price: number; change24h: number }> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: CachedPrices = JSON.parse(raw);
    if (!data?.prices || !data?.timestamp) return null;
    if (Date.now() - data.timestamp > CACHE_TTL_MS) return data.prices; // Возвращаем и устаревшие (для мгновенного показа)
    return data.prices;
  } catch {
    return null;
  }
}

function setCachedPrices(prices: Record<string, { price: number; change24h: number }>) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ prices, timestamp: Date.now() } satisfies CachedPrices)
    );
  } catch {}
}

/** Маппинг тикера приложения на id монеты в CoinGecko */
const TICKER_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  TON: 'the-open-network',
  USDT: 'tether',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  SHIB: 'shiba-inu',
  LTC: 'litecoin',
  TRX: 'tron',
  BCH: 'bitcoin-cash',
  NEAR: 'near',
  APT: 'aptos',
  ATOM: 'cosmos',
  XLM: 'stellar',
  ARB: 'arbitrum',
  OP: 'optimism',
  INJ: 'injective-protocol',
  RNDR: 'render-token',
  PEPE: 'pepe',
  FIL: 'filecoin',
  HBAR: 'hedera-hashgraph',
  KAS: 'kaspa',
  VET: 'vechain',
  ICP: 'internet-computer',
  SUI: 'sui',
  SEI: 'sei-network',
  WIF: 'dogwifcoin',
  BONK: 'bonk',
  FLOKI: 'floki',
  STX: 'blockstack',
  TIA: 'celestia',
  IMX: 'immutable-x',
  FET: 'fetch-ai',
  RUNE: 'thorchain',
  AAVE: 'aave',
  MKR: 'maker',
  CRV: 'curve-dao-token',
  UNI: 'uniswap',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  AXS: 'axie-infinity',
  EGLD: 'multiversx',
  FTM: 'fantom',
  ALGO: 'algorand',
};

/** Маппинг тикера на пару Binance (USDT) */
const TICKER_TO_BINANCE: Record<string, string> = {
  BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', TON: 'TONUSDT', USDT: 'USDTUSDT',
  XRP: 'XRPUSDT', DOGE: 'DOGEUSDT', ADA: 'ADAUSDT', AVAX: 'AVAXUSDT', DOT: 'DOTUSDT',
  LINK: 'LINKUSDT', MATIC: 'MATICUSDT', SHIB: 'SHIBUSDT', LTC: 'LTCUSDT', TRX: 'TRXUSDT',
  BCH: 'BCHUSDT', NEAR: 'NEARUSDT', APT: 'APTUSDT', ATOM: 'ATOMUSDT', XLM: 'XLMUSDT',
  ARB: 'ARBUSDT', OP: 'OPUSDT', INJ: 'INJUSDT', RNDR: 'RNDRUSDT', PEPE: 'PEPEUSDT',
  FIL: 'FILUSDT', HBAR: 'HBARUSDT', KAS: 'KASUSDT', VET: 'VETUSDT', ICP: 'ICPUSDT',
  SUI: 'SUIUSDT', SEI: 'SEIUSDT', WIF: 'WIFUSDT', BONK: 'BONKUSDT', FLOKI: 'FLOKIUSDT',
  STX: 'STXUSDT', TIA: 'TIAUSDT', IMX: 'IMXUSDT', FET: 'FETUSDT', RUNE: 'RUNEUSDT',
  AAVE: 'AAVEUSDT', MKR: 'MKRUSDT', CRV: 'CRVUSDT', UNI: 'UNIUSDT', SAND: 'SANDUSDT',
  MANA: 'MANAUSDT', AXS: 'AXSUSDT', EGLD: 'EGLDUSDT', FTM: 'FTMUSDT', ALGO: 'ALGOUSDT',
};

export interface CoinPriceData {
  price: number;
  change24h: number;
}

const FETCH_TIMEOUT_MS = 12_000;

/**
 * Загружает цены и изменение за 24ч в рублях по списку тикеров.
 * Основной: Binance (USD → RUB). Резерв: CoinGecko.
 * Таймаут запроса — не блокирует UI при лагах сети.
 */
export async function fetchCryptoPricesInRub(
  tickers: string[]
): Promise<Record<string, CoinPriceData>> {
  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

  try {
    // 1. Binance (основной, надёжный)
    const symbols = tickers.map((t) => TICKER_TO_BINANCE[t.toUpperCase()]).filter(Boolean);
    if (symbols.length === 0) return {};
    const symbolsParam = encodeURIComponent(JSON.stringify(symbols));
    const [priceRes, rubRes] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${symbolsParam}`, { signal: ac.signal }),
      fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json', { signal: ac.signal }),
    ]);
    clearTimeout(timeoutId);
    if (!priceRes.ok) throw new Error('Binance error');
    const rubData = rubRes.ok ? await rubRes.json() : { usd: { rub: 100 } };
    const usdToRub = rubData?.usd?.rub ?? 100;
    const priceList: { symbol: string; price: string }[] = await priceRes.json();
    const list = Array.isArray(priceList) ? priceList : [priceList];
    const binanceToTicker: Record<string, string> = {};
    Object.entries(TICKER_TO_BINANCE).forEach(([ticker, sym]) => { binanceToTicker[sym] = ticker; });
    const out: Record<string, CoinPriceData> = {};
    for (const { symbol: sym, price } of list) {
      const ticker = binanceToTicker[sym];
      if (ticker && price) out[ticker] = { price: parseFloat(price) * usdToRub, change24h: 0 };
    }
    if (Object.keys(out).length > 0) {
      setCachedPrices(out);
      return out;
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // 2. CoinGecko (резерв)
  const ac2 = new AbortController();
  const t2 = setTimeout(() => ac2.abort(), FETCH_TIMEOUT_MS);
  try {
    const ids = tickers.map((t) => TICKER_TO_COINGECKO_ID[t.toUpperCase()]).filter(Boolean);
    if (ids.length === 0) return {};
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.slice(0, 30).join(',')}&vs_currencies=rub&include_24hr_change=true`;
    const res = await fetch(url, { signal: ac2.signal });
    clearTimeout(t2);
    if (!res.ok) return {};
    const data: Record<string, { rub?: number; rub_24h_change?: number }> = await res.json();
    const out: Record<string, CoinPriceData> = {};
    for (const [id, row] of Object.entries(data)) {
      if (!row || row.rub == null) continue;
      const ticker = COINGECKO_ID_TO_TICKER[id];
      if (!ticker) continue;
      out[ticker] = { price: row.rub, change24h: row.rub_24h_change ?? 0 };
    }
    if (Object.keys(out).length > 0) setCachedPrices(out);
    return out;
  } catch {
    clearTimeout(t2);
    return {};
  }
}

/** Обратный маппинг: coingecko id -> ticker (для разбора ответа по id) */
const COINGECKO_ID_TO_TICKER: Record<string, string> = {};
Object.entries(TICKER_TO_COINGECKO_ID).forEach(([ticker, id]) => {
  COINGECKO_ID_TO_TICKER[id] = ticker;
});

export function getCoinGeckoId(ticker: string): string | undefined {
  return TICKER_TO_COINGECKO_ID[ticker.toUpperCase()];
}
