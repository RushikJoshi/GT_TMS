import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BarChart3, CalendarClock, CheckCircle2, ChevronDown, Download, RefreshCcw, Search, Users } from 'lucide-react';
import { addDays, endOfDay, format, isWithinInterval, parseISO, startOfDay, subDays, subMonths, subYears } from 'date-fns';
import { cn, formatDate } from '../../utils/helpers';
import { useAppStore } from '../../context/appStore';
import { reportsService } from '../../services/api';
import type { DailyWorkReport, Priority } from '../../app/types';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
type FlatItem = { id: string; title: string; type: 'project_task' | 'quick_task'; status: string; priority: Priority; dueDate?: string; createdAt: string; updatedAt: string; completedAt?: string; assigneeIds: string[]; projectName: string };

const PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const COLORS = { blue: '#3366ff', green: '#10b981', amber: '#f59e0b', red: '#ef4444', slate: '#94a3b8', violet: '#7c3aed' };

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPdfTable(headers: string[], rows: Array<Array<string | number>>) {
  return `
    <table class="report-table">
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  `;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  try {
    return value.includes('T') ? parseISO(value) : parseISO(`${value}T00:00:00`);
  } catch {
    return null;
  }
}

function getRange(period: ReportPeriod) {
  const now = new Date();
  if (period === 'daily') return { start: startOfDay(now), end: endOfDay(now), steps: 1, mode: 'day' as const };
  if (period === 'weekly') return { start: startOfDay(subDays(now, 6)), end: endOfDay(now), steps: 7, mode: 'day' as const };
  if (period === 'monthly') return { start: startOfDay(subDays(now, 29)), end: endOfDay(now), steps: 30, mode: 'day' as const };
  return { start: startOfDay(subYears(now, 1)), end: endOfDay(now), steps: 12, mode: 'month' as const };
}

function inRange(dateValue: string | undefined, range: { start: Date; end: Date }) {
  const date = parseDate(dateValue);
  return date ? isWithinInterval(date, range) : false;
}

function csv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export const ReportManagementPage: React.FC = () => {
  const { tasks, quickTasks, users, projects } = useAppStore();
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(new Date().toISOString());
  const [latestDailyReport, setLatestDailyReport] = useState<DailyWorkReport | null>(null);
  const [dailyHistory, setDailyHistory] = useState<DailyWorkReport[]>([]);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [historyRes, latestRes] = await Promise.all([reportsService.getDaily(10), reportsService.getDailyLatest()]);
        if (!active) return;
        setDailyHistory(historyRes.data?.data || []);
        setLatestDailyReport(latestRes.data?.data || null);
      } catch {
        if (!active) return;
        setDailyHistory([]);
        setLatestDailyReport(null);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!userDropdownOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!userDropdownRef.current?.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [userDropdownOpen]);

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);
  const range = useMemo(() => getRange(period), [period]);
  const selectedUserLabel = selectedUserId === 'all' ? 'All Employees' : (userMap.get(selectedUserId) || 'Selected Employee');
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query));
  }, [userSearch, users]);

  const items = useMemo<FlatItem[]>(() => ([
    ...tasks.map((task) => ({
      id: task.id,
      title: task.title,
      type: 'project_task' as const,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completionReview?.completedAt || (task.status === 'done' ? task.updatedAt : undefined),
      assigneeIds: task.assigneeIds || [],
      projectName: projectMap.get(task.projectId) || 'Project task',
    })),
    ...quickTasks.map((task) => ({
      id: task.id,
      title: task.title,
      type: 'quick_task' as const,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completionReview?.completedAt || (task.status === 'done' ? task.updatedAt : undefined),
      assigneeIds: task.assigneeIds || [],
      projectName: 'Quick task',
    })),
  ]), [projectMap, quickTasks, tasks]);

  const filteredItems = useMemo(() => items.filter((item) => (
    inRange(item.createdAt, range) || inRange(item.updatedAt, range) || inRange(item.dueDate, range) || inRange(item.completedAt, range)
  )), [items, range]);

  const scopedItems = useMemo(() => (
    selectedUserId === 'all'
      ? filteredItems
      : filteredItems.filter((item) => item.assigneeIds.includes(selectedUserId))
  ), [filteredItems, selectedUserId]);

  const trendData = useMemo(() => {
    const buckets = range.mode === 'month'
      ? Array.from({ length: 12 }, (_, index) => {
          const date = subMonths(range.end, 11 - index);
          const start = startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
          const end = endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
          return { label: format(date, 'MMM'), start, end };
        })
      : Array.from({ length: range.steps }, (_, index) => {
          const date = addDays(range.start, index);
          return { label: format(date, 'MMM d'), start: startOfDay(date), end: endOfDay(date) };
        });

    return buckets.map((bucket) => ({
      label: bucket.label,
      created: scopedItems.filter((item) => inRange(item.createdAt, bucket)).length,
      completed: scopedItems.filter((item) => inRange(item.completedAt, bucket)).length,
      due: scopedItems.filter((item) => inRange(item.dueDate, bucket) && item.status !== 'done').length,
    }));
  }, [range, scopedItems]);

  const statusData = useMemo(() => {
    const grouped = scopedItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value, color: COLORS.blue }));
  }, [scopedItems]);

  const priorityData = useMemo(() => (['low', 'medium', 'high', 'urgent'] as Priority[]).map((priority) => ({
    name: priority,
    value: scopedItems.filter((item) => item.priority === priority).length,
    color: priority === 'urgent' ? COLORS.red : priority === 'high' ? COLORS.amber : priority === 'medium' ? COLORS.blue : COLORS.slate,
  })), [scopedItems]);

  const employeeRows = useMemo(() => {
    if (period === 'daily' && latestDailyReport?.employeeSummaries?.length) {
      return latestDailyReport.employeeSummaries.map((employee) => ({
        id: employee.userId,
        name: employee.name,
        open: employee.assignedOpenTasks,
        completed: employee.completedToday,
        dueToday: employee.dueToday,
        overdue: employee.overdueOpen,
        score: employee.performanceScore,
        note: employee.analysis,
      }));
    }
    return users.map((user) => {
      const assigned = scopedItems.filter((item) => item.assigneeIds.includes(user.id));
      const open = assigned.filter((item) => item.status !== 'done').length;
      const completed = assigned.filter((item) => item.status === 'done').length;
      const dueToday = assigned.filter((item) => {
        const due = parseDate(item.dueDate);
        return due && isWithinInterval(due, { start: startOfDay(new Date()), end: endOfDay(new Date()) }) && item.status !== 'done';
      }).length;
      const overdue = assigned.filter((item) => {
        const due = parseDate(item.dueDate);
        return due && due < startOfDay(new Date()) && item.status !== 'done';
      }).length;
      const score = assigned.length ? Math.max(0, Math.min(100, Math.round((completed / assigned.length) * 100) - (overdue * 5))) : 0;
      return { id: user.id, name: user.name, open, completed, dueToday, overdue, score, note: overdue ? `${overdue} overdue items need attention.` : 'Stable workload.' };
    }).filter((user) => user.open || user.completed || user.dueToday || user.overdue).slice(0, 8);
  }, [latestDailyReport, period, scopedItems, users]);

  const summary = useMemo(() => {
    const total = scopedItems.length;
    const completed = scopedItems.filter((item) => item.status === 'done').length;
    const open = scopedItems.filter((item) => item.status !== 'done').length;
    const dueToday = scopedItems.filter((item) => {
      const due = parseDate(item.dueDate);
      return due && isWithinInterval(due, { start: startOfDay(new Date()), end: endOfDay(new Date()) }) && item.status !== 'done';
    }).length;
    const overdue = scopedItems.filter((item) => {
      const due = parseDate(item.dueDate);
      return due && due < startOfDay(new Date()) && item.status !== 'done';
    }).length;
    const quickTaskCount = scopedItems.filter((item) => item.type === 'quick_task').length;
    const projectTaskCount = scopedItems.filter((item) => item.type === 'project_task').length;
    return {
      total,
      completed,
      open,
      dueToday,
      overdue,
      employees: new Set(scopedItems.flatMap((item) => item.assigneeIds)).size,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      quickTaskCount,
      projectTaskCount,
    };
  }, [scopedItems]);

  const deadlineRows = useMemo(() => scopedItems
    .filter((item) => item.status !== 'done' && item.dueDate)
    .sort((a, b) => (parseDate(a.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER) - (parseDate(b.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER))
    .slice(0, 10), [scopedItems]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      if (period === 'daily') {
        const res = await reportsService.runDailyNow();
        setLatestDailyReport(res.data?.data?.report || null);
        const historyRes = await reportsService.getDaily(10);
        setDailyHistory(historyRes.data?.data || []);
      }
      setGeneratedAt(new Date().toISOString());
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    const rows = [
      ['Period', period],
      ['Generated At', formatDate(generatedAt)],
      ['Total Items', String(summary.total)],
      ['Completed', String(summary.completed)],
      ['Open', String(summary.open)],
      ['Due Today', String(summary.dueToday)],
      ['Overdue', String(summary.overdue)],
      [],
      ['Employee', 'Open', 'Completed', 'Due Today', 'Overdue', 'Score'],
      ...employeeRows.map((row) => [row.name, String(row.open), String(row.completed), String(row.dueToday), String(row.overdue), `${row.score}%`]),
    ];
    const blob = new Blob([csv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-management-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const selectedUserName = selectedUserId === 'all' ? 'All Employees' : (userMap.get(selectedUserId) || 'Selected Employee');
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      window.alert('Please allow pop-ups for this site to export the PDF.');
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write('<!doctype html><html><head><title>Preparing report...</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">Preparing PDF export...</body></html>');
    reportWindow.document.close();

    const quickTaskRows = scopedItems
      .filter((item) => item.type === 'quick_task')
      .slice(0, 12)
      .map((item) => [
        item.title,
        item.status.replace(/_/g, ' '),
        item.priority,
        item.dueDate ? formatDate(item.dueDate) : 'No due date',
        item.assigneeIds.map((id) => userMap.get(id) || 'Unknown').join(', ') || 'Unassigned',
      ]);

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(`Report Management ${period}`)}</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #172554; margin: 0; }
            .hero { border: 1px solid #dbe4ff; background: linear-gradient(135deg, #eff6ff 0%, #ffffff 62%); border-radius: 18px; padding: 24px; margin-bottom: 20px; }
            .eyebrow { color: #3366ff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; }
            .title { margin: 10px 0 6px; font-size: 28px; font-weight: 700; color: #0f172a; }
            .sub { color: #475569; font-size: 13px; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
            .card-label { font-size: 11px; text-transform: uppercase; color: #64748b; }
            .card-value { margin-top: 8px; font-size: 22px; font-weight: 700; color: #0f172a; }
            .section { margin-top: 20px; }
            .section h2 { font-size: 16px; margin: 0 0 10px; color: #0f172a; }
            .report-table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .report-table th, .report-table td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
            .report-table th { background: #f8fafc; text-transform: uppercase; font-size: 10px; color: #475569; letter-spacing: 0.06em; }
          </style>
        </head>
        <body>
          <div class="hero">
            <div class="eyebrow">Report Management</div>
            <div class="title">${escapeHtml(period.charAt(0).toUpperCase() + period.slice(1))} Report</div>
            <div class="sub">Scope: ${escapeHtml(selectedUserName)}</div>
            <div class="sub">Generated: ${escapeHtml(formatDate(generatedAt, 'MMM d, yyyy hh:mm a'))}</div>
          </div>
          <div class="grid">
            <div class="card"><div class="card-label">Total Items</div><div class="card-value">${summary.total}</div></div>
            <div class="card"><div class="card-label">Project Tasks</div><div class="card-value">${summary.projectTaskCount}</div></div>
            <div class="card"><div class="card-label">Quick Tasks</div><div class="card-value">${summary.quickTaskCount}</div></div>
            <div class="card"><div class="card-label">Completion Rate</div><div class="card-value">${summary.completionRate}%</div></div>
          </div>
          <div class="section">
            <h2>Employee Overview</h2>
            ${renderPdfTable(['Employee', 'Open', 'Completed', 'Due Today', 'Overdue', 'Score'], employeeRows.map((row) => [row.name, row.open, row.completed, row.dueToday, row.overdue, `${row.score}%`]))}
          </div>
          <div class="section">
            <h2>Deadline Table</h2>
            ${renderPdfTable(['Title', 'Type', 'Project', 'Assignees', 'Due Date', 'Priority'], deadlineRows.map((row) => [row.title, row.type === 'project_task' ? 'Project Task' : 'Quick Task', row.projectName, row.assigneeIds.map((id) => userMap.get(id) || 'Unknown').join(', ') || 'Unassigned', row.dueDate ? formatDate(row.dueDate) : 'No due date', row.priority]))}
          </div>
          <div class="section">
            <h2>Quick Task Portion</h2>
            ${renderPdfTable(['Title', 'Status', 'Priority', 'Due Date', 'Assignees'], quickTaskRows.length ? quickTaskRows : [['No quick tasks in current scope', '-', '-', '-', '-']])}
          </div>
        </body>
      </html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.onload = () => {
      reportWindow.focus();
      setTimeout(() => {
        reportWindow.print();
      }, 250);
    };
  };

  return (
    <div className="mx-auto flex max-w-full flex-col gap-6">
      <div className="page-header flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="page-title">Report Generation Management</h1>
          <p className="page-subtitle">Generate daily, weekly, monthly, and yearly reports with charts, graphs, tables, and employee work visibility.</p>
        </div>
        <div className="flex w-full flex-col gap-3 xl:w-auto">
          <div className="flex overflow-x-auto rounded-2xl bg-surface-100 p-1 dark:bg-surface-800">
            {PERIODS.map((option) => (
              <button key={option.key} onClick={() => setPeriod(option.key)} className={cn('whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all', period === option.key ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-900 dark:text-white' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-200')}>
                {option.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center">
          <div ref={userDropdownRef} className="relative w-full min-w-0 sm:col-span-2 xl:w-[320px]">
            <button
              type="button"
              onClick={() => setUserDropdownOpen((open) => !open)}
              className="input flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="truncate">{selectedUserLabel}</span>
              <ChevronDown size={16} className={cn('shrink-0 text-surface-500 transition-transform', userDropdownOpen && 'rotate-180')} />
            </button>

            {userDropdownOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-900">
                <div className="border-b border-surface-100 p-3 dark:border-surface-800">
                  <div className="relative">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search employee..."
                      className="input w-full pl-9"
                    />
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserId('all');
                      setUserDropdownOpen(false);
                      setUserSearch('');
                    }}
                    className={cn(
                      'flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors',
                      selectedUserId === 'all'
                        ? 'bg-brand-600 text-white'
                        : 'text-surface-700 hover:bg-surface-50 dark:text-surface-200 dark:hover:bg-surface-800'
                    )}
                  >
                    All Employees
                  </button>
                  {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setUserDropdownOpen(false);
                        setUserSearch('');
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                        selectedUserId === user.id
                          ? 'bg-brand-600 text-white'
                          : 'text-surface-700 hover:bg-surface-50 dark:text-surface-200 dark:hover:bg-surface-800'
                      )}
                    >
                      <span className="truncate">{user.name}</span>
                      <span className={cn('shrink-0 truncate text-xs', selectedUserId === user.id ? 'text-white/80' : 'text-surface-400')}>
                        {user.email}
                      </span>
                    </button>
                  )) : (
                    <div className="px-4 py-5 text-sm text-surface-400">No employee found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary btn-md w-full sm:w-auto">
            <RefreshCcw size={15} className={cn(isGenerating && 'animate-spin')} />
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
          <button onClick={handleExport} className="btn-secondary btn-md w-full sm:w-auto">
            <Download size={15} />
            Export CSV
          </button>
          <button onClick={handleExportPdf} className="btn-secondary btn-md w-full sm:w-auto">
            <Download size={15} />
            Export PDF
          </button>
          </div>
        </div>
      </div>

      <div className="card border-brand-100 bg-gradient-to-r from-brand-50 via-white to-surface-50 p-5 dark:border-brand-900/30 dark:from-brand-950/15 dark:via-surface-900 dark:to-surface-900">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-600">Generated Summary</p>
        <h2 className="mt-2 text-2xl font-semibold text-surface-900 dark:text-white">
          {period === 'daily' && latestDailyReport?.analysis?.headline
            ? latestDailyReport.analysis.headline
            : `${summary.completed} items completed with ${summary.overdue} overdue in the selected ${period} window.`}
        </h2>
        <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">Last generated {formatDate(generatedAt, 'MMM d, yyyy hh:mm a')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5"><BarChart3 size={20} className="text-brand-600" /><p className="mt-4 text-2xl font-semibold">{summary.total}</p><p className="text-sm font-medium">Total Work Items</p><p className="text-xs text-surface-400">All captured tasks and quick tasks</p></div>
        <div className="card p-5"><Activity size={20} className="text-sky-600" /><p className="mt-4 text-2xl font-semibold">{summary.projectTaskCount}</p><p className="text-sm font-medium">Project Tasks</p><p className="text-xs text-surface-400">Project-task portion of this report</p></div>
        <div className="card p-5"><Activity size={20} className="text-violet-600" /><p className="mt-4 text-2xl font-semibold">{summary.quickTaskCount}</p><p className="text-sm font-medium">Quick Tasks</p><p className="text-xs text-surface-400">Quick-task portion of this report</p></div>
        <div className="card p-5"><CheckCircle2 size={20} className="text-emerald-600" /><p className="mt-4 text-2xl font-semibold">{summary.completed}</p><p className="text-sm font-medium">Completed Work</p><p className="text-xs text-surface-400">{summary.completionRate}% completion rate</p></div>
        <div className="card p-5"><CalendarClock size={20} className="text-amber-500" /><p className="mt-4 text-2xl font-semibold">{summary.dueToday}</p><p className="text-sm font-medium">Due Today</p><p className="text-xs text-surface-400">Open items due today</p></div>
        <div className="card p-5"><Users size={20} className="text-violet-600" /><p className="mt-4 text-2xl font-semibold">{summary.employees}</p><p className="text-sm font-medium">Active Employees</p><p className="text-xs text-surface-400">Contributors in this report</p></div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="card p-5">
          <h3 className="font-display font-bold text-surface-900 dark:text-white">Delivery Trend</h3>
          <p className="mb-6 text-xs text-surface-400">Created, completed, and due work across the selected period</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e8f2" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8896b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8896b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="created" stroke={COLORS.blue} fillOpacity={0.1} fill={COLORS.blue} />
              <Area type="monotone" dataKey="completed" stroke={COLORS.green} fillOpacity={0.1} fill={COLORS.green} />
              <Area type="monotone" dataKey="due" stroke={COLORS.amber} fillOpacity={0.08} fill={COLORS.amber} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-display font-bold text-surface-900 dark:text-white">Status Split</h3>
          <p className="mb-6 text-xs text-surface-400">Current distribution of work</p>
          <div className="h-[220px] sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" innerRadius={58} outerRadius={86}>
                  {statusData.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={index % 2 === 0 ? COLORS.blue : COLORS.violet} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {statusData.map((row) => <div key={row.name} className="flex items-center justify-between text-xs"><span className="capitalize text-surface-500">{row.name}</span><span className="font-bold text-surface-900 dark:text-white">{row.value}</span></div>)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-display font-bold text-surface-900 dark:text-white">Priority Load</h3>
          <p className="mb-6 text-xs text-surface-400">Distribution by urgency level</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e8f2" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8896b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8896b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>{priorityData.map((row) => <Cell key={row.name} fill={row.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2"><Activity size={18} className="text-brand-600" /><h3 className="font-display font-bold text-surface-900 dark:text-white">Recent Daily Reports</h3></div>
          <div className="space-y-3">
            {dailyHistory.length > 0 ? dailyHistory.slice(0, 6).map((report) => (
              <div key={report.id || report.reportDate} className="rounded-2xl border border-surface-100 px-4 py-3 dark:border-surface-800">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{formatDate(report.reportDate)}</p><p className="text-xs text-surface-400">{report.analysis.headline}</p></div>
                  <div className="text-right"><p className="text-sm font-semibold text-brand-600">{report.summary.totalCompletedToday} done</p><p className="text-[11px] text-surface-400">{report.summary.totalOverdueOpen} overdue</p></div>
                </div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-surface-200 px-4 py-6 text-sm text-surface-400 dark:border-surface-800">No generated daily history yet.</div>}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-surface-100 px-5 py-4 dark:border-surface-800">
          <h3 className="font-display font-bold text-surface-900 dark:text-white">Employee Overview</h3>
          <p className="text-xs text-surface-400">Current workload and performance snapshot for each person</p>
        </div>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] divide-y divide-surface-100 dark:divide-surface-800">
            <thead className="bg-surface-50 dark:bg-surface-950/40">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wide text-surface-400">Employee</th>
                <th className="px-5 py-3 text-center text-[11px] uppercase tracking-wide text-surface-400">Open</th>
                <th className="px-5 py-3 text-center text-[11px] uppercase tracking-wide text-surface-400">Completed</th>
                <th className="px-5 py-3 text-center text-[11px] uppercase tracking-wide text-surface-400">Due Today</th>
                <th className="px-5 py-3 text-center text-[11px] uppercase tracking-wide text-surface-400">Overdue</th>
                <th className="px-5 py-3 text-center text-[11px] uppercase tracking-wide text-surface-400">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {employeeRows.length > 0 ? employeeRows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-50/70 dark:hover:bg-surface-900/60">
                  <td className="px-5 py-4"><p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{row.name}</p><p className="text-xs text-surface-400">{row.note}</p></td>
                  <td className="px-5 py-4 text-center text-sm">{row.open}</td>
                  <td className="px-5 py-4 text-center text-sm">{row.completed}</td>
                  <td className="px-5 py-4 text-center text-sm">{row.dueToday}</td>
                  <td className="px-5 py-4 text-center text-sm text-rose-500">{row.overdue}</td>
                  <td className="px-5 py-4 text-center"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/30 dark:text-brand-300">{row.score}%</span></td>
                </tr>
              )) : <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-surface-400">No employee work activity is available in this report window.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-surface-100 px-5 py-4 dark:border-surface-800">
          <h3 className="font-display font-bold text-surface-900 dark:text-white">Deadline Table</h3>
          <p className="text-xs text-surface-400">Upcoming deadlines with assignees and work type visibility</p>
        </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] divide-y divide-surface-100 dark:divide-surface-800">
            <thead className="bg-surface-50 dark:bg-surface-950/40">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wide text-surface-400">Title</th>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wide text-surface-400">Type</th>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wide text-surface-400">Project</th>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wide text-surface-400">Assignees</th>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wide text-surface-400">Due</th>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wide text-surface-400">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {deadlineRows.length > 0 ? deadlineRows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-50/70 dark:hover:bg-surface-900/60">
                  <td className="px-5 py-4 text-sm font-medium text-surface-900 dark:text-surface-100">{row.title}</td>
                  <td className="px-5 py-4 text-sm">{row.type === 'project_task' ? 'Project Task' : 'Quick Task'}</td>
                  <td className="px-5 py-4 text-sm">{row.projectName}</td>
                  <td className="px-5 py-4 text-sm">{row.assigneeIds.map((id) => userMap.get(id) || 'Unknown').join(', ') || 'Unassigned'}</td>
                  <td className="px-5 py-4 text-sm">{row.dueDate ? formatDate(row.dueDate) : 'No due date'}</td>
                  <td className="px-5 py-4"><span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: priorityData.find((item) => item.name === row.priority)?.color || COLORS.slate }}>{row.priority}</span></td>
                </tr>
              )) : <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-surface-400">No upcoming deadline rows are available in this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportManagementPage;
