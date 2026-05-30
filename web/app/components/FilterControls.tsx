'use client';

import { CheckCircle, CircleDot, Grid3X3, Lock, Snowflake, XCircle } from 'lucide-react';
import { StatusFilter } from '../lib/market-types';

interface FilterControlsProps {
  selectedStatus: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  counts?: Record<StatusFilter, number>;
}

interface FilterOption {
  value: StatusFilter;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const filterOptions: FilterOption[] = [
  { value: 'all', label: 'All', icon: <Grid3X3 className="w-4 h-4" />, description: 'Show all markets' },
  { value: 'open', label: 'Open', icon: <CircleDot className="w-4 h-4" />, description: 'Markets currently accepting bets' },
  { value: 'settled', label: 'Settled', icon: <CheckCircle className="w-4 h-4" />, description: 'Markets with final outcomes' },
  { value: 'voided', label: 'Voided', icon: <XCircle className="w-4 h-4" />, description: 'Markets voided for refunds' },
  { value: 'cancelled', label: 'Cancelled', icon: <Lock className="w-4 h-4" />, description: 'Markets cancelled before settlement' },
  { value: 'frozen', label: 'Frozen', icon: <Snowflake className="w-4 h-4" />, description: 'Markets temporarily frozen' },
];

export default function FilterControls({ selectedStatus, onStatusChange, counts }: FilterControlsProps) {
  const getFilterColor = (status: StatusFilter, isSelected: boolean) => {
    if (!isSelected) return 'text-muted-foreground hover:text-foreground border-muted/30 hover:border-muted/50';

    switch (status) {
      case 'open': return 'text-green-500 border-green-500 bg-green-500/10';
      case 'settled': return 'text-blue-500 border-blue-500 bg-blue-500/10';
      case 'voided': return 'text-orange-500 border-orange-500 bg-orange-500/10';
      case 'cancelled': return 'text-red-500 border-red-500 bg-red-500/10';
      case 'frozen': return 'text-cyan-400 border-cyan-400 bg-cyan-400/10';
      default: return 'text-primary border-primary bg-primary/10';
    }
  };

  const getCount = (status: StatusFilter): number => counts?.[status] ?? 0;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Filter by Status</h3>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Market status filters">
        {filterOptions.map((option) => {
          const isSelected = selectedStatus === option.value;
          const count = getCount(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusChange(option.value)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 transition-all duration-200 ${getFilterColor(option.value, isSelected)} hover:scale-105 active:scale-95`}
              title={option.description}
              aria-pressed={isSelected}
            >
              {option.icon}
              <span className="text-sm font-medium">{option.label}</span>
              {counts && <span className="text-xs opacity-75">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
