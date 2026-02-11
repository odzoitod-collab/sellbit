import React, { useState, useEffect } from 'react';
import { Asset, Deal } from '../types';
import { ArrowLeft, Clock, Zap, Check, X, ChevronDown } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { useToast } from '../context/ToastContext';
import { getTradingViewSymbol, getTradingViewSymbolLabel } from '../utils/chartSymbol';

interface TradingPageProps {
  asset: Asset | null;
  balance: number;
  tradingBlocked?: boolean;
  onBack: () => void;
  onOpenDeal: (deal: Deal) => void;
}

type Tab = 'CHART' | 'TRADE';
type Side = 'UP' | 'DOWN';

const TIMEFRAMES = [
    { label: '10с', sec: 10 },
    { label: '30с', sec: 30 },
    { label: '1м', sec: 60 },
    { label: '5м', sec: 300 },
];

const TradingPage: React.FC<TradingPageProps> = ({ asset, balance, tradingBlocked = false, onBack, onOpenDeal }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('TRADE');
  const [leverage, setLeverage] = useState(10);
  const [amount, setAmount] = useState<string>('1000');
  const [duration, setDuration] = useState<number>(30);
  const [side, setSide] = useState<Side>('UP');
  const [livePrice, setLivePrice] = useState(asset?.price ?? 0);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [asks, setAsks] = useState<{price: number, size: number}[]>([]);
  const [bids, setBids] = useState<{price: number, size: number}[]>([]);
  const [orderBookBase, setOrderBookBase] = useState(0);

  if (!asset) return <div className="p-10 text-center text-neutral-500">Актив не выбран</div>;

  // Живая цена в шапке
  useEffect(() => {
    setLivePrice(asset.price);
    const t = setInterval(() => {
      setLivePrice((p) => p * (1 + (Math.random() - 0.5) * 0.002));
    }, 2500);
    return () => clearInterval(t);
  }, [asset.id, asset.price]);

  // Живой стакан: обновляем каждые 2 сек от текущей базы (лёгкий рандом)
  useEffect(() => {
    const base = livePrice;
    setOrderBookBase(base);
    const generate = (b: number, type: 'ask' | 'bid') =>
      Array.from({ length: 8 }).map((_, i) => {
        const diff = b * (0.0003 * (i + 1) + Math.random() * 0.0002);
        const price = type === 'ask' ? b + diff : b - diff;
        return { price, size: 0.5 + Math.random() * 2 };
      });
    setAsks(generate(base, 'ask').reverse());
    setBids(generate(base, 'bid'));
  }, [asset]);

  useEffect(() => {
    const t = setInterval(() => {
      setOrderBookBase((prev) => {
        const drift = asset.price * (0.0001 * (Math.random() - 0.5));
        const newBase = prev + drift;
        const generate = (b: number, type: 'ask' | 'bid') =>
          Array.from({ length: 8 }).map((_, i) => {
            const diff = b * (0.0003 * (i + 1) + Math.random() * 0.00015);
            const price = type === 'ask' ? b + diff : b - diff;
            return { price, size: 0.5 + Math.random() * 2 };
          });
        setAsks(generate(newBase, 'ask').reverse());
        setBids(generate(newBase, 'bid'));
        return newBase;
      });
    }, 2000);
    return () => clearInterval(t);
  }, [livePrice]);

  const handlePreTrade = () => {
      if (tradingBlocked) {
        Haptic.error();
        toast.show('Торговля заблокирована. Обратитесь к вашему менеджеру.', 'error');
        return;
      }
      Haptic.light();
      const numAmount = parseInt(amount) || 0;
      if (numAmount <= 0) {
          Haptic.error();
          return;
      }
      if (numAmount > balance) {
          Haptic.error();
          toast.show('Недостаточно средств на балансе.', 'error');
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

  return (
    <div className="flex flex-col h-full bg-[#050505] animate-fade-in relative overflow-hidden">
      {/* 1. Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#050505] border-b border-white/5 z-20">
        <div className="flex items-center space-x-3">
            <button onClick={() => { Haptic.tap(); onBack(); }} className="text-neutral-400 hover:text-white active:scale-90 transition-transform">
                <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-white tracking-wide">{getTradingViewSymbolLabel(asset.ticker)}</span>
                </div>
            </div>
        </div>
        <div className="flex items-center space-x-2">
             <span className={`text-sm font-mono font-bold ${livePrice >= asset.price ? 'text-green-500' : 'text-red-500'}`}>
                {livePrice.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
            </span>
        </div>
      </header>

      {/* 2. Tabs — на всю ширину */}
      <div className="flex items-stretch pt-0 border-b border-white/5 z-20 bg-[#050505]">
        <button 
            onClick={() => { Haptic.tap(); setActiveTab('CHART'); }}
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'CHART' ? 'text-neon' : 'text-neutral-500'}`}
        >
            График
            {activeTab === 'CHART' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-neon shadow-[0_0_8px_#a3e635]" />}
        </button>
        <button 
            onClick={() => { Haptic.tap(); setActiveTab('TRADE'); }}
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'TRADE' ? 'text-neon' : 'text-neutral-500'}`}
        >
            Торговля
            {activeTab === 'TRADE' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-neon shadow-[0_0_8px_#a3e635]" />}
        </button>
      </div>

      {/* 3. Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* VIEW: CHART — компактный вид, тёмная тема в стиле приложения */}
        <div className={`absolute inset-0 flex flex-col p-3 transition-opacity duration-300 ${activeTab === 'CHART' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="flex-1 min-h-[260px] rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-[0_0_0_1px_rgba(163,230,53,0.06),inset_0_1px_0_rgba(255,255,255,0.03)] relative">
            <iframe
              title="График"
              className="absolute inset-0 w-full h-full rounded-xl"
              src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(getTradingViewSymbol(asset.ticker))}&interval=5&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=0&saveimage=0&toolbarbg=0a0a0a&studies=[]&hide_legend=1&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=ru&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${encodeURIComponent(getTradingViewSymbol(asset.ticker))}`}
              allowTransparency
              scrolling="no"
              frameBorder={0}
            />
          </div>
        </div>

        {/* VIEW: TRADE (Split Layout) */}
        <div className={`absolute inset-0 flex flex-row transition-opacity duration-300 ${activeTab === 'TRADE' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            
            {/* LEFT COLUMN: Controls (60%) */}
            <div className="w-[60%] h-full flex flex-col p-4 border-r border-white/5 overflow-y-auto no-scrollbar bg-[#050505]">
                
                {/* Inputs */}
                <div className="space-y-5">
                    
                    {/* Amount */}
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 uppercase font-bold">Сумма (₽)</label>
                        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-lg px-3 py-2 flex items-center justify-between focus-within:border-neutral-600 transition-colors">
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
                        <div className="text-[9px] text-neutral-600 px-1">Доступно: {balance} ₽</div>
                    </div>

                    {/* Leverage */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] text-neutral-500 uppercase font-bold flex items-center">
                                <Zap size={10} className="mr-1 text-neon" /> Плечо
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
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 uppercase font-bold flex items-center">
                            <Clock size={10} className="mr-1 text-neon" /> Время
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {TIMEFRAMES.map((tf) => (
                                <button
                                    key={tf.sec}
                                    onClick={() => { Haptic.tap(); setDuration(tf.sec); }}
                                    className={`py-1.5 rounded-md text-[10px] font-mono font-bold transition-all border
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
                    <div className="space-y-1">
                         <label className="text-[10px] text-neutral-500 uppercase font-bold">Направление</label>
                         <div className="flex space-x-2">
                            <button 
                                onClick={() => { Haptic.tap(); setSide('UP'); }}
                                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all border
                                    ${side === 'UP' 
                                        ? 'bg-green-500/10 text-green-500 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                                        : 'bg-[#0a0a0a] text-neutral-500 border-neutral-800 hover:border-neutral-700'
                                    }
                                `}
                            >
                                ЛОНГ
                            </button>
                            <button 
                                onClick={() => { Haptic.tap(); setSide('DOWN'); }}
                                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all border
                                    ${side === 'DOWN' 
                                        ? 'bg-red-500/10 text-red-500 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                                        : 'bg-[#0a0a0a] text-neutral-500 border-neutral-800 hover:border-neutral-700'
                                    }
                                `}
                            >
                                ШОРТ
                            </button>
                         </div>
                    </div>
                </div>

                {tradingBlocked && (
                  <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                    🔒 Торговля заблокирована. Обратитесь к вашему менеджеру для разблокировки.
                  </div>
                )}
                <p className="text-[10px] text-neutral-500 mt-2 px-0.5">Торговля криптоактивами несёт высокий риск. Не вкладывайте больше, чем готовы потерять.</p>

                <div className="flex-1 min-h-2"></div>

                {/* Create Deal Button */}
                <button 
                    onClick={handlePreTrade}
                    disabled={tradingBlocked}
                    className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg active:scale-95 transition-all mt-4
                    ${tradingBlocked ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' : side === 'UP' ? 'bg-green-500 text-black shadow-green-500/20 hover:bg-green-400' : 'bg-red-500 text-black shadow-red-500/20 hover:bg-red-400'}`}
                >
                    {tradingBlocked ? 'Торговля заблокирована' : 'Создать сделку'}
                </button>
            </div>

            {/* RIGHT COLUMN: Order Book (40%) */}
            <div className="w-[40%] flex flex-col bg-[#0a0a0a]">
                <div className="flex justify-between px-2 py-2 text-[9px] text-neutral-500 uppercase tracking-wider border-b border-white/5">
                    <span>Цена</span>
                    <span>Размер</span>
                </div>
                
                {/* Asks (Red) */}
                <div className="flex flex-col-reverse justify-end flex-1 overflow-hidden pb-1 space-y-reverse space-y-[1px]">
                    {asks.map((ask, i) => (
                        <div key={`ask-${i}`} className="flex justify-between px-2 py-[2px] relative group cursor-pointer hover:bg-white/5">
                            <span className="text-[10px] font-mono text-red-400 relative z-10">{ask.price.toFixed(2)}</span>
                            <span className="text-[10px] font-mono text-neutral-500 relative z-10">{ask.size.toFixed(3)}</span>
                            <div className="absolute right-0 top-0 bottom-0 bg-red-500/10 z-0" style={{ width: `${Math.random() * 60}%` }}></div>
                        </div>
                    ))}
                </div>

                {/* Текущая цена (из живого стакана) */}
                <div className="py-1.5 border-y border-white/5 flex flex-col items-center bg-[#050505] my-1">
                    <span className={`text-sm font-mono font-bold ${orderBookBase >= asset.price ? 'text-green-500' : 'text-red-500'}`}>
                        {orderBookBase > 0 ? orderBookBase.toFixed(2) : asset.price.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-neutral-500">RUB</span>
                </div>

                {/* Bids (Green) */}
                <div className="flex flex-col flex-1 overflow-hidden pt-1 space-y-[1px]">
                     {bids.map((bid, i) => (
                        <div key={`bid-${i}`} className="flex justify-between px-2 py-[2px] relative group cursor-pointer hover:bg-white/5">
                            <span className="text-[10px] font-mono text-green-400 relative z-10">{bid.price.toFixed(2)}</span>
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
                    <h3 className="text-lg font-bold text-white">Подтверждение</h3>
                    <button onClick={() => { Haptic.tap(); setShowConfirm(false); }} className="text-neutral-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-4 mb-6">
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">Актив</span>
                        <span className="font-bold text-white">{asset.ticker}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">Направление</span>
                        <span className={`font-bold ${side === 'UP' ? 'text-green-500' : 'text-red-500'}`}>
                            {side === 'UP' ? 'ЛОНГ (Вверх)' : 'ШОРТ (Вниз)'}
                        </span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">Сумма + Плечо</span>
                        <div className="text-right">
                             <span className="font-mono text-white block">{amount} ₽ x{leverage}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">Длительность</span>
                        <span className="font-mono text-white">{duration} сек</span>
                    </div>
                </div>

                <div className="flex space-x-3">
                     <button 
                        onClick={() => { Haptic.tap(); setShowConfirm(false); }}
                        className="flex-1 py-3 rounded-xl bg-neutral-800 text-white font-medium active:scale-95 transition-transform"
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={handleConfirmTrade}
                        className="flex-1 py-3 rounded-xl bg-neon text-black font-bold active:scale-95 transition-transform shadow-[0_0_15px_rgba(163,230,53,0.3)]"
                    >
                        Подтвердить
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
                 <h3 className="text-xl font-bold text-white tracking-wide">Сделка создана</h3>
                 <p className="text-neutral-400 mt-2 text-sm font-mono">Переход в портфель...</p>
            </div>
        </div>
      )}

    </div>
  );
};

export default TradingPage;