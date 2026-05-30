'use client';

import { useMemo } from 'react';
import Navbar from "../components/Navbar";
import { StatsCard } from '@/components/ui/StatsCard';
import SearchBar from "../components/SearchBar";
import FilterControls from "../components/FilterControls";
import SortControls from "../components/SortControls";
import MarketGrid from "../components/MarketGrid";
import Pagination from "../components/Pagination";
import { useMarketDiscovery } from "../lib/hooks/useMarketDiscovery";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import { StatusFilter } from '../lib/market-types';

function MarketsContent() {
  const {
    paginatedMarkets,
    isLoading,
    error,
    blockHeightWarning,
    filters,
    pagination,
    setSearch,
    setStatusFilter,
    setSortBy,
    setPage,
    retry,
    filteredMarkets,
    allMarkets,
  } = useMarketDiscovery();

  const filterCounts = useMemo<Record<StatusFilter, number>>(() => {
    const counts: Record<StatusFilter, number> = {
      all: allMarkets.length,
      open: 0,
      settled: 0,
      voided: 0,
      cancelled: 0,
      frozen: 0,
    };

    allMarkets.forEach((market) => {
      counts[market.status] += 1;
    });

    return counts;
  }, [allMarkets]);

  const hasActiveFilters = filters.search.trim() !== '' || filters.status !== 'all';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Prediction Markets</h1>
          <p className="text-muted-foreground">
            Discover and participate in decentralized prediction markets on Stellar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatsCard title="Total Markets" value={filterCounts.all} />
          <StatsCard title="Open" value={filterCounts.open} />
          <StatsCard title="Settled" value={filterCounts.settled} />
        </div>

        <div className="space-y-6 mb-8 sticky top-16 z-30 py-4 bg-background/80 backdrop-blur-md border-b border-transparent md:border-border/10">
          <div className="max-w-2xl">
            <SearchBar
              value={filters.search}
              onChange={setSearch}
              placeholder="Search markets by title..."
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <FilterControls
                selectedStatus={filters.status}
                onStatusChange={setStatusFilter}
                counts={filterCounts}
              />
            </div>

            <div className="lg:w-64">
              <SortControls
                selectedSort={filters.sortBy}
                onSortChange={setSortBy}
              />
            </div>
          </div>
        </div>

        {blockHeightWarning && (
          <div
            className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200"
            role="status"
            aria-live="polite"
          >
            {blockHeightWarning}
          </div>
        )}

        <MarketGrid
          markets={paginatedMarkets}
          isLoading={isLoading}
          error={error}
          onRetry={retry}
          searchQuery={filters.search}
          hasFilters={hasActiveFilters}
        />

        {!isLoading && !error && filteredMarkets.length > 0 && (
          <Pagination
            pagination={pagination}
            onPageChange={setPage}
          />
        )}
      </div>
    </main>
  );
}

export default function MarketsPage() {
  return (
    <RouteErrorBoundary routeName="Markets">
      <MarketsContent />
    </RouteErrorBoundary>
  );
}
