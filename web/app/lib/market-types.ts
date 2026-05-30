// Enhanced types for Market Discovery System

export interface PoolData {
  poolId: number;
  creator: string;
  title: string;
  description: string;
  outcomeAName: string;
  outcomeBName: string;
  totalA: bigint;
  totalB: bigint;
  settled: boolean;
  winningOutcome: number | null;
  createdAt: number;
  settledAt: number | null;
  expiry: number;
}

export interface ProcessedMarket {
  poolId: number;
  title: string;
  description: string;
  outcomeA: string;
  outcomeB: string;
  totalVolume: number;
  oddsA: number;
  oddsB: number;
  status: MarketStatus;
  timeRemaining: number | null;
  createdAt: number;
  settledAt: number | null;
  creator: string;
}

export type MarketStatus = 'open' | 'settled' | 'voided' | 'cancelled' | 'frozen';
export type StatusFilter = 'all' | MarketStatus;
export type SortOption = 'newest' | 'oldest' | 'volume' | 'expiring-soon';

export interface MarketFilters {
  search: string;
  status: StatusFilter;
  sortBy: SortOption;
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
