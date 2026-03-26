import React from 'react';
import type { User } from '../../app/types';
import type { TimelineRow } from './utils';

interface SidebarProps {
  rows: TimelineRow[];
  totalHeight: number;
  viewportHeight: number;
  scrollTop: number;
  containerClassName?: string;
  users: User[];
  selectedDependencyFrom: string;
  onSelectDependencyFrom: (taskId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  rows,
  totalHeight,
  viewportHeight,
  scrollTop,
  containerClassName,
  users,
  selectedDependencyFrom,
  onSelectDependencyFrom,
}) => {
  const userMap = new Map(users.map((user) => [user.id, user]));
  const contentHeight = Math.max(0, viewportHeight - 56);

  return (
    <div className={`relative overflow-hidden border-r border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-950 ${containerClassName || 'h-[72vh]'}`}>
      <div className="sticky top-0 z-20 flex h-14 items-center border-b border-surface-200 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:border-surface-800">
        Timeline Outline
      </div>
      <div className="relative overflow-hidden" style={{ height: contentHeight }}>
        {rows.map((row) => (
          <div
            key={row.id}
            className={row.kind === 'phase'
              ? 'absolute inset-x-0 flex items-center border-b border-surface-200 bg-surface-50 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-surface-500 dark:border-surface-800 dark:bg-surface-900/70'
              : 'absolute inset-x-0 border-b border-surface-100 px-4 py-2 dark:border-surface-900'}
            style={{ top: row.top - scrollTop, height: row.height }}
          >
            {row.kind === 'phase' ? (
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.phase.color || '#64748b' }} />
                <span>{row.phase.name}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-surface-400 dark:bg-surface-950">
                  {row.phase.tasks.length}
                </span>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                    {row.task.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-surface-400">
                    <span className="capitalize">{row.task.type}</span>
                    <span>{row.task.startDate}</span>
                    <span>to</span>
                    <span>{row.task.endDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {row.task.assigneeIds.slice(0, 2).map((assigneeId) => {
                    const user = userMap.get(assigneeId);
                    return (
                      <span
                        key={assigneeId}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: user?.color || '#64748b' }}
                        title={user?.name || assigneeId}
                      >
                        {(user?.name || 'U').slice(0, 1).toUpperCase()}
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => onSelectDependencyFrom(row.task.id)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      selectedDependencyFrom === row.task.id
                        ? 'bg-brand-600 text-white'
                        : 'bg-surface-100 text-surface-500 dark:bg-surface-900 dark:text-surface-400'
                    }`}
                  >
                    Link
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {totalHeight > 0 ? <div aria-hidden="true" style={{ height: totalHeight }} /> : null}
      </div>
    </div>
  );
};

export default Sidebar;
