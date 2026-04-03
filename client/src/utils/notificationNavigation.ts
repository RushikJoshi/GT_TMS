import type { NavigateFunction } from 'react-router-dom';
import type { Notification, QuickTask, Task } from '../app/types';

type NotificationNavigationContext = {
  tasks: Task[];
  quickTasks: QuickTask[];
};

function buildTaskTarget(task: Task, tab?: 'details' | 'activity') {
  if (!task.projectId) {
    const params = new URLSearchParams({ taskId: task.id });
    if (tab) params.set('tab', tab);
    return `/tasks?${params.toString()}`;
  }

  const params = new URLSearchParams({ taskId: task.id });
  if (tab) params.set('tab', tab);
  return `/projects/${task.projectId}?${params.toString()}`;
}

function buildQuickTaskTarget(taskId: string, section?: string) {
  const params = new URLSearchParams();
  if (section) params.set('section', section);
  const query = params.toString();
  return query ? `/quick-tasks/${taskId}?${query}` : `/quick-tasks/${taskId}`;
}

export function getNotificationTarget(
  notification: Notification,
  context: NotificationNavigationContext
) {
  const { relatedId } = notification;
  if (!relatedId) return '/notifications';

  const quickTask = context.quickTasks.find((item) => item.id === relatedId);
  const projectTask = context.tasks.find((item) => item.id === relatedId);
  const wantsActivity = notification.type === 'comment_added' || notification.type === 'mention';

  if (quickTask) {
    return buildQuickTaskTarget(quickTask.id, wantsActivity ? 'comments' : undefined);
  }

  if (projectTask) {
    return buildTaskTarget(projectTask, wantsActivity ? 'activity' : undefined);
  }

  if (notification.type === 'quick_task_deadline_approaching') {
    return buildQuickTaskTarget(relatedId);
  }

  if (notification.type.startsWith('quick_task_')) {
    return buildQuickTaskTarget(relatedId, wantsActivity ? 'comments' : undefined);
  }

  return '/notifications';
}

export function openNotificationTarget(
  notification: Notification,
  context: NotificationNavigationContext,
  navigate: NavigateFunction
) {
  const target = getNotificationTarget(notification, context);
  navigate(target);
}
