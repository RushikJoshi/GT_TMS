import React from 'react';
import { addDays, buildMonthSegments } from './utils';

interface HeaderProps {
  startDate: string;
  totalDays: number;
  dayWidth: number;
  extraRightPadding?: number;
}

export const Header: React.FC<HeaderProps> = ({ startDate, totalDays, dayWidth, extraRightPadding = 80 }) => {
  const months = buildMonthSegments(startDate, totalDays);

  return (
    <div className="sticky top-0 z-20 border-b border-surface-200 bg-white/95 backdrop-blur dark:border-surface-800 dark:bg-surface-950/95">
      <div className="relative h-14" style={{ width: totalDays * dayWidth + extraRightPadding }}>
        <div className="grid h-7 border-b border-surface-100 dark:border-surface-800" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
          {months.map((segment) => (
            <div
              key={`${segment.label}-${segment.startOffset}`}
              className="flex items-center border-r border-surface-100 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-400 dark:border-surface-800"
              style={{ gridColumn: `${segment.startOffset + 1} / span ${segment.span}` }}
            >
              {segment.label}
            </div>
          ))}
        </div>
        <div className="grid h-7" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
          {Array.from({ length: totalDays }).map((_, index) => {
            const dateKey = addDays(startDate, index);
            const date = new Date(`${dateKey}T00:00:00Z`);
            return (
              <div
                key={dateKey}
                className="flex flex-col items-center justify-center border-r border-surface-100 text-[10px] text-surface-500 dark:border-surface-800 dark:text-surface-400"
              >
                <span className="font-semibold">{date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}</span>
                <span>{date.getUTCDate()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Header;
