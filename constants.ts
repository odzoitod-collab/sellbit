import { Asset } from './types';

export const MOCK_ASSETS: Asset[] = [
  { id: '1', ticker: 'BTC', name: 'Bitcoin', price: 6250000, volume24h: 1250000000, change24h: 2.5 },
  { id: '2', ticker: 'ETH', name: 'Ethereum', price: 320000, volume24h: 850000000, change24h: -1.2 },
  { id: '3', ticker: 'SOL', name: 'Solana', price: 12500, volume24h: 450000000, change24h: 5.8 },
  { id: '4', ticker: 'TON', name: 'Toncoin', price: 650, volume24h: 120000000, change24h: 0.5 },
  { id: '5', ticker: 'USDT', name: 'Tether', price: 92.50, volume24h: 5000000000, change24h: 0.1 },
  { id: '6', ticker: 'XRP', name: 'Ripple', price: 55.20, volume24h: 80000000, change24h: -0.5 },
  { id: '7', ticker: 'DOGE', name: 'Dogecoin', price: 12.80, volume24h: 60000000, change24h: 12.4 },
  { id: '8', ticker: 'ADA', name: 'Cardano', price: 45.10, volume24h: 40000000, change24h: -2.1 },
  { id: '9', ticker: 'AVAX', name: 'Avalanche', price: 3200, volume24h: 35000000, change24h: 1.8 },
  { id: '10', ticker: 'DOT', name: 'Polkadot', price: 680, volume24h: 25000000, change24h: -0.8 },
  { id: '11', ticker: 'LINK', name: 'Chainlink', price: 1450, volume24h: 30000000, change24h: 3.2 },
  { id: '12', ticker: 'MATIC', name: 'Polygon', price: 65.40, volume24h: 28000000, change24h: 0.2 },
];

export const MARKET_ASSETS: Asset[] = [
    ...MOCK_ASSETS,
    { id: '13', ticker: 'SHIB', name: 'Shiba Inu', price: 0.0024, volume24h: 1500000000, change24h: 4.5 },
    { id: '14', ticker: 'LTC', name: 'Litecoin', price: 8500, volume24h: 320000000, change24h: -1.5 },
    { id: '15', ticker: 'TRX', name: 'Tron', price: 12.50, volume24h: 280000000, change24h: 0.8 },
    { id: '16', ticker: 'BCH', name: 'Bitcoin Cash', price: 42000, volume24h: 190000000, change24h: 2.1 },
    { id: '17', ticker: 'NEAR', name: 'NEAR Protocol', price: 650, volume24h: 150000000, change24h: 5.2 },
    { id: '18', ticker: 'APT', name: 'Aptos', price: 850, volume24h: 120000000, change24h: -3.4 },
    { id: '19', ticker: 'ATOM', name: 'Cosmos', price: 920, volume24h: 110000000, change24h: -0.5 },
    { id: '20', ticker: 'XLM', name: 'Stellar', price: 11.20, volume24h: 90000000, change24h: 1.2 },
    { id: '21', ticker: 'ARB', name: 'Arbitrum', price: 115, volume24h: 250000000, change24h: -2.8 },
    { id: '22', ticker: 'OP', name: 'Optimism', price: 240, volume24h: 180000000, change24h: 3.5 },
    { id: '23', ticker: 'INJ', name: 'Injective', price: 3200, volume24h: 140000000, change24h: 8.4 },
    { id: '24', ticker: 'RNDR', name: 'Render', price: 980, volume24h: 160000000, change24h: 6.1 },
    { id: '25', ticker: 'PEPE', name: 'Pepe', price: 0.00085, volume24h: 800000000, change24h: 15.2 },
    { id: '26', ticker: 'FIL', name: 'Filecoin', price: 540, volume24h: 130000000, change24h: -1.8 },
    { id: '27', ticker: 'HBAR', name: 'Hedera', price: 9.50, volume24h: 70000000, change24h: 0.3 },
    { id: '28', ticker: 'KAS', name: 'Kaspa', price: 14.20, volume24h: 45000000, change24h: 4.8 },
    { id: '29', ticker: 'VET', name: 'VeChain', price: 3.80, volume24h: 35000000, change24h: 1.1 },
    { id: '30', ticker: 'ICP', name: 'Internet Computer', price: 1250, volume24h: 110000000, change24h: -4.2 },
];

export const CHART_DATA = [
  { time: '10:00', value: 6240000 },
  { time: '11:00', value: 6245000 },
  { time: '12:00', value: 6230000 },
  { time: '13:00', value: 6260000 },
  { time: '14:00', value: 6250000 },
  { time: '15:00', value: 6280000 },
  { time: '16:00', value: 6250000 },
];