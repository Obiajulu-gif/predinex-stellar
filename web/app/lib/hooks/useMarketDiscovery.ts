'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MarketFilters, PaginationState, ProcessedMarket, SortOption, StatusFilter } from '../market-types';
import { readBlockHeightWarning, readMarketListCache, warmMarketListCache } from '../market-list-cache';
import { classifyConnectivityIssue, getConnectivityMessage, withTimeout } from '../network-errors';

interface UseMarketDiscoveryState {
  allMarkets: ProcessedMarket[];
  filteredMarkets: ProcessedMarket[];
  paginatedMarkets: ProcessedMarket[];
  isLoading: boolean;
  error: string | null;
  blockHeightWarning: string | null;
  filters: MarketFilters;
  pagination: PaginationState;
  setSearch: (search: string) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setSortBy: (sortBy: SortOption) => void;
  setPage: (page: number) => void;
  retry: () => void;
}

const ITEMS_PER_PAGE = 12;
const STATUSES: StatusFilter[] = ['all', 'open', 'settled', 'voided', 'cancelled', 'frozen'];
const SORTS: SortOption[] = ['newest', 'oldest', 'volume', 'expiring-soon'];
const LEGACY_STATUS_MAP: Record<string, StatusFilter> = { active: 'open', expired: 'open' };
const LEGACY_SORT_MAP: Record<string, SortOption> = { 'ending-soon': 'expiring-soon' };

function readStatus(value: string | null): StatusFilter {
  if (!value) return 'all';
  const normalized = LEGACY_STATUS_MAP[value] ?? value;
  return STATUSES.includes(normalized as StatusFilter) ? (normalized as StatusFilter) : 'all';
}

function readSort(value: string | null): SortOption {
  if (!value) return 'newest';
  const normalized = LEGACY_SORT_MAP[value] ?? value;
  return SORTS.includes(normalized as SortOption) ? (normalized as SortOption) : 'newest';
}

function marketStatusRank(status: ProcessedMarket['status']) {
  return ['open', 'frozen', 'settled', 'voided', 'cancelled'].indexOf(status);
}

export function useMarketDiscovery(): UseMarketDiscoveryState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [cacheSnapshot] = useState(() => readMarketListCache());
  const hasFreshInitialCacheRef = useRef(cacheSnapshot.isFresh);
  const hasAnyMarketsRef = useRef(cacheSnapshot.markets.length > 0);
  const filteredCountRef = useRef(0);

  const [blockHeightWarning, setBlockHeightWarning] = useState<string | null>(() => readBlockHeightWarning());
  const [allMarkets, setAllMarkets] = useState<ProcessedMarket[]>(cacheSnapshot.markets);
  const [isLoading, setIsLoading] = useState<boolean>(() => !cacheSnapshot.isFresh);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearchState] = useState(() => searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [status, setStatusState] = useState<StatusFilter>(() => readStatus(searchParams.get('status')));
  const [sortBy, setSortByState] = useState<SortOption>(() => readSort(searchParams.get('sort')));
  const [currentPage, setCurrentPage] = useState(() => Math.max(1, Number(searchParams.get('page') ?? 1) || 1));

  const fetchMarkets = useCallback(async (options?: { forceLoading?: boolean }) => {
    const shouldShowLoading = options?.forceLoading || !hasFreshInitialCacheRef.current;

    try {
      if (shouldShowLoading) setIsLoading(true);
      setError(null);
      const processedMarkets = await withTimeout(warmMarketListCache(), 12000, 'Market loading timeout');
      setAllMarkets(processedMarkets);
      hasAnyMarketsRef.current = processedMarkets.length > 0;
      setBlockHeightWarning(readBlockHeightWarning());
    } catch (err) {
      console.error('Failed to fetch markets:', err);
      const issue = classifyConnectivityIssue(err);
      const message = getConnectivityMessage(issue, 'Loading markets');
      if (hasAnyMarketsRef.current) {
        setError(null);
        setBlockHeightWarning(message);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
      hasFreshInitialCacheRef.current = true;
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (status !== 'all') params.set('status', status);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (currentPage > 1) params.set('page', String(currentPage));
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [currentPage, debouncedSearch, pathname, router, sortBy, status]);

  const filteredMarkets = useMemo(() => {
    let filtered = allMarkets;
    const searchLower = debouncedSearch.trim().toLowerCase();

    if (searchLower) {
      filtered = filtered.filter((market) => market.title.toLowerCase().includes(searchLower));
    }

    if (status !== 'all') {
      filtered = filtered.filter((market) => market.status === status);
    }

    const sorted = [...filtered];
    switch (sortBy) {
      case 'volume':
        sorted.sort((a, b) => b.totalVolume - a.totalVolume);
        break;
      case 'oldest':
        sorted.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'expiring-soon':
        sorted.sort((a, b) => {
          if (a.status === 'open' && b.status !== 'open') return -1;
          if (b.status === 'open' && a.status !== 'open') return 1;
          if (a.status === 'open' && b.status === 'open') return (a.timeRemaining ?? Infinity) - (b.timeRemaining ?? Infinity);
          return marketStatusRank(a.status) - marketStatusRank(b.status) || b.createdAt - a.createdAt;
        });
        break;
      default:
        sorted.sort((a, b) => b.createdAt - a.createdAt);
    }

    return sorted;
  }, [allMarkets, debouncedSearch, status, sortBy]);

  filteredCountRef.current = filteredMarkets.length;

  const pagination = useMemo((): PaginationState => {
    const totalItems = filteredMarkets.length;
    return { currentPage, itemsPerPage: ITEMS_PER_PAGE, totalItems, totalPages: Math.ceil(totalItems / ITEMS_PER_PAGE) };
  }, [filteredMarkets.length, currentPage]);

  const paginatedMarkets = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMarkets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMarkets, currentPage]);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setCurrentPage(1);
  }, []);

  const setStatusFilter = useCallback((value: StatusFilter) => {
    setStatusState(value);
    setCurrentPage(1);
  }, []);

  const setSortBy = useCallback((value: SortOption) => {
    setSortByState(value);
    setCurrentPage(1);
  }, []);

  const setPage = useCallback((page: number) => {
    const totalPages = Math.ceil(filteredCountRef.current / ITEMS_PER_PAGE);
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }, []);

  const retry = useCallback(() => fetchMarkets({ forceLoading: true }), [fetchMarkets]);
  const filters = useMemo<MarketFilters>(() => ({ search, status, sortBy }), [search, status, sortBy]);

  return { allMarkets, filteredMarkets, paginatedMarkets, isLoading, error, blockHeightWarning, filters, pagination, setSearch, setStatusFilter, setSortBy, setPage, retry };
}
