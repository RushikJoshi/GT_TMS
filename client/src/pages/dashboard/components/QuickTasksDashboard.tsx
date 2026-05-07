import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, CheckCircle2, Circle, Clock, AlertCircle, 
  LayoutGrid, List as ListIcon, Trash2, Edit2, 
  MoreVertical, Calendar, ChevronRight
} from 'lucide-react';
import { cn, formatDate, isDueDateOverdue } from '../../../utils/helpers';
import { useAppStore } from '../../../context/appStore';
import { quickTasksService } from '../../../services/api';
import { useNavigate } from 'react-router-dom';

const PRIORITY_COLORS = {
  low: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
  medium: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30',
  high: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30',
  urgent: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30',
};

const STATUS_CARDS: Array<{
  value: string;
  label: string;
  tone: string;
}> = [
  { value: 'all', label: 'All Tasks', tone: 'text-surface-900 dark:text-surface-100' },
  { value: 'todo', label: 'To Do', tone: 'text-amber-600 dark:text-amber-300' },
  { value: 'in_progress', label: 'In Progress', tone: 'text-blue-600 dark:text-blue-300' },
  { value: 'done', label: 'Done', tone: 'text-emerald-600 dark:text-emerald-300' },
  { value: 'overdue', label: 'Overdue', tone: 'text-rose-600 dark:text-rose-300' },
];

export const QuickTasksDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { quickTasks, updateQuickTask, deleteQuickTask, bootstrap } = useAppStore();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const counts = useMemo(() => {
    return {
      total: quickTasks.length,
      todo: quickTasks.filter(t => t.status === 'todo').length,
      in_progress: quickTasks.filter(t => t.status === 'in_progress').length,
      done: quickTasks.filter(t => t.status === 'done').length,
      overdue: quickTasks.filter(t => t.status !== 'done' && t.dueDate && isDueDateOverdue(t.dueDate, t.status)).length,
    };
  }, [quickTasks]);

  const sections = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return {
      today: quickTasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) <= now),
      pending: quickTasks.filter(t => t.status !== 'done' && (!t.dueDate || new Date(t.dueDate) > now)),
      completed: quickTasks.filter(t => t.status === 'done').slice(0, 10),
    };
  }, [quickTasks]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    setIsAdding(true);
    try {
      const res = await quickTasksService.create({
        title: newTaskTitle.trim(),
        priority: 'medium',
        status: 'todo',
      });
      await bootstrap();
      setNewTaskTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const toggleStatus = async (task: any) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await quickTasksService.update(task.id, { status: newStatus });
      await bootstrap();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STATUS_CARDS.map((card) => {
          const count =
            card.value === 'all' ? counts.total :
              card.value === 'todo' ? counts.todo :
                card.value === 'in_progress' ? counts.in_progress :
                  card.value === 'done' ? counts.done :
                    counts.overdue;

          return (
            <button
              key={card.value}
              type="button"
              onClick={() => navigate(`/quick-tasks?status=${card.value}`)}
              className={cn(
                'bg-white dark:bg-surface-900 p-4 text-left transition-all border rounded-2xl shadow-sm',
                'border-surface-200 dark:border-surface-800 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md'
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">{card.label}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className={cn('text-3xl font-bold', card.tone)}>{count}</p>
                <span className="text-xs font-medium text-surface-400">View</span>
              </div>
            </button>
          );
        })}
      </div>
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-100 dark:border-surface-800 shadow-sm">
        <form onSubmit={handleAddTask} className="flex-1 w-full relative">
          <input 
            type="text"
            placeholder="Add a quick task... (Press Enter)"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            disabled={isAdding}
            className="w-full h-11 pl-11 pr-4 bg-surface-50 dark:bg-surface-800 rounded-xl border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-surface-950 transition-all outline-none text-sm font-medium"
          />
          <Plus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
        </form>
        
        <div className="flex items-center gap-2 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl">
          <button 
            onClick={() => setViewMode('list')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              viewMode === 'list' ? "bg-white dark:bg-surface-900 text-brand-600 shadow-sm" : "text-surface-500 hover:text-surface-800"
            )}
          >
            <ListIcon size={14} /> List
          </button>
          <button 
            onClick={() => setViewMode('kanban')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              viewMode === 'kanban' ? "bg-white dark:bg-surface-900 text-brand-600 shadow-sm" : "text-surface-500 hover:text-surface-800"
            )}
          >
            <LayoutGrid size={14} /> Kanban
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TaskSection title="Due Today" tasks={sections.today} icon={<Clock className="text-amber-500" />} onToggle={toggleStatus} />
          <TaskSection title="Pending" tasks={sections.pending} icon={<AlertCircle className="text-brand-500" />} onToggle={toggleStatus} />
          <TaskSection title="Completed" tasks={sections.completed} icon={<CheckCircle2 className="text-emerald-500" />} onToggle={toggleStatus} isCompleted />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-320px)] min-h-[500px]">
          <KanbanColumn title="To Do" tasks={[...sections.today, ...sections.pending]} onToggle={toggleStatus} />
          <KanbanColumn title="In Progress" tasks={quickTasks.filter(t => t.status === 'in_progress')} onToggle={toggleStatus} />
          <KanbanColumn title="Done" tasks={sections.completed} onToggle={toggleStatus} />
        </div>
      )}
    </div>
  );
};

const TaskSection: React.FC<{ 
  title: string; 
  tasks: any[]; 
  icon: React.ReactNode; 
  onToggle: (t: any) => void;
  isCompleted?: boolean;
}> = ({ title, tasks, icon, onToggle, isCompleted }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 px-1">
      {icon}
      <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-widest">{title}</h3>
      <span className="ml-auto text-[10px] font-bold text-surface-400 bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded-full">{tasks.length}</span>
    </div>
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={onToggle} />
        ))}
      </AnimatePresence>
      {tasks.length === 0 && (
        <div className="py-8 text-center border-2 border-dashed border-surface-100 dark:border-surface-800 rounded-2xl text-[11px] font-medium text-surface-400 italic">
          No tasks here
        </div>
      )}
    </div>
  </div>
);

const TaskItem: React.FC<{ task: any; onToggle: (t: any) => void }> = ({ task, onToggle }) => {
  const isDone = task.status === 'done';
  const isOverdue = !isDone && task.dueDate && isDueDateOverdue(task.dueDate, task.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 p-3 rounded-2xl shadow-sm hover:border-brand-200 dark:hover:border-brand-900/50 transition-all flex items-center gap-3"
    >
      <button 
        onClick={() => onToggle(task)}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          isDone ? "bg-brand-500 border-brand-500 text-white" : "border-surface-200 hover:border-brand-400"
        )}
      >
        {isDone && <CheckCircle2 size={12} />}
      </button>
      
      <div className="min-w-0 flex-1">
        <h4 className={cn(
          "text-sm font-medium truncate group-hover:text-brand-600 transition-colors",
          isDone && "text-surface-400 line-through"
        )}>
          {task.title}
        </h4>
        <div className="flex items-center gap-3 mt-1">
          <span className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
            PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium
          )}>
            {task.priority}
          </span>
          {task.dueDate && (
            <span className={cn(
              "text-[10px] font-medium flex items-center gap-1",
              isOverdue ? "text-rose-500" : "text-surface-400"
            )}>
              <Calendar size={10} />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 text-surface-400 hover:text-brand-500">
          <Edit2 size={14} />
        </button>
        <button className="p-1.5 text-surface-400 hover:text-rose-500">
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
};

const KanbanColumn: React.FC<{ title: string; tasks: any[]; onToggle: (t: any) => void }> = ({ title, tasks, onToggle }) => (
  <div className="flex flex-col bg-surface-50 dark:bg-surface-950/50 rounded-2xl p-4 border border-surface-100 dark:border-surface-800">
    <div className="flex items-center justify-between mb-4 px-1">
      <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-widest">{title}</h3>
      <span className="text-[10px] font-bold text-surface-400 bg-white dark:bg-surface-900 px-2 py-0.5 rounded-full shadow-sm">{tasks.length}</span>
    </div>
    <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pb-4">
      {tasks.map((task) => (
        <div key={task.id} className="bg-white dark:bg-surface-900 p-3 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-start justify-between mb-2">
             <span className={cn(
              "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
              PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium
            )}>
              {task.priority}
            </span>
            <button onClick={() => onToggle(task)} className="text-surface-300 hover:text-brand-500 transition-colors">
              <Circle size={14} />
            </button>
          </div>
          <h4 className="text-xs font-semibold text-surface-800 dark:text-surface-200 mb-2 line-clamp-2">{task.title}</h4>
          <div className="flex items-center justify-between mt-auto">
            {task.dueDate && (
              <span className="text-[9px] font-medium text-surface-400 flex items-center gap-1">
                <Calendar size={10} />
                {formatDate(task.dueDate)}
              </span>
            )}
            <button className="opacity-0 group-hover:opacity-100 p-1 text-surface-400">
              <MoreVertical size={12} />
            </button>
          </div>
        </div>
      ))}
      {tasks.length === 0 && (
        <div className="h-24 border-2 border-dashed border-surface-200 dark:border-surface-800 rounded-xl flex items-center justify-center text-[10px] text-surface-400 uppercase font-bold tracking-tighter">
          Drop here
        </div>
      )}
    </div>
  </div>
);
