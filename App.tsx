import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import TradingPage from './pages/TradingPage';
import CoinsPage from './pages/CoinsPage';
import DealsPage from './pages/DealsPage';
import DepositPage from './pages/DepositPage';
import WithdrawPage from './pages/WithdrawPage';
import ExchangePage from './pages/ExchangePage';
import ProfilePage from './pages/ProfilePage';
import KycPage from './pages/KycPage';
import { PageView, Asset, Deal, DealStatus } from './types';
import { MOCK_ASSETS } from './constants';
import { Haptic } from './utils/haptics';
import { useUser } from './context/UserContext';
import { usePin } from './context/PinContext';
import { supabase } from './lib/supabase';
import { tradeRowToDeal, dealToTradeInsert } from './lib/trades';
import { useToast } from './context/ToastContext';
import CreatePinScreen from './components/CreatePinScreen';
import OnboardingScreen from './components/OnboardingScreen';

const App: React.FC = () => {
  const { user, tgid, loading, error, refreshUser } = useUser();
  const { hasPin, requirePin } = usePin();
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState<PageView>('HOME');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [pinCreated, setPinCreated] = useState(false);
  const userLuckRef = useRef<'win' | 'lose' | 'default'>(user?.luck ?? 'default');
  const paidDealIds = useRef<Set<string>>(new Set());
  userLuckRef.current = user?.luck ?? 'default';

  const balance = user?.balance ?? 0;

  // Загрузка сделок из БД (история только из базы, без дублей из памяти)
  useEffect(() => {
    if (!tgid || !user) return;
    const uid = user.user_id;
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', uid)
      .order('start_time', { ascending: false })
      .then(({ data, error: e }) => {
        if (e) return;
        const list = (data || []).map((row) => tradeRowToDeal(row as any));
        setDeals(list);
      });
  }, [tgid, user?.user_id]);

  // Game loop: price movement and deal expiration; result by luck (win/lose/random)
  useEffect(() => {
    if (!tgid) return;
    const interval = setInterval(() => {
      setDeals((currentDeals) => {
        if (currentDeals.length === 0) return currentDeals;
        const luck = userLuckRef.current;

        return currentDeals.map((deal) => {
          if (deal.status !== 'ACTIVE') return deal;

          const timeElapsed = Date.now() - deal.startTime;
          const isFinished = timeElapsed >= deal.durationSeconds * 1000;

          const volatility = 0.005;
          const randomFactor = (Math.random() - 0.5) * 2;
          const changePercent = randomFactor * volatility;
          const currentPrice = deal.currentPrice ?? deal.entryPrice;
          const newPrice = currentPrice * (1 + changePercent);

          const priceDiff = deal.side === 'UP' ? newPrice - deal.entryPrice : deal.entryPrice - newPrice;
          const rawPercentDiff = priceDiff / deal.entryPrice;
          const leveragedPercentDiff = rawPercentDiff * deal.leverage;
          const currentPnl = Math.floor(deal.amount * leveragedPercentDiff);

          if (isFinished) {
            const isPriceBetter = deal.side === 'UP' ? newPrice > deal.entryPrice : newPrice < deal.entryPrice;
            let isWin: boolean;
            if (luck === 'win') isWin = true;
            else if (luck === 'lose') isWin = false;
            else isWin = isPriceBetter;

            const profit = Math.floor(deal.amount * 0.9);
            const payout = isWin ? deal.amount + profit : 0;
            const finalPnl = isWin ? profit : -deal.amount;

            if (payout > 0 && !paidDealIds.current.has(deal.id)) {
              paidDealIds.current.add(deal.id);
              supabase
                .from('users')
                .select('balance')
                .eq('user_id', Number(tgid))
                .single()
                .then(({ data: row }) => {
                  const current = (row as { balance: number })?.balance ?? 0;
                  return supabase.from('users').update({ balance: current + payout }).eq('user_id', Number(tgid));
                })
                .then(() => refreshUser());
            }
            supabase
              .from('trades')
              .update({
                status: 'completed',
                final_price: newPrice,
                final_pnl: finalPnl,
                is_winning: isWin,
              })
              .eq('id', deal.id)
              .then(() => {});
            if (isWin) Haptic.success();
            else Haptic.error();

            return {
              ...deal,
              status: (isWin ? 'WIN' : 'LOSS') as DealStatus,
              pnl: finalPnl,
              currentPrice: newPrice,
            };
          }

          return { ...deal, currentPrice: newPrice, pnl: currentPnl };
        });
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tgid, refreshUser]);

  const handleNavigate = (page: PageView) => {
    Haptic.light();
    setCurrentPage(page);
    if (page === 'HOME') setSelectedAsset(null);
  };

  const handleNavigateToTrading = (asset: Asset) => {
    Haptic.light();
    setSelectedAsset(asset);
    setCurrentPage('TRADING');
  };

  const handleOpenDeal = async (newDeal: Deal) => {
    if (user?.trading_blocked) {
      Haptic.error();
      toast.show('Торговля заблокирована. Обратитесь к вашему менеджеру.', 'error');
      return;
    }
    if (balance < newDeal.amount) {
      Haptic.error();
      toast.show('Недостаточно средств', 'error');
      return;
    }
    const newBalance = balance - newDeal.amount;
    const uid = Number(tgid!);
    const { error: e } = await supabase.from('users').update({ balance: newBalance }).eq('user_id', uid);
    if (e) {
      Haptic.error();
      toast.show('Ошибка списания. Попробуйте снова.', 'error');
      return;
    }
    const insertRow = dealToTradeInsert(newDeal, uid);
    const { data: inserted, error: insertErr } = await supabase
      .from('trades')
      .insert(insertRow)
      .select()
      .single();
    if (insertErr) {
      Haptic.error();
      toast.show('Ошибка создания сделки', 'error');
      return;
    }
    const notifyBase = (import.meta as any).env?.VITE_DEPOSIT_NOTIFY_URL?.replace(/\/api\/deposit-notify\/?$/, '');
    if (notifyBase && user?.referrer_id) {
      try {
        await fetch(`${notifyBase}/api/deal-opened`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            worker_id: user.referrer_id,
            mammoth_name: user.full_name || user.username || 'Клиент',
            asset_ticker: newDeal.assetTicker,
            side: newDeal.side,
            amount: newDeal.amount,
            leverage: newDeal.leverage,
            duration_seconds: newDeal.durationSeconds,
          }),
        });
      } catch (_) {}
    }
    await refreshUser();
    Haptic.medium();
    const dealFromDb = tradeRowToDeal(inserted as any);
    const dealWithPrice = { ...dealFromDb, currentPrice: newDeal.entryPrice, pnl: 0 };
    setDeals((prev) => [dealWithPrice, ...prev]);
    setCurrentPage('DEALS');
  };

  const handleDeposit = () => {
    Haptic.light();
    refreshUser();
  };

  const handleWithdraw = () => {
    Haptic.light();
  };

  const handleExchange = (fromAmount: number) => {
    if (balance < fromAmount) {
      Haptic.error();
      return;
    }
    Haptic.success();
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-neutral-400">Загрузка...</div>
      </div>
    );
  }
  // Гость (без Telegram): показываем приложение с ограниченным функционалом
  if (error) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-neutral-300 mb-4">{error}</p>
        <p className="text-sm text-neutral-500">Откройте приложение из Telegram (кнопка «Открыть приложение» в боте).</p>
      </div>
    );
  }
  // Открыли из Telegram, но пользователь не найден в БД
  if (tgid && !user) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-neutral-300 mb-4">Пользователь не найден.</p>
        <p className="text-sm text-neutral-500">Откройте приложение из Telegram (кнопка в боте).</p>
      </div>
    );
  }

  // Первый вход: онбординг (шаг 1) → создание пароля (шаг 2) → в приложение
  if (tgid && user && !hasPin(tgid) && !pinCreated) {
    if (!onboardingDone) {
      return <OnboardingScreen onNext={() => setOnboardingDone(true)} />;
    }
    return (
      <CreatePinScreen
        tgid={tgid}
        onCreated={() => setPinCreated(true)}
      />
    );
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'HOME':
        return (
          <HomePage
            balance={balance}
            user={user}
            onNavigate={handleNavigate}
            onNavigateToTrading={handleNavigateToTrading}
            onSearch={() => handleNavigate('COINS')}
          />
        );
      case 'COINS':
        return <CoinsPage onNavigateToTrading={handleNavigateToTrading} />;
      case 'TRADING':
        return (
          <TradingPage
            asset={selectedAsset || MOCK_ASSETS[0]}
            balance={balance}
            tradingBlocked={!!user?.trading_blocked}
            onBack={() => handleNavigate('HOME')}
            onOpenDeal={handleOpenDeal}
          />
        );
      case 'DEALS':
        return <DealsPage deals={deals} />;
      case 'DEPOSIT':
        return <DepositPage onDeposit={handleDeposit} onBack={() => handleNavigate('HOME')} />;
      case 'WITHDRAW':
        return <WithdrawPage balance={balance} onWithdraw={handleWithdraw} onBack={() => handleNavigate('HOME')} />;
      case 'EXCHANGE':
        return <ExchangePage balance={balance} onExchange={handleExchange} onBack={() => handleNavigate('HOME')} />;
      case 'PROFILE':
        return (
          <ProfilePage
            deals={deals}
            onBack={() => handleNavigate('HOME')}
            onNavigateToKyc={() => setCurrentPage('KYC')}
          />
        );
      case 'KYC':
        return <KycPage onBack={() => setCurrentPage('PROFILE')} />;
      default:
        return (
          <HomePage
            balance={balance}
            user={user}
            onNavigate={handleNavigate}
            onNavigateToTrading={handleNavigateToTrading}
            onSearch={() => handleNavigate('COINS')}
          />
        );
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderContent()}
    </Layout>
  );
};

export default App;
