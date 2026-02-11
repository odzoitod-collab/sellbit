/**
 * Цены монет через бесплатный CoinGecko API.
 * Лимит: ~10–30 запросов в минуту (без ключа).
 */

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

export interface CoinPriceData {
  price: number;
  change24h: number;
}

/**
 * Загружает цены и изменение за 24ч в рублях по списку тикеров.
 * Использует CoinGecko Simple Price (бесплатно, без ключа).
 */
export async function fetchCryptoPricesInRub(
  tickers: string[]
): Promise<Record<string, CoinPriceData>> {
  const ids = tickers
    .map((t) => TICKER_TO_COINGECKO_ID[t.toUpperCase()])
    .filter(Boolean);
  if (ids.length === 0) return {};

  const idsParam = ids.join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(idsParam)}&vs_currencies=rub&include_24hr_change=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) return {};
    const data: Record<string, { rub?: number; rub_24h_change?: number }> = await res.json();

    const out: Record<string, CoinPriceData> = {};
    for (const [id, row] of Object.entries(data)) {
      if (!row || row.rub == null) continue;
      const ticker = COINGECKO_ID_TO_TICKER[id];
      if (!ticker) continue;
      out[ticker] = {
        price: row.rub,
        change24h: row.rub_24h_change ?? 0,
      };
    }
    return out;
  } catch {
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
