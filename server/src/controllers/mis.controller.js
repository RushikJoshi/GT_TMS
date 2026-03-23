import { getTaskModel } from '../models/Task.js';
import { getProjectModel } from '../models/Project.js';
import { getUserModel } from '../models/User.js';
import mongoose from 'mongoose';

/**
 * Helper to get models with connection
 */
const getModels = (conn) => ({
  Task: getTaskModel(conn),
  Project: getProjectModel(conn),
  User: getUserModel(conn)
});

/**
 * GET /mis/summary
 */
export async function getSummary(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const { Task } = getModels(mongoose.connection);

    const match = { 
      tenantId: new mongoose.Types.ObjectId(companyId), 
      workspaceId: new mongoose.Types.ObjectId(workspaceId) 
    };

    const summary = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          pendingTasks: { $sum: { $cond: [{ $ne: ["$status", "done"] }, 1, 0] } },
          overdueTasks: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $ne: ["$status", "done"] },
                    { $lt: ["$dueDate", new Date()] }
                  ] 
                }, 
                1, 0
              ] 
            } 
          },
          totalEstimatedTime: { $sum: "$estimatedTime" },
          totalActualTime: { $sum: "$trackedHours" }
        }
      },
      {
        $project: {
          _id: 0,
          totalTasks: 1,
          completedTasks: 1,
          pendingTasks: 1,
          overdueTasks: 1,
          totalEstimatedTime: 1,
          totalActualTime: 1,
          efficiency: {
            $cond: [
              { $gt: ["$totalActualTime", 0] },
              { $multiply: [{ $divide: ["$totalEstimatedTime", "$totalActualTime"] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: summary[0] || { totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0, totalEstimatedTime: 0, totalActualTime: 0, efficiency: 0 }
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /mis/tasks
 */
export async function getTasks(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const { Task } = getModels(mongoose.connection);

    const match = { 
      tenantId: new mongoose.Types.ObjectId(companyId), 
      workspaceId: new mongoose.Types.ObjectId(workspaceId) 
    };

    const tasksStats = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const formatted = tasksStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return res.status(200).json({ success: true, data: formatted });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /mis/employees
 */
export async function getEmployees(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const { Task, User } = getModels(mongoose.connection);

    const users = await User.find({ tenantId: companyId, workspaceId }).lean();
    
    // Aggregate task counts per user
    const stats = await Task.aggregate([
      { $match: { 
        tenantId: new mongoose.Types.ObjectId(companyId), 
        workspaceId: new mongoose.Types.ObjectId(workspaceId) 
      }},
      { $unwind: "$assigneeIds" },
      {
        $group: {
          _id: "$assigneeIds",
          tasksAssigned: { $sum: 1 },
          tasksCompleted: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          delayedTasks: { 
            $sum: { 
              $cond: [
                { $and: [{ $ne: ["$status", "done"] }, { $lt: ["$dueDate", new Date()] }] }, 
                1, 0
              ] 
            } 
          },
          totalHours: { $sum: "$trackedHours" }
        }
      }
    ]);

    const enriched = users.map(u => {
      const userStat = stats.find(s => s._id.toString() === u._id.toString());
      return {
        id: u._id,
        name: u.name,
        avatar: u.avatar || '',
        color: u.color || '#3366ff',
        tasksAssigned: userStat?.tasksAssigned || 0,
        tasksCompleted: userStat?.tasksCompleted || 0,
        delayedTasks: userStat?.delayedTasks || 0,
        totalHours: Math.round((userStat?.totalHours || 0) * 10) / 10,
        productivity: (userStat?.tasksAssigned || 0) > 0 
          ? Math.round((userStat.tasksCompleted / userStat.tasksAssigned) * 100) 
          : 0
      };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /mis/projects
 */
export async function getProjects(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const { Task, Project } = getModels(mongoose.connection);

    const projects = await Project.find({ tenantId: companyId, workspaceId }).lean();

    const stats = await Task.aggregate([
      { $match: { 
        tenantId: new mongoose.Types.ObjectId(companyId), 
        workspaceId: new mongoose.Types.ObjectId(workspaceId) 
      }},
      {
        $group: {
          _id: "$projectId",
          totalTasks: { $sum: 1 },
          completedTasks: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } }
        }
      }
    ]);

    const enriched = projects.map(p => {
      const s = stats.find(stat => stat._id && stat._id.toString() === p._id.toString());
      const progress = s?.totalTasks ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
      return {
        id: p._id,
        name: p.name,
        color: p.color || '#3366ff',
        totalTasks: s?.totalTasks || 0,
        completedTasks: s?.completedTasks || 0,
        progress
      };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /mis/time
 */
export async function getTime(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const { Task } = getModels(mongoose.connection);

    // Get last 7 days of activity grouped by day
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const timeStats = await Task.aggregate([
      { $match: { 
        tenantId: new mongoose.Types.ObjectId(companyId), 
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        updatedAt: { $gte: last7Days }
      }},
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          hours: { $sum: "$trackedHours" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const formatted = timeStats.map(t => {
      const d = new Date(t._id);
      return {
        day: daysMap[d.getDay()],
        hours: Math.round(t.hours * 10) / 10
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /mis/weekly-report
 */
export async function getWeeklyReport(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const { Task, User } = getModels(mongoose.connection);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const tasks = await Task.find({ 
      tenantId: companyId, 
      workspaceId,
      updatedAt: { $gte: oneWeekAgo }
    }).lean();

    const employees = await getEmployees(req, { 
      status: () => ({ json: (data) => data.data }) 
    }, next);
    
    // Fix: getEmployees is an async endpoint, calling it directly as a function needs a mock res.
    // Simpler: just fetch employee stats again or use the aggregation logic directly.
    const employeePerf = await Task.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(companyId), workspaceId: new mongoose.Types.ObjectId(workspaceId) }},
      { $unwind: "$assigneeIds" },
      {
        $group: {
          _id: "$assigneeIds",
          completed: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          assigned: { $sum: 1 }
        }
      }
    ]);

    const users = await User.find({ _id: { $in: employeePerf.map(s => s._id) } }).lean();
    
    const perfs = employeePerf.map(s => {
      const u = users.find(user => user._id.toString() === s._id.toString());
      return {
        name: u?.name || 'Unknown',
        productivity: Math.round((s.completed / s.assigned) * 100)
      };
    });

    const topPerformer = perfs.length > 0 ? perfs.reduce((prev, curr) => prev.productivity > curr.productivity ? prev : curr) : null;
    const leastPerformer = perfs.length > 0 ? perfs.reduce((prev, curr) => prev.productivity < curr.productivity ? prev : curr) : null;

    const completed = tasks.filter(t => t.status === 'done').length;
    const delayed = tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const totalHours = tasks.reduce((acc, t) => acc + (t.trackedHours || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        totalTasksCompleted: completed,
        totalDelayedTasks: delayed,
        totalHoursWorked: Math.round(totalHours * 10) / 10,
        topPerformer: topPerformer?.name || 'N/A',
        leastPerformer: leastPerformer?.name || 'N/A',
        period: 'Last 7 Days'
      }
    });
  } catch (e) {
    next(e);
  }
}
