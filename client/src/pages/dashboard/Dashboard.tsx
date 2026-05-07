import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../context/authStore';
import { useAppStore } from '../../context/appStore';
import { ProjectsDashboard } from './components/ProjectsDashboard';
import { QuickTasksDashboard } from './components/QuickTasksDashboard';
import { cn } from '../../utils/helpers';
import { FolderKanban, Zap } from 'lucide-react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildChartDataFromTasks(tasks: { createdAt?: string; updatedAt?: string; status?: string }[]): { day: string; completed: number; added: number }[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const dayLabel = DAY_LABELS[d.getDay()];
    const added = tasks.filter((t) => {
      const created = t.createdAt ? new Date(t.createdAt) : null;
      return created && created >= d && created < next;
    }).length;
    const completed = tasks.filter((t) => {
      if (t.status !== 'done') return false;
      const updated = t.updatedAt ? new Date(t.updatedAt) : null;
      return updated && updated >= d && updated < next;
    }).length;
    return { day: dayLabel, completed, added };
  });
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { projects, tasks, users, quickTasks } = useAppStore();
  const [activeTab, setActiveTab] = useState<'projects' | 'quick'>('projects');

  const chartData = useMemo(() => 
    buildChartDataFromTasks([...tasks, ...quickTasks]), 
    [tasks, quickTasks]
  );

  return (
    <div className="mx-auto max-w-full space-y-6">
      {/* Premium Tab Navigation */}
      <div className="flex items-center justify-center pt-2">
        <div className="bg-white dark:bg-surface-900 p-1.5 rounded-[20px] shadow-sm border border-surface-100 dark:border-surface-800 flex items-center gap-1">
          <TabButton 
            active={activeTab === 'projects'} 
            onClick={() => setActiveTab('projects')}
            icon={<FolderKanban size={16} />}
            label="Projects Dashboard"
          />
          <TabButton 
            active={activeTab === 'quick'} 
            onClick={() => setActiveTab('quick')}
            icon={<Zap size={16} />}
            label="Quick Tasks"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="min-h-[calc(100vh-200px)]"
        >
          {activeTab === 'projects' ? (
            <ProjectsDashboard 
              user={user}
              projects={projects}
              tasks={tasks}
              users={users}
              quickTasks={quickTasks}
              chartData={chartData}
            />
          ) : (
            <QuickTasksDashboard />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const TabButton: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={cn(
      "relative flex items-center gap-2.5 px-6 py-2.5 rounded-[16px] text-sm font-bold transition-all duration-300",
      active 
        ? "text-brand-600 dark:text-brand-400" 
        : "text-surface-500 hover:text-surface-900 dark:hover:text-surface-200"
    )}
  >
    {active && (
      <motion.div
        layoutId="active-tab"
        className="absolute inset-0 bg-brand-50 dark:bg-brand-950/40 rounded-[16px] -z-0"
        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
      />
    )}
    <span className="relative z-10">{icon}</span>
    <span className="relative z-10 uppercase tracking-widest text-[11px]">{label}</span>
  </button>
);

export default DashboardPage;
