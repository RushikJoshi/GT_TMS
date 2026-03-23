import React, { useState, useEffect } from 'react';
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar
} from 'recharts';
import { 
  TrendingUp, Users, FolderKanban, CheckCircle2, Clock, AlertTriangle, 
  ChevronDown, Download, Filter, MoreHorizontal, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { misService } from '../../services/api';
import { cn } from '../../utils/helpers';
import { UserAvatar } from '../../components/UserAvatar';
import { useAppStore } from '../../context/appStore';

// Align with Dashboard colors
const COLORS = {
  primary: '#3366ff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#f43f5e',
  info: '#3b82f6',
  purple: '#7c3aed',
  slate: '#64748b'
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  trend?: number;
  delay?: number;
}> = ({ icon, label, value, color, trend, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="card p-4 sm:p-5"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      {trend !== undefined && (
        <span className={cn('text-xs font-medium flex items-center gap-0.5', trend >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
          <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="font-display font-bold text-2xl text-surface-900 dark:text-white mb-0.5">{value}</p>
    <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
  </motion.div>
);

const MISDashboard: React.FC = () => {
  const { projects: allProjects } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [timeData, setTimeData] = useState<any[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, perfRes, projRes, timeRes, reportRes] = await Promise.all([
          misService.getSummary(),
          misService.getEmployees(),
          misService.getProjects(),
          misService.getTime(),
          misService.getWeeklyReport()
        ]);
        
        setSummary(sumRes.data.data);
        setPerformance(perfRes.data.data);
        setProjectsData(projRes.data.data);
        setTimeData(timeRes.data.data);
        setWeeklyReport(reportRes.data.data);
      } catch (err) {
        console.error('Failed to fetch MIS data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Filters and Actions Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3 p-1.5 bg-surface-100/50 dark:bg-surface-800/50 rounded-full w-full sm:w-fit">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-surface-900 rounded-full shadow-sm border border-surface-100 dark:border-surface-700">
            <Filter size={12} className="text-surface-400" />
            <select className="bg-transparent border-none text-xs font-semibold text-surface-700 dark:text-surface-200 focus:ring-0 p-0 pr-6">
              <option>All Projects</option>
              {allProjects.map((p) => <option key={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-surface-900 rounded-full shadow-sm border border-surface-100 dark:border-surface-700">
            <Users size={12} className="text-surface-400" />
            <select className="bg-transparent border-none text-xs font-semibold text-surface-700 dark:text-surface-200 focus:ring-0 p-0 pr-6">
              <option>All Employees</option>
              {performance.map(p => <option key={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button className="btn-secondary btn-sm">
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid - Matching Dashboard style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Projects" value={projectsData.length} icon={<FolderKanban size={20} />} color={COLORS.primary} delay={0} />
        <StatCard label="Active Projects" value={projectsData.filter(p => p.progress < 100).length} icon={<TrendingUp size={20} />} color={COLORS.info} delay={0.05} />
        <StatCard label="Tasks Completed" value={summary.completedTasks} icon={<CheckCircle2 size={20} />} color={COLORS.success} delay={0.1} />
        <StatCard label="Pending" value={summary.pendingTasks} icon={<Clock size={20} />} color={COLORS.warning} delay={0.15} />
        <StatCard label="Overdue" value={summary.overdueTasks} icon={<AlertTriangle size={20} />} color={COLORS.danger} delay={0.2} />
        <StatCard label="Logged Hours" value={`${summary.totalActualTime}h`} icon={<Users size={20} />} color={COLORS.purple} delay={0.25} />
      </div>

      {/* Charts Section - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Productivity - Line Chart Style */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-semibold text-surface-900 dark:text-white">Weekly Productivity</h3>
              <p className="text-xs text-surface-400">Total hours logged per day</p>
            </div>
            <button className="text-surface-400 hover:text-surface-600 transition-colors"><MoreHorizontal size={18} /></button>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8896b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8896b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tw-bg-opacity, #fff)',
                    border: '1px solid #e4e8f2',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                />
                <Area type="monotone" dataKey="hours" stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Load - Bar Chart Style */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-semibold text-surface-900 dark:text-white">Task Completion Rate</h3>
              <p className="text-xs text-surface-400">Project-wise progress overview</p>
            </div>
          </div>
          <div className="h-[240px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={projectsData.slice(0, 6)} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8896b8' }} hide />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8896b8' }} />
                 <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tw-bg-opacity, #fff)',
                      border: '1px solid #e4e8f2',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                  />
                 <Bar dataKey="progress" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={32} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Employee Performance Table - Clean SaaS Table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-surface-50 dark:border-surface-800 flex items-center justify-between">
          <h3 className="font-display font-semibold text-surface-900 dark:text-white">Employee Performance</h3>
          <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Productivity Metrics</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/30">
                <th className="px-6 py-3 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Assigned</th>
                <th className="px-6 py-3 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Completed</th>
                <th className="px-6 py-3 text-[10px] font-bold text-rose-500 uppercase tracking-wider">Delayed</th>
                <th className="px-6 py-3 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-3 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Productivity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50 dark:divide-surface-800">
              {performance.map((user) => (
                <tr key={user.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/20 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={user.name} color={user.color} size="sm" />
                      <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-surface-600 dark:text-surface-400 font-medium">{user.tasksAssigned}</td>
                  <td className="px-6 py-3.5 text-sm font-bold text-emerald-600">{user.tasksCompleted}</td>
                  <td className="px-6 py-3.5 text-sm font-bold text-rose-500">{user.delayedTasks}</td>
                  <td className="px-6 py-3.5 text-sm text-surface-600 dark:text-surface-400 font-medium">{user.totalHours}h</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                       <div className="flex-1 min-w-[60px] h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-500", 
                              user.productivity > 80 ? "bg-emerald-500" : user.productivity > 50 ? "bg-amber-500" : "bg-rose-500")}
                            style={{ width: `${user.productivity}%` }}
                          />
                       </div>
                       <span className="text-xs font-bold text-surface-900 dark:text-white">{user.productivity}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Insights - Simple Section matching Dashboard */}
      {weeklyReport && (() => {
        const completed = weeklyReport.totalTasksCompleted;
        const delayed = weeklyReport.totalDelayedTasks;
        
        let insightTitle = "Excellent Progress!";
        let insightDesc = `Your team completed ${completed} tasks this week. Total hours logged: ${weeklyReport.totalHoursWorked}h`;
        let cardBg = "bg-brand-50/30 dark:bg-brand-950/10";
        let iconBg = "bg-brand-100 dark:bg-brand-900/30";
        let iconColor = "text-brand-600 dark:text-brand-400";

        if (completed === 0 && delayed === 0) {
          insightTitle = "Starting the Week!";
          insightDesc = "No task activity recorded yet this week. Assign tasks to get started.";
        } else if (delayed > completed) {
          insightTitle = "Review Required";
          insightDesc = `High delay count detected (${delayed} tasks). Current hours logged: ${weeklyReport.totalHoursWorked}h`;
          cardBg = "bg-amber-50/40 dark:bg-amber-950/10";
          iconBg = "bg-amber-100 dark:bg-amber-900/30";
          iconColor = "text-amber-600 dark:text-amber-400";
        }

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={cn("lg:col-span-2 card p-6", cardBg)}>
              <div className="flex items-start gap-4">
                <div className={cn("p-3 rounded-2xl", iconBg, iconColor)}>
                  <Zap size={24} />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                     <h3 className="text-lg font-display font-bold text-surface-900 dark:text-white mb-1">{insightTitle}</h3>
                     <p className="text-sm text-surface-500 dark:text-surface-400">
                       {insightDesc}
                     </p>
                     <div className="mt-3 flex gap-6">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-surface-400 tracking-wider mb-0.5">Top Performer</p>
                          <p className="text-sm font-bold text-surface-700 dark:text-surface-200">{weeklyReport.topPerformer}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-surface-400 tracking-wider mb-0.5">Least Performer</p>
                          <p className="text-sm font-bold text-surface-700 dark:text-surface-200">{weeklyReport.leastPerformer}</p>
                        </div>
                     </div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                     <button className="btn-primary btn-sm px-5">Download Report</button>
                     <button className="btn-secondary btn-sm px-5">View Insights</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card p-6 border-amber-100/50 dark:border-amber-900/20">
               <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle size={18} className="text-amber-500 mt-1" />
                  <h3 className="font-display font-bold text-surface-900 dark:text-white">Action Required</h3>
               </div>
               <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed mb-6">
                  You have <span className="text-rose-500 font-bold">{delayed} tasks delayed</span> this week. 
                  Recommend reviewing resource allocation for next week.
               </p>
               <button className="w-full btn-ghost border border-surface-100 dark:border-surface-700 text-xs font-bold py-2.5">Review Delays</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default MISDashboard;
