import React from 'react';

export interface Asset {
  id: string;
  ticker: string;
  name: string;
  price: number;
  volume24h: number; // In RUB
  change24h: number; // Percentage
  isNew?: boolean;
}

export type PageView = 'HOME' | 'COINS' | 'TRADING' | 'DEALS' | 'DEPOSIT' | 'WITHDRAW' | 'QR_SCANNER' | 'PROFILE' | 'KYC' | 'CURRENCY' | 'LANGUAGE';

export interface NavItem {
  id: PageView;
  label: string;
  icon: React.FC<any>;
}

export type DealStatus = 'ACTIVE' | 'WIN' | 'LOSS';
export type DealSide = 'UP' | 'DOWN';

export interface Deal {
    id: string;
    assetTicker: string;
    side: DealSide;
    amount: number;
    leverage: number;
    entryPrice: number;
    currentPrice?: number; // Dynamic price for active deals
    startTime: number;
    durationSeconds: number; // in seconds
    status: DealStatus;
    pnl?: number; // Profit and Loss
}