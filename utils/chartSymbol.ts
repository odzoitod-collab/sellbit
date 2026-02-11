/**
 * Символ для виджета TradingView: биржа + пара.
 * BINANCE:XXXUSDT — корректный формат для надёжного отображения графика по всем монетам.
 */

/** Тикеры, у которых на Binance пара называется иначе (редкие случаи). */
const TICKER_OVERRIDES: Record<string, string> = {
  /** USDT как базовая валюта — пары USDTUSDT нет, показываем USDC/USDT. */
  USDT: 'USDCUSDT',
};

const EXCHANGE = 'BINANCE';

/**
 * Возвращает символ для TradingView в формате BINANCE:XXXUSDT.
 * Для отображения в iframe URL нужно передать уже закодированным (encodeURIComponent).
 */
export function getTradingViewSymbol(ticker: string): string {
  const pair = TICKER_OVERRIDES[ticker] ?? `${ticker}USDT`;
  return `${EXCHANGE}:${pair}`;
}

/**
 * Символ для подписи в UI (без биржи): например "BTCUSDT".
 */
export function getTradingViewSymbolLabel(ticker: string): string {
  return TICKER_OVERRIDES[ticker] ?? `${ticker}USDT`;
}
