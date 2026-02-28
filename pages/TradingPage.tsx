import React, { useRef, useState, useEffect } from 'react';
import { Asset, Deal } from '../types';
import { ArrowLeft, Clock, Zap, Check, X, ChevronDown, Info, TrendingUp, BarChart3, FileText } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import { usePin } from '../context/PinContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { useWebAuth } from '../context/WebAuthContext';
import { getTradingViewSymbol, getTradingViewSymbolLabel } from '../utils/chartSymbol';
import { fetchCryptoPricesInRub } from '../lib/cryptoPrices';
import { spotBuy, spotSell } from '../lib/spot';
import type { SpotHolding } from '../types';
import CoinsPage from './CoinsPage';

const MIN_DEAL_RUB = 100;

interface TradingPageProps {
  asset: Asset | null;
  balance: number;
  tradingBlocked?: boolean;
  onBack: () => void;
  onOpenDeal: (deal: Deal) => void;
  onChangeAsset?: (asset: Asset) => void;
  spotHoldings?: SpotHolding[];
  onSpotComplete?: () => void;
  onReferralSpotBuy?: (ticker: string, amountRub: number) => void;
  initialTradeType?: 'futures' | 'spot';
  initialSpotAction?: 'buy' | 'sell';
}

type Tab = 'CHART' | 'TRADE' | 'RULES';
type Side = 'UP' | 'DOWN';

const TIMEFRAMES = [
    { label: '10с', sec: 10 },
    { label: '30с', sec: 30 },
    { label: '1м', sec: 60 },
    { label: '5м', sec: 300 },
];

const TradingPage: React.FC<TradingPageProps> = ({
  asset,
  balance,
  tradingBlocked = false,
  onBack,
  onOpenDeal,
  onChangeAsset,
  spotHoldings = [],
  onSpotComplete,
  onReferralSpotBuy,
  initialTradeType,
  initialSpotAction,
}) => {
  const toast = useToast();
  const { user, tgid } = useUser();
  const { webUserId } = useWebAuth();
  const { requirePin } = usePin();
  const { formatPrice, convertFromRub, symbol, currencyCode } = useCurrency();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('TRADE');
  const [tradeType, setTradeType] = useState<'futures' | 'spot'>(initialTradeType ?? 'futures');
  const [spotAction, setSpotAction] = useState<'buy' | 'sell'>(initialSpotAction ?? 'buy');
  const [spotAmountRub, setSpotAmountRub] = useState<string>('1000');
  const [spotQuantity, setSpotQuantity] = useState<string>('');
  const [spotLoading, setSpotLoading] = useState(false);
  const [leverage, setLeverage] = useState(10);
  const [amount, setAmount] = useState<string>('1000');
  const [duration, setDuration] = useState<number>(30);
  const [side, setSide] = useState<Side>('UP');
  const [livePrice, setLivePrice] = useState(asset?.price ?? 0);
  const [showAssetSearch, setShowAssetSearch] = useState(false);

  const prevLivePriceRef = useRef<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'flat'>('flat');

  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSpotConfirm, setShowSpotConfirm] = useState<'buy' | 'sell' | null>(null);

  const [asks, setAsks] = useState<{price: number, size: number}[]>([]);
  const [bids, setBids] = useState<{price: number, size: number}[]>([]);
  const [orderBookBase, setOrderBookBase] = useState(0);

  const userIdNum = user?.user_id ?? (tgid ? Number(tgid) : webUserId ?? 0);
  const currentHolding = spotHoldings.find((h) => h.ticker === asset?.ticker);
  const holdingAmount = currentHolding?.amount ?? 0;

  useEffect(() => {
    if (initialTradeType) setTradeType(initialTradeType);
    if (initialSpotAction) setSpotAction(initialSpotAction);
    if (initialSpotAction === 'sell' && asset && currentHolding) {
      setSpotQuantity(String(currentHolding.amount));
    }
  }, [initialTradeType, initialSpotAction, asset?.ticker, currentHolding?.amount]);

  if (!asset) return <div className="p-10 text-center text-neutral-500">{t('asset_not_selected')}</div>;

  const quote = (currencyCode || 'USD').toUpperCase();
  const pairLabel = `${asset.ticker} ${quote}`;

  // Живая цена в шапке - обновляем из API каждые 10 секунд
  useEffect(() => {
    if (!asset) return;
    
    const updatePrice = async () => {
      try {
        const prices = await fetchCryptoPricesInRub([asset.ticker]);
        if (prices[asset.ticker]) {
          const next = prices[asset.ticker].price;
          const prev = prevLivePriceRef.current;

          if (prev == null) {
            prevLivePriceRef.current = next;
            setPriceDirection('flat');
          } else if (next > prev) {
            prevLivePriceRef.current = next;
            setPriceDirection('up');
          } else if (next < prev) {
            prevLivePriceRef.current = next;
            setPriceDirection('down');
          } else {
            prevLivePriceRef.current = next;
            setPriceDirection('flat');
          }

          setLivePrice(next);
        }
      } catch (error) {
        console.error('Failed to fetch price:', error);
      }
    };

    // При смене актива: сбрасываем направление (первый тик будет нейтральным)
    prevLivePriceRef.current = null;
    setPriceDirection('flat');
    setLivePrice(asset.price);
    
    // Обновляем цену каждые 10 секунд
    updatePrice();
    const t = setInterval(updatePrice, 10000);
    return () => clearInterval(t);
  }, [asset?.ticker, asset?.price]);

  // Живой стакан: обновляем на основе реальной цены
  useEffect(() => {
    if (livePrice <= 0) return;
    
    setOrderBookBase(livePrice);
    const generate = (b: number, type: 'ask' | 'bid') =>
      Array.from({ length: 8 }).map((_, i) => {
        const diff = b * (0.0003 * (i + 1) + Math.random() * 0.0002);
        const price = type === 'ask' ? b + diff : b - diff;
        return { price, size: 0.5 + Math.random() * 2 };
      });
    setAsks(generate(livePrice, 'ask').reverse());
    setBids(generate(livePrice, 'bid'));
  }, [livePrice]);

  const handlePreTrade = () => {
      if (tradingBlocked) {
        Haptic.error();
        toast.show(t('trading_blocked_toast'), 'error');
        return;
      }
      Haptic.light();
      const numAmount = parseInt(amount) || 0;
      if (numAmount <= 0) {
          Haptic.error();
          return;
      }
      if (numAmount < MIN_DEAL_RUB) {
          Haptic.error();
          toast.show(`${t('min_deal_toast', { amount: formatPrice(MIN_DEAL_RUB) })} ${symbol}`, 'error');
          return;
      }
      if (numAmount > balance) {
          Haptic.error();
          toast.show(t('insufficient_balance'), 'error');
          return;
      }
      setShowConfirm(true);
  };

  const handleConfirmTrade = () => {
      setShowConfirm(false);
      setShowSuccess(true);
      
      // Animation delay before actually creating deal and navigating
      setTimeout(() => {
          const numAmount = parseInt(amount) || 0;
          const newDeal: Deal = {
            id: Date.now().toString(),
            assetTicker: asset.ticker,
            side: side,
            amount: numAmount,
            leverage: leverage,
            entryPrice: livePrice,
            startTime: Date.now(),
            durationSeconds: duration,
            status: 'ACTIVE'
          };
          onOpenDeal(newDeal);
          setShowSuccess(false);
      }, 1500);
  };

  const handleSpotBuy = async () => {
    if (!userIdNum || livePrice <= 0) return;
    const amountRub = parseFloat(spotAmountRub) || 0;
    if (amountRub < MIN_DEAL_RUB) {
      toast.show(`${t('min_deal_toast', { amount: formatPrice(MIN_DEAL_RUB) })} ${symbol}`, 'error');
      return;
    }
    if (amountRub > balance) {
      toast.show(t('insufficient_balance'), 'error');
      return;
    }
    setSpotLoading(true);
    const res = await spotBuy(userIdNum, asset.ticker, amountRub, livePrice);
    setSpotLoading(false);
    setShowSpotConfirm(null);
    if (res.ok) {
      toast.show(t('deal_created'), 'success');
      onSpotComplete?.();
      onReferralSpotBuy?.(asset.ticker, amountRub);
    } else {
      toast.show(res.error || t('deal_creation_error'), 'error');
    }
  };

  const handleSpotSell = async () => {
    if (!userIdNum || livePrice <= 0) return;
    const qty = parseFloat(spotQuantity) || 0;
    if (qty <= 0 || qty > holdingAmount) {
      toast.show(t('insufficient_balance'), 'error');
      return;
    }
    setSpotLoading(true);
    const res = await spotSell(userIdNum, asset.ticker, qty, livePrice);
    setSpotLoading(false);
    setShowSpotConfirm(null);
    if (res.ok) {
      toast.show(t('deal_created'), 'success');
      onSpotComplete?.();
    } else {
      toast.show(res.error || t('deal_creation_error'), 'error');
    }
  };

  const handleSpotConfirmWithPin = () => {
    const uid = tgid || webUserId?.toString();
    if (showSpotConfirm === 'buy') {
      if (uid) requirePin(uid, t('enter_pin_for_confirm'), handleSpotBuy);
      else handleSpotBuy();
    } else if (showSpotConfirm === 'sell') {
      if (uid) requirePin(uid, t('enter_pin_for_confirm'), handleSpotSell);
      else handleSpotSell();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] animate-fade-in relative overflow-hidden max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
      {/* 1. Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#050505] border-b border-white/5 z-20 lg:px-6 lg:py-4">
        <div className="flex items-center space-x-3">
            <button onClick={() => { Haptic.tap(); onBack(); }} className="text-neutral-400 hover:text-white active:scale-90 transition-transform">
                <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        Haptic.tap();
                        setShowAssetSearch(true);
                      }}
                      className="text-lg font-bold text-white tracking-wide hover:text-neon transition-colors active:scale-[0.99]"
                      aria-label={t('search_pair')}
                    >
                      {pairLabel}
                    </button>
                </div>
            </div>
        </div>
        <div className="flex items-center space-x-2">
             <span className={`text-sm font-mono font-bold ${
               priceDirection === 'up' ? 'text-green-500' : priceDirection === 'down' ? 'text-red-500' : 'text-white'
             }`}>
                {formatPrice(livePrice)} {symbol}
            </span>
        </div>
      </header>

      {/* 2. Tabs — График | Торговля | Правила */}
      <div className="flex items-stretch pt-0 border-b border-white/5 z-20 bg-[#050505]">
        <button 
            onClick={() => { Haptic.tap(); setActiveTab('CHART'); }}
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'CHART' ? 'text-neon' : 'text-neutral-500'}`}
        >
            {t('chart')}
            {activeTab === 'CHART' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-neon shadow-[0_0_8px_#a3e635]" />}
        </button>
        <button 
            onClick={() => { Haptic.tap(); setActiveTab('TRADE'); }}
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'TRADE' ? 'text-neon' : 'text-neutral-500'}`}
        >
            {t('trade')}
            {activeTab === 'TRADE' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-neon shadow-[0_0_8px_#a3e635]" />}
        </button>
        <button 
            onClick={() => { Haptic.tap(); setActiveTab('RULES'); }}
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'RULES' ? 'text-neon' : 'text-neutral-500'}`}
        >
            {t('rules')}
            {activeTab === 'RULES' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-neon shadow-[0_0_8px_#a3e635]" />}
        </button>
      </div>

      {/* 3. Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* VIEW: CHART — график ровно по рамкам, под ним инфо об активе */}
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab === 'CHART' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="flex-1 flex flex-col min-h-0 px-3 pt-3 pb-2">
            {/* Контейнер графика — ровно по рамкам, скругления по границам сайта */}
            <div className="flex-1 min-h-[220px] w-full max-w-full rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-[0_0_0_1px_rgba(163,230,53,0.06),inset_0_1px_0_rgba(255,255,255,0.03)] relative">
              <iframe
                title={t('chart')}
                className="absolute inset-0 w-full h-full rounded-xl border-0"
                src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(getTradingViewSymbol(asset.ticker))}&interval=5&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=0&saveimage=0&toolbarbg=0a0a0a&studies=[]&hide_legend=1&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=ru&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${encodeURIComponent(getTradingViewSymbol(asset.ticker))}`}
                allowTransparency
                scrolling="no"
                frameBorder={0}
              />
            </div>
            {/* Инфо об активе под графиком */}
            <div className="mt-3 w-full rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-3">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} className="text-neon/80" />
                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">{t('rules_about_asset')}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-neutral-500">{t('asset')}</span>
                  <p className="font-semibold text-white truncate" title={asset.name}>{asset.name}</p>
                </div>
                <div>
                  <span className="text-neutral-500">{t('ticker')}</span>
                  <p className="font-mono font-bold text-neon">{getTradingViewSymbolLabel(asset.ticker)}</p>
                </div>
                <div>
                  <span className="text-neutral-500">{t('min_deal')}</span>
                  <p className="font-mono font-semibold text-white">{formatPrice(MIN_DEAL_RUB)} {symbol}</p>
                </div>
                <div>
                  <span className="text-neutral-500">{t('change_24h_val')}</span>
                  <p className={`font-mono font-semibold ${(asset.change24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(asset.change24h ?? 0) >= 0 ? '+' : ''}{(asset.change24h ?? 0).toFixed(2)}%
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-neutral-500">{t('volume_24h')}</span>
                  <p className="font-mono text-neutral-300">
                    {asset.volume24h >= 1e9 ? (convertFromRub(asset.volume24h) / 1e9).toFixed(2) + ' млрд' : asset.volume24h >= 1e6 ? (convertFromRub(asset.volume24h) / 1e6).toFixed(2) + ' млн' : asset.volume24h >= 1e3 ? (convertFromRub(asset.volume24h) / 1e3).toFixed(1) + 'k' : formatPrice(asset.volume24h)} {symbol}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VIEW: ПРАВИЛА ТОРГОВЛИ */}
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab === 'RULES' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-28">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-neon/80" />
              <h2 className="text-base font-bold text-white">{t('rules_title')}</h2>
            </div>
            <div className="space-y-4 text-sm">
              <section className="rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-4">
                <h3 className="text-xs font-bold text-neon uppercase tracking-wider mb-2">Минимальная сделка</h3>
                <p className="text-neutral-400 leading-relaxed">
                  Минимальная сумма одной сделки — <span className="font-mono font-semibold text-white">{formatPrice(MIN_DEAL_RUB)} {symbol}</span>. Сумма выше минимальной может быть любой в пределах вашего баланса.
                </p>
              </section>
              <section className="rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-4">
                <h3 className="text-xs font-bold text-neon uppercase tracking-wider mb-2">Как работает сделка</h3>
                <p className="text-neutral-400 leading-relaxed mb-2">
                  Вы выбираете направление движения цены актива: <span className="text-green-500 font-medium">Вверх</span> (Лонг) или <span className="text-red-500 font-medium">Вниз</span> (Шорт), сумму ставки в рублях, плечо и время экспирации (10 сек, 30 сек, 1 мин или 5 мин).
                </p>
                <p className="text-neutral-400 leading-relaxed">
                  По истечении времени считается, насколько в процентах изменилась цена актива относительно точки входа. При движении в выбранную вами сторону вы получаете прибыль, приблизительно равную ставке × проценту изменения цены × плечо; при движении против — убыток. При сильном движении против с большим плечом сделка может быть полностью ликвидирована, и вы можете потерять всю сумму ставки.
                </p>
              </section>
              <section className="rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-4">
                <h3 className="text-xs font-bold text-neon uppercase tracking-wider mb-2">Плечо</h3>
                <p className="text-neutral-400 leading-relaxed">
                  Плечо от <span className="font-mono text-white">1x</span> до <span className="font-mono text-white">20x</span>. Чем выше плечо, тем сильнее влияние изменения цены на результат сделки. Выбор плеча не меняет сумму ставки — меняется только чувствительность к движению цены и риск ликвидации: при высоком плече даже небольшое движение против вас может привести к потере всей суммы сделки.
                </p>
              </section>
              <section className="rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-4">
                <h3 className="text-xs font-bold text-neon uppercase tracking-wider mb-2">Выплата при победе</h3>
                <p className="text-neutral-400 leading-relaxed">
                  При выигрышной сделке размер прибыли зависит от того, на сколько процентов изменился актив и какое плечо вы выбрали. Например, если вы поставили <span className="font-mono text-white">{formatPrice(1000)} {symbol}</span> с плечом <span className="font-mono text-white">x20</span>, а цена выросла на <span className="font-mono text-white">5%</span>, ваша прибыль составит около <span className="font-mono text-neon">+{formatPrice(1000)} {symbol}</span> (1000 × 5% × 20). Если же цена на те же 5% пойдёт против вас при большом плече, вы можете потерять всю сумму ставки.
                </p>
              </section>
              <section className="rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-4">
                <h3 className="text-xs font-bold text-neon uppercase tracking-wider mb-2">Подтверждение паролем</h3>
                <p className="text-neutral-400 leading-relaxed">
                  Для открытия сделки необходимо подтвердить действие паролем (PIN), заданным при первом входе. Это защищает ваш счёт от несанкционированных операций.
                </p>
              </section>
              <section className="rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-4">
                <h3 className="text-xs font-bold text-neon uppercase tracking-wider mb-2">Риски</h3>
                <p className="text-neutral-400 leading-relaxed">
                  Торговля криптоактивами связана с высоким риском. Цена может измениться в любую сторону. Не вкладывайте средства, потерю которых вы не можете позволить себе. Результат сделки определяется по цене актива на момент экспирации.
                </p>
              </section>
            </div>
          </div>
        </div>

        {/* VIEW: TRADE (Split Layout) */}
        <div className={`absolute inset-0 flex flex-row transition-opacity duration-300 ${activeTab === 'TRADE' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            
            {/* LEFT COLUMN: Controls (60%) — компактно, без прокрутки */}
            <div className="w-[60%] h-full flex flex-col p-3 border-r border-white/5 overflow-y-auto no-scrollbar bg-[#050505]">
                {/* Фьючерсы / Спот */}
                <div className="flex bg-[#0a0a0a] rounded-lg p-1 mb-3 border border-white/5">
                    <button
                        type="button"
                        onClick={() => { Haptic.tap(); setTradeType('futures'); }}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tradeType === 'futures' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
                    >
                        {t('trade_type_futures')}
                    </button>
                    <button
                        type="button"
                        onClick={() => { Haptic.tap(); setTradeType('spot'); }}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tradeType === 'spot' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
                    >
                        {t('trade_type_spot')}
                    </button>
                </div>

                {/* SPOT: Купить / Продать — в стиле фьючерсов */}
                {tradeType === 'spot' && (
                    <div className="space-y-3">
                        {/* Направление: Купить / Продать */}
                        <div className="space-y-0.5">
                            <label className="text-[10px] text-neutral-500 uppercase font-bold">{t('direction')}</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { Haptic.tap(); setSpotAction('buy'); }}
                                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all border
                                        ${spotAction === 'buy'
                                            ? 'bg-green-500/10 text-green-500 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                                            : 'bg-[#0a0a0a] text-neutral-500 border-neutral-800 hover:border-neutral-700'
                                        }`}
                                >
                                    {t('spot_buy')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { Haptic.tap(); setSpotAction('sell'); }}
                                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all border
                                        ${spotAction === 'sell'
                                            ? 'bg-red-500/10 text-red-500 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                                            : 'bg-[#0a0a0a] text-neutral-500 border-neutral-800 hover:border-neutral-700'
                                        }`}
                                >
                                    {t('spot_sell')}
                                </button>
                            </div>
                        </div>

                        {spotAction === 'buy' && (
                            <>
                                {/* Сумма в валюте */}
                                <div className="space-y-0.5">
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold">{t('amount_label')} ({symbol})</label>
                                    <div className="bg-[#0a0a0a] border border-neutral-800 rounded-lg px-3 py-1.5 flex items-center justify-between focus-within:border-neon/50 transition-colors">
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            value={spotAmountRub}
                                            onChange={(e) => setSpotAmountRub(e.target.value)}
                                            className="w-full bg-transparent text-white font-mono text-lg font-bold outline-none placeholder-neutral-700"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[500, 1000, 5000, 10000].map((v) => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => { Haptic.tap(); setSpotAmountRub(String(v)); }}
                                                className="px-2.5 py-1 rounded-md bg-white/5 text-neutral-400 text-xs font-mono hover:bg-white/10 hover:text-white active:scale-95"
                                            >
                                                {v >= 1000 ? v / 1000 + 'k' : v}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => { Haptic.tap(); setSpotAmountRub(String(Math.floor(balance * 0.5))); }}
                                            className="px-2.5 py-1 rounded-md bg-white/5 text-neutral-400 text-xs font-mono hover:bg-white/10 hover:text-white active:scale-95"
                                        >
                                            50%
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { Haptic.tap(); const max = Math.max(MIN_DEAL_RUB, Math.floor(balance)); setSpotAmountRub(String(max)); }}
                                            className="px-2.5 py-1 rounded-md bg-neon/20 text-neon text-xs font-mono font-bold hover:bg-neon/30 active:scale-95"
                                        >
                                            Max
                                        </button>
                                    </div>
                                    <div className="text-[9px] text-neutral-600 px-1 flex items-center gap-2 flex-wrap">
                                        <span>{t('available')}: {formatPrice(balance)} {symbol}</span>
                                        <span className="flex items-center gap-0.5"><Info size={9} /> {t('min')}: {formatPrice(MIN_DEAL_RUB)} {symbol}</span>
                                    </div>
                                </div>
                                {/* Расчёт: получите ≈ X {ticker} */}
                                {livePrice > 0 && parseFloat(spotAmountRub) >= MIN_DEAL_RUB && (
                                    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-neutral-500 uppercase font-bold">{t('you_receive')}</span>
                                        <span className="text-xs font-mono font-bold text-neon">
                                            ≈ {(parseFloat(spotAmountRub) || 0) / livePrice > 0
                                                ? ((parseFloat(spotAmountRub) || 0) / livePrice).toFixed(8)
                                                : '0'} {asset.ticker}
                                        </span>
                                    </div>
                                )}
                                <p className="text-[9px] text-neutral-500 px-0.5 leading-tight">{t('spot_buy_note')}</p>
                                <button
                                    type="button"
                                    disabled={spotLoading || tradingBlocked || (parseFloat(spotAmountRub) || 0) < MIN_DEAL_RUB}
                                    onClick={() => { Haptic.tap(); setShowSpotConfirm('buy'); }}
                                    className="w-full py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-green-500 text-black shadow-green-500/20 hover:bg-green-400"
                                >
                                    {spotLoading ? '...' : t('spot_buy')}
                                </button>
                            </>
                        )}

                        {spotAction === 'sell' && (
                            <>
                                {/* Количество актива */}
                                <div className="space-y-0.5">
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold">{asset.ticker} — {t('amount_label')}</label>
                                    <div className="bg-[#0a0a0a] border border-neutral-800 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 focus-within:border-neon/50 transition-colors">
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            value={spotQuantity}
                                            onChange={(e) => setSpotQuantity(e.target.value)}
                                            className="flex-1 bg-transparent text-white font-mono text-lg font-bold outline-none placeholder-neutral-700"
                                            placeholder="0"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { Haptic.tap(); setSpotQuantity(holdingAmount > 0 ? holdingAmount.toFixed(8) : '0'); }}
                                            className="px-2.5 py-1 rounded-md bg-neon/20 text-neon text-xs font-mono font-bold hover:bg-neon/30 active:scale-95"
                                        >
                                            Max
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[0.25, 0.5, 0.75, 1].map((pct) => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => {
                                                    Haptic.tap();
                                                    if (pct === 1) setSpotQuantity(holdingAmount > 0 ? holdingAmount.toFixed(8) : '0');
                                                    else setSpotQuantity(String((holdingAmount * pct).toFixed(8)));
                                                }}
                                                className="px-2.5 py-1 rounded-md bg-white/5 text-neutral-400 text-xs font-mono hover:bg-white/10 hover:text-white active:scale-95"
                                            >
                                                {pct === 1 ? 'Max' : (pct * 100) + '%'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-[9px] text-neutral-600 px-1 flex items-center gap-2 flex-wrap">
                                        <span>{t('available')}: {holdingAmount.toFixed(8)} {asset.ticker}</span>
                                        {currentHolding && (
                                            <span className="text-neutral-500">
                                                ≈ {formatPrice(holdingAmount * currentHolding.avgPriceRub)} {symbol}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Расчёт: получите ≈ X {symbol} */}
                                {livePrice > 0 && parseFloat(spotQuantity) > 0 && parseFloat(spotQuantity) <= holdingAmount && (
                                    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-neutral-500 uppercase font-bold">{t('you_receive')}</span>
                                        <span className="text-xs font-mono font-bold text-neon">
                                            ≈ {formatPrice((parseFloat(spotQuantity) || 0) * livePrice)} {symbol}
                                        </span>
                                    </div>
                                )}
                                <p className="text-[9px] text-neutral-500 px-0.5 leading-tight">{t('spot_sell_note')}</p>
                                <button
                                    type="button"
                                    disabled={spotLoading || tradingBlocked || holdingAmount <= 0 || (parseFloat(spotQuantity) || 0) <= 0}
                                    onClick={() => { Haptic.tap(); setShowSpotConfirm('sell'); }}
                                    className="w-full py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 text-black shadow-red-500/20 hover:bg-red-400"
                                >
                                    {spotLoading ? '...' : t('spot_sell')}
                                </button>
                            </>
                        )}

                        {tradingBlocked && (
                            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10px]">
                                🔒 {t('trading_blocked')}.
                            </div>
                        )}
                        <p className="text-[9px] text-neutral-500 mt-1 px-0.5 leading-tight">{t('trading_risk_note')}</p>
                    </div>
                )}

                {/* FUTURES: сумма, плечо, время, Long/Short */}
                {tradeType === 'futures' && (
                <>
                {/* Inputs */}
                <div className="space-y-3">
                    
                    {/* Amount */}
                    <div className="space-y-0.5">
                        <label className="text-[10px] text-neutral-500 uppercase font-bold">{t('amount_label')} ({currencyCode})</label>
                        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-lg px-3 py-1.5 flex items-center justify-between focus-within:border-neutral-600 transition-colors">
                            <input 
                                type="number"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-transparent text-white font-mono text-lg font-bold outline-none placeholder-neutral-700"
                                placeholder="0"
                            />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {[500, 1000, 5000].map((v) => (
                                <button key={v} type="button" onClick={() => { Haptic.tap(); setAmount(String(v)); }} className="px-2.5 py-1 rounded-md bg-white/5 text-neutral-400 text-xs font-mono hover:bg-white/10 hover:text-white active:scale-95">
                                    {v >= 1000 ? v / 1000 + 'k' : v}
                                </button>
                            ))}
                            <button type="button" onClick={() => { Haptic.tap(); setAmount(String(Math.floor(balance * 0.5))); }} className="px-2.5 py-1 rounded-md bg-white/5 text-neutral-400 text-xs font-mono hover:bg-white/10 hover:text-white active:scale-95">
                                50%
                            </button>
                        </div>
                        <div className="text-[9px] text-neutral-600 px-1 flex items-center gap-2 flex-wrap">
                          <span>{t('available')}: {formatPrice(balance)} {symbol}</span>
                          <span className="flex items-center gap-0.5"><Info size={9} /> {t('min')}: {formatPrice(MIN_DEAL_RUB)} {symbol}</span>
                        </div>
                    </div>

                    {/* Пример потенциальной прибыли при движении цены */}
                    {(() => {
                      const numAmount = parseInt(amount) || 0;
                      // Показываем пример для среднего движения в 3%
                      const avgMove = 0.03; 
                      const potentialProfit = Math.round(numAmount * avgMove * leverage);
                      
                      return (
                        <>
                          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                              <TrendingUp size={10} className="text-neon/80" /> {t('at_3_move')}
                            </span>
                            <span className="text-xs font-mono font-bold text-neon">
                              ≈ ±{formatPrice(potentialProfit)} {symbol}
                            </span>
                          </div>
                          <p className="text-[9px] text-neutral-500 px-0.5 mt-0.5 leading-tight">
                            {t('result_note')}
                          </p>
                        </>
                      );
                    })()}

                    {/* Leverage */}
                    <div className="space-y-0.5">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] text-neutral-500 uppercase font-bold flex items-center">
                                <Zap size={10} className="mr-1 text-neon" /> {t('leverage')}
                            </label>
                            <span className="text-xs font-mono font-bold text-neon">x{leverage}</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="20" 
                            step="1"
                            value={leverage}
                            onChange={(e) => { Haptic.tap(); setLeverage(parseInt(e.target.value)); }}
                            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neon"
                        />
                    </div>

                    {/* Duration */}
                    <div className="space-y-0.5">
                        <label className="text-[10px] text-neutral-500 uppercase font-bold flex items-center">
                            <Clock size={10} className="mr-1 text-neon" /> {t('time')}
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {TIMEFRAMES.map((tf) => (
                                <button
                                    key={tf.sec}
                                    onClick={() => { Haptic.tap(); setDuration(tf.sec); }}
                                    className={`py-1 rounded-md text-[10px] font-mono font-bold transition-all border
                                        ${duration === tf.sec 
                                            ? 'bg-neutral-800 text-white border-neon/50' 
                                            : 'bg-[#0a0a0a] text-neutral-500 border-neutral-800'
                                        }
                                    `}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Side Toggle (Small Buttons) */}
                    <div className="space-y-0.5">
                         <label className="text-[10px] text-neutral-500 uppercase font-bold">{t('direction')}</label>
                         <div className="flex space-x-2">
                            <button 
                                onClick={() => { Haptic.tap(); setSide('UP'); }}
                                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all border
                                    ${side === 'UP' 
                                        ? 'bg-green-500/10 text-green-500 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                                        : 'bg-[#0a0a0a] text-neutral-500 border-neutral-800 hover:border-neutral-700'
                                    }
                                `}
                            >
                                {t('long')}
                            </button>
                            <button 
                                onClick={() => { Haptic.tap(); setSide('DOWN'); }}
                                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all border
                                    ${side === 'DOWN' 
                                        ? 'bg-red-500/10 text-red-500 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                                        : 'bg-[#0a0a0a] text-neutral-500 border-neutral-800 hover:border-neutral-700'
                                    }
                                `}
                            >
                                {t('short')}
                            </button>
                         </div>
                    </div>
                </div>

                {tradingBlocked && (
                  <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10px]">
                    🔒 {t('trading_blocked')}.
                  </div>
                )}
                <p className="text-[9px] text-neutral-500 mt-1 px-0.5 leading-tight">{t('trading_risk_note')}</p>

                {/* Create Deal Button — сразу под настройками */}
                <button 
                    onClick={handlePreTrade}
                    disabled={tradingBlocked}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg active:scale-95 transition-all mt-3
                    ${tradingBlocked ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' : side === 'UP' ? 'bg-green-500 text-black shadow-green-500/20 hover:bg-green-400' : 'bg-red-500 text-black shadow-red-500/20 hover:bg-red-400'}`}
                >
                    {tradingBlocked ? t('trading_blocked') : t('create_deal')}
                </button>
                </>
                )}
            </div>

            {/* RIGHT COLUMN: Order Book (40%) */}
            <div className="w-[40%] flex flex-col bg-[#0a0a0a]">
                <div className="flex justify-between px-2 py-2 text-[9px] text-neutral-500 uppercase tracking-wider border-b border-white/5">
                    <span>{t('order_book_price')}</span>
                    <span>{t('order_book_size')}</span>
                </div>
                
                {/* Asks (Red) */}
                <div className="flex flex-col-reverse justify-end flex-1 overflow-hidden pb-1 space-y-reverse space-y-[1px]">
                    {asks.map((ask, i) => (
                        <div key={`ask-${i}`} className="flex justify-between px-2 py-[2px] relative group cursor-pointer hover:bg-white/5">
                            <span className="text-[10px] font-mono text-red-400 relative z-10">{formatPrice(ask.price)}</span>
                            <span className="text-[10px] font-mono text-neutral-500 relative z-10">{ask.size.toFixed(3)}</span>
                            <div className="absolute right-0 top-0 bottom-0 bg-red-500/10 z-0" style={{ width: `${Math.random() * 60}%` }}></div>
                        </div>
                    ))}
                </div>

                {/* Текущая цена (из живого стакана) */}
                <div className="py-1.5 border-y border-white/5 flex flex-col items-center bg-[#050505] my-1">
                    <span className={`text-sm font-mono font-bold ${
                      priceDirection === 'up' ? 'text-green-500' : priceDirection === 'down' ? 'text-red-500' : 'text-white'
                    }`}>
                        {formatPrice(orderBookBase > 0 ? orderBookBase : livePrice)}
                    </span>
                    <span className="text-[8px] text-neutral-500">{currencyCode}</span>
                </div>

                {/* Bids (Green) */}
                <div className="flex flex-col flex-1 overflow-hidden pt-1 space-y-[1px]">
                     {bids.map((bid, i) => (
                        <div key={`bid-${i}`} className="flex justify-between px-2 py-[2px] relative group cursor-pointer hover:bg-white/5">
                            <span className="text-[10px] font-mono text-green-400 relative z-10">{formatPrice(bid.price)}</span>
                            <span className="text-[10px] font-mono text-neutral-500 relative z-10">{bid.size.toFixed(3)}</span>
                            <div className="absolute right-0 top-0 bottom-0 bg-green-500/10 z-0" style={{ width: `${Math.random() * 60}%` }}></div>
                        </div>
                    ))}
                </div>
                
                {/* Order Book Footer */}
                 <div className="p-2 border-t border-white/5 flex justify-center">
                    <ChevronDown size={14} className="text-neutral-600" />
                </div>
            </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="w-full bg-[#111] border-t border-white/10 rounded-t-2xl p-6 animate-slide-up pb-safe">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">{t('confirm_title')}</h3>
                    <button onClick={() => { Haptic.tap(); setShowConfirm(false); }} className="text-neutral-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-4 mb-6">
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">{t('asset')}</span>
                        <span className="font-bold text-white">{asset.ticker}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">{t('direction')}</span>
                        <span className={`font-bold ${side === 'UP' ? 'text-green-500' : 'text-red-500'}`}>
                            {side === 'UP' ? `${t('long')} (${t('up')})` : `${t('short')} (${t('down')})`}
                        </span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">{t('amount_leverage')}</span>
                        <div className="text-right">
                             <span className="font-mono text-white block">{formatPrice(parseInt(amount) || 0)} {symbol} x{leverage}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">{t('duration')}</span>
                        <span className="font-mono text-white">{duration} {t('sec')}</span>
                    </div>
                </div>

                <div className="flex space-x-3">
                     <button 
                        onClick={() => { Haptic.tap(); setShowConfirm(false); }}
                        className="flex-1 py-3 rounded-xl bg-neutral-800 text-white font-medium active:scale-95 transition-transform"
                    >
                        {t('cancel')}
                    </button>
                    <button 
                        onClick={() => {
                          const userId = tgid || webUserId?.toString();
                          if (userId) {
                            requirePin(userId, t('enter_pin_for_confirm'), handleConfirmTrade);
                          } else {
                            handleConfirmTrade();
                          }
                        }}
                        className="flex-1 py-3 rounded-xl bg-neon text-black font-bold active:scale-95 transition-transform shadow-[0_0_15px_rgba(163,230,53,0.3)]"
                    >
                        {t('confirm')}
                    </button>
                </div>
             </div>
        </div>
      )}

      {/* SPOT CONFIRMATION MODAL */}
      {showSpotConfirm && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full bg-[#111] border-t border-white/10 rounded-t-2xl p-6 animate-slide-up pb-safe">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">
                {showSpotConfirm === 'buy' ? t('confirm_title') + ' — ' + t('spot_buy') : t('confirm_title') + ' — ' + t('spot_sell')}
              </h3>
              <button onClick={() => { Haptic.tap(); setShowSpotConfirm(null); }} className="text-neutral-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">{t('asset')}</span>
                <span className="font-bold text-white">{asset.ticker}</span>
              </div>
              {showSpotConfirm === 'buy' && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">{t('amount_label')}</span>
                    <span className="font-mono text-white">{formatPrice(parseFloat(spotAmountRub) || 0)} {symbol}</span>
                  </div>
                  {livePrice > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">{t('you_receive')}</span>
                      <span className="font-mono text-neon">
                        ≈ {((parseFloat(spotAmountRub) || 0) / livePrice).toFixed(8)} {asset.ticker}
                      </span>
                    </div>
                  )}
                </>
              )}
              {showSpotConfirm === 'sell' && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">{asset.ticker} — {t('amount_label')}</span>
                    <span className="font-mono text-white">{spotQuantity || '0'}</span>
                  </div>
                  {livePrice > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">{t('you_receive')}</span>
                      <span className="font-mono text-neon">
                        ≈ {formatPrice((parseFloat(spotQuantity) || 0) * livePrice)} {symbol}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => { Haptic.tap(); setShowSpotConfirm(null); }}
                className="flex-1 py-3 rounded-xl bg-neutral-800 text-white font-medium active:scale-95 transition-transform"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  Haptic.tap();
                  handleSpotConfirmWithPin();
                }}
                disabled={spotLoading}
                className="flex-1 py-3 rounded-xl bg-neon text-black font-bold active:scale-95 transition-transform shadow-[0_0_15px_rgba(163,230,53,0.3)] disabled:opacity-50"
              >
                {spotLoading ? '...' : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS ANIMATION OVERLAY */}
      {showSuccess && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="flex flex-col items-center">
                 <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-green-500/20 mb-4 animate-scale-in">
                    <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-20"></div>
                    <Check size={48} className="text-green-500 animate-check-stroke" strokeWidth={3} />
                 </div>
                 <h3 className="text-xl font-bold text-white tracking-wide">{t('deal_created')}</h3>
                 <p className="text-neutral-400 mt-2 text-sm font-mono">{t('going_to_portfolio')}</p>
            </div>
        </div>
      )}

      {/* ASSET SEARCH OVERLAY */}
      {showAssetSearch && (
        <div className="fixed inset-0 z-[60] bg-[#050505] animate-fade-in">
          <div className="h-full w-full max-w-md mx-auto relative">
            <button
              type="button"
              onClick={() => { Haptic.tap(); setShowAssetSearch(false); }}
              className="fixed top-3 right-3 z-[80] w-9 h-9 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-neutral-200 hover:text-white active:scale-95 transition-transform"
              aria-label={t('close')}
            >
              <X size={18} />
            </button>

            <div className="h-full">
              <CoinsPage
                onNavigateToTrading={(a) => {
                  Haptic.light();
                  onChangeAsset?.(a);
                  setShowAssetSearch(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TradingPage;