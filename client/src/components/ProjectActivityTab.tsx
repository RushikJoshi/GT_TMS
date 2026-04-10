import React, { useEffect, useState } from 'react';
import { activityService } from '../services/api';
import { UserAvatar } from './UserAvatar';
import { formatRelativeTime, cn } from '../utils/helpers';
import { Clock, MessageSquare, CheckCircle2, AlertTriangle, Layers, Info, PlusCircle, ListTodo, Paperclip, Edit3 } from 'lucide-react';
import { EmptyState } from './ui';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    color?: string;
  } | null;
}

interface ProjectActivityTabProps {
  projectId: string;
}

export const ProjectActivityTab: React.FC<ProjectActivityTabProps> = ({ projectId }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const res = await activityService.getByProject(projectId);
        setActivities(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Clock size={40} className="text-brand-500 animate-pulse" />
        <p className="text-surface-400 font-medium tracking-wide">Loading project history...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={32} />}
        title="No activity yet"
        description="Task updates and comments for this project will appear here."
      />
    );
  }

  // Group by task
  const grouped = activities.reduce((acc, item) => {
    const key = item.entityName || 'General Project Activity';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, ActivityItem[]>);

  const getIcon = (type: string) => {
    switch (type) {
      case 'EXTENSION_REQUESTED': return <AlertTriangle size={14} className="text-amber-500" />;
      case 'EXTENSION_APPROVED': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'EXTENSION_REJECTED': return <XCircle size={14} className="text-rose-500" />;
      case 'task_status_changed': return <Layers size={14} className="text-brand-500" />;
      case 'COMMENT_ADDED': return <MessageSquare size={14} className="text-sky-500" />;
      case 'task_created': return <PlusCircle size={14} className="text-emerald-500" />;
      case 'subtask_added': return <ListTodo size={14} className="text-blue-500" />;
      case 'attachment_added': return <Paperclip size={14} className="text-orange-500" />;
      case 'task_updated': return <Edit3 size={14} className="text-indigo-500" />;
      default: return <Info size={14} className="text-surface-400" />;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {Object.entries(grouped).map(([taskName, items]) => (
        <div key={taskName} className="relative pl-6 border-l-2 border-surface-100 dark:border-surface-800 ml-4">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-surface-900 border-2 border-brand-500 shadow-sm shadow-brand-500/20" />
          
          <h3 className="text-sm font-bold text-surface-900 dark:text-white mb-4 bg-brand-50 dark:bg-brand-950/20 px-3 py-1.5 rounded-lg inline-block border border-brand-100 dark:border-brand-900/30">
            {taskName}
          </h3>

          <div className="space-y-6">
            {items.map((activity) => (
              <div key={activity.id} className="group relative flex gap-4 transition-all hover:translate-x-1">
                <div className="flex-shrink-0 mt-1">
                  <UserAvatar 
                    name={activity.user?.name || 'System'} 
                    color={activity.user?.color} 
                    size="sm" 
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-surface-800 dark:text-surface-200">
                      {activity.user?.name || 'System'}
                    </span>
                    <span className="text-[10px] text-surface-400 font-medium">• {formatRelativeTime(activity.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-400">
                    <span className="mt-0.5 flex-shrink-0">{getIcon(activity.type)}</span>
                    <p className="leading-relaxed">
                      {activity.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const XCircle = ({ size, className }: { size: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
