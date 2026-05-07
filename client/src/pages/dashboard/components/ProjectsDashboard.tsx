import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../context/appStore';
import { 
  FolderKanban, CheckCircle2, Clock, AlertTriangle, 
  TrendingUp, ArrowRight, Activity 
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn, formatDate, getProgressColor, isDueDateOverdue } from '../../../utils/helpers';
import { UserAvatar, AvatarGroup } from '../../../components/UserAvatar';
import { ProgressBar } from '../../../components/ui';

interface ProjectsDashboardProps {
  user: any;
  projects: any[];
  tasks: any[];
  users: any[];
  quickTasks: any[];
  chartData: any[];
}

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: number;
  delay?: number;
  onClick?: () => void;
}> = ({ icon, label, value, sub, color, trend, delay = 0, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    onClick={onClick}
    className={cn(
      'bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-100 dark:border-surface-800 shadow-sm transition-all',
      onClick && 'cursor-pointer hover:shadow-md hover:border-brand-200 dark:hover:border-brand-900/50'
    )}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
          trend >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-rose-50 text-rose-500 dark:bg-rose-950/30"
        )}>
          <TrendingUp size={10} className={trend < 0 ? "rotate-180" : ""} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="space-y-0.5">
      <h4 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">{value}</h4>
      <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{label}</p>
      {sub && <p className="text-[10px] text-surface-400">{sub}</p>}
    </div>
  </motion.div>
);

export const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({
  user,
  projects,
  tasks,
  users,
  quickTasks,
  chartData
}) => {
  const navigate = useNavigate();
  const isManagerOrAdmin = ['super_admin', 'admin', 'manager', 'team_leader'].includes(user?.role || '');
  
  const { getTaskStats, getProjectTasks } = useAppStore();
  const projectTasksList = useMemo(() => getProjectTasks(user), [getProjectTasks, user, tasks, projects]);
  const summaryStats = useMemo(() => getTaskStats(user, 'project'), [getTaskStats, user, tasks, quickTasks, projects]);

  const activeProjects = projects.filter(p => p.status === 'active');
  const activeTasksCount = summaryStats.totalActive;
  const myTasksCount = summaryStats.myOpenTasks;
  const overdueCount = summaryStats.totalOverdue;
  const completedCount = summaryStats.totalCompleted;

  const overviewTasks = useMemo(() => {
    return projectTasksList
      .filter((t) => t.status === 'in_progress')
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assignedTo: users.find((u) => u.id === t.assigneeIds?.[0])?.name || 'Unassigned',
        assigneeAvatar: users.find((u) => u.id === t.assigneeIds?.[0])?.avatar,
        projectName: projects.find((p) => p.id === t.projectId)?.name || 'Project',
      }))
      .slice(0, 6);
  }, [projectTasksList, users, projects]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<FolderKanban size={20} />} 
          label="Active Projects" 
          value={activeProjects.length} 
          sub="Ongoing initiatives" 
          color="#3366ff" 
          trend={12}
          onClick={() => navigate('/projects')}
        />
        <StatCard 
          icon={<CheckCircle2 size={20} />} 
          label="Tasks Completed" 
          value={completedCount} 
          sub="This week's output" 
          color="#10b981" 
          trend={8}
          onClick={() => navigate('/tasks?filter=done')}
        />
        <StatCard 
          icon={<Clock size={20} />} 
          label="My Open Tasks" 
          value={myTasksCount} 
          sub="Assigned to me" 
          color="#f59e0b" 
          trend={-3}
          onClick={() => navigate('/tasks?mine=true&filter=active')}
        />
        <StatCard 
          icon={<AlertTriangle size={20} />} 
          label="Overdue Tasks" 
          value={overdueCount} 
          sub="Immediate action" 
          color="#f43f5e" 
          trend={-15}
          onClick={() => navigate('/tasks?filter=overdue')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Graph */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">Activity Overview</h3>
              <p className="text-[11px] text-surface-400 font-medium">Task completions vs additions</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                <span className="text-[10px] font-bold text-surface-500 uppercase">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-surface-200"></span>
                <span className="text-[10px] font-bold text-surface-500 uppercase">Added</span>
              </div>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3366ff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3366ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#3366ff" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="added" 
                  stroke="#e2e8f0" 
                  strokeWidth={2} 
                  fill="none" 
                  strokeDasharray="5 5" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Tasks Overview */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-surface-50 dark:border-surface-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-widest">Team Activity</h3>
            <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400 text-[10px] font-bold">LIVE</span>
          </div>
          <div className="flex-1 overflow-auto max-h-[250px] no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md z-10">
                <tr className="text-[10px] font-bold text-surface-400 uppercase tracking-wider border-b border-surface-50 dark:border-surface-800">
                  <th className="px-5 py-2.5">Employee</th>
                  <th className="px-5 py-2.5">Task</th>
                  <th className="px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50 dark:divide-surface-800">
                {overviewTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={task.assignedTo} avatar={task.assigneeAvatar} size="xs" />
                        <span className="text-[11px] font-semibold text-surface-700 dark:text-surface-300 truncate max-w-[80px]">{task.assignedTo}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[11px] font-medium text-surface-900 dark:text-surface-100 truncate max-w-[120px]">{task.title}</p>
                      <p className="text-[9px] text-surface-400 truncate">{task.projectName}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="w-2 h-2 rounded-full bg-brand-500 block"></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => navigate('/tasks')} className="p-3 text-center text-[11px] font-bold text-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-colors border-t border-surface-50 dark:border-surface-800">
            View All Tasks
          </button>
        </div>
      </div>

      {/* Active Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-widest">Active Projects</h3>
          <button onClick={() => navigate('/projects')} className="text-xs font-bold text-brand-600 hover:underline">See all</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeProjects.slice(0, 6).map((project) => {
            const assignees = users.filter((u) => project.members.includes(u.id));
            return (
              <motion.div
                key={project.id}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-100 dark:border-surface-800 shadow-sm cursor-pointer hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: project.color }}>
                    {project.name[0]}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-[10px] font-bold text-surface-600 dark:text-surface-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                    ACTIVE
                  </span>
                </div>
                <h4 className="text-sm font-bold text-surface-900 dark:text-white mb-3 truncate">{project.name}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-surface-400 uppercase">Progress</span>
                    <span className="text-surface-900 dark:text-white">{project.progress}%</span>
                  </div>
                  <ProgressBar value={project.progress} size="sm" color={getProgressColor(project.progress)} />
                  <div className="flex items-center justify-between pt-1">
                    <AvatarGroup users={assignees} max={3} size="xs" />
                    <span className="text-[10px] font-bold text-surface-400">{project.members.length} Members</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
