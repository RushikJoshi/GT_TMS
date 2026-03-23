import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, FolderKanban, Crown, MoreHorizontal, UserPlus, Mail } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../context/appStore';
import { UserAvatar } from '../../components/UserAvatar';
import { Modal } from '../../components/Modal';
import { ProgressBar, EmptyState } from '../../components/ui';
import type { Team } from '../../app/types';
import { teamsService } from '../../services/api';
import { emitSuccessToast } from '../../context/toastBus';

const TeamCard: React.FC<{ team: Team; onOpen: (t: Team) => void }> = ({ team, onOpen }) => {
  const { projects, tasks, users } = useAppStore();
  const members = users.filter(u => team.members.includes(u.id));
  const leader = users.find(u => u.id === team.leaderId);
  const teamProjects = projects.filter(p => team.projectIds.includes(p.id));
  const teamTasks = tasks.filter(t => teamProjects.some(p => p.id === t.projectId));
  const doneTasks = teamTasks.filter(t => t.status === 'done').length;
  const progress = teamTasks.length ? Math.round((doneTasks / teamTasks.length) * 100) : 0;

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      onClick={() => onOpen(team)}
      className="card p-5 cursor-pointer hover:shadow-card-hover transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-display font-bold flex-shrink-0"
            style={{ backgroundColor: team.color }}
          >
            {team.name[0]}
          </div>
          <div>
            <h3 className="font-display font-semibold text-surface-900 dark:text-white">{team.name}</h3>
            {team.description && <p className="text-xs text-surface-400 mt-0.5">{team.description}</p>}
          </div>
        </div>
        <button className="btn-ghost w-7 h-7 rounded-lg" onClick={e => e.stopPropagation()}>
          <MoreHorizontal size={14} />
        </button>
      </div>

      {leader && (
        <div className="flex items-center gap-2 mb-4 p-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl">
          <Crown size={12} className="text-amber-500 flex-shrink-0" />
          <UserAvatar name={leader.name} color={leader.color} size="xs" />
          <span className="text-xs text-surface-600 dark:text-surface-400">{leader.name}</span>
          <span className="text-[10px] text-surface-400 ml-auto">Lead</span>
        </div>
      )}

      {/* Members */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex -space-x-1.5">
          {members.slice(0, 6).map(m => (
            <div key={m.id} className="ring-2 ring-white dark:ring-surface-900 rounded-full">
              <UserAvatar name={m.name} color={m.color} size="xs" />
            </div>
          ))}
        </div>
        <span className="text-xs text-surface-500">{members.length} members</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl text-center">
          <FolderKanban size={14} className="mx-auto text-brand-600 mb-1" />
          <p className="font-semibold text-surface-800 dark:text-surface-200 text-sm">{teamProjects.length}</p>
          <p className="text-[10px] text-surface-400">Projects</p>
        </div>
        <div className="p-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl text-center">
          <Users size={14} className="mx-auto text-violet-600 mb-1" />
          <p className="font-semibold text-surface-800 dark:text-surface-200 text-sm">{teamTasks.length}</p>
          <p className="text-[10px] text-surface-400">Tasks</p>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-xs text-surface-500 mb-1.5">
          <span>Team Progress</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} color={team.color} size="md" />
      </div>
    </motion.div>
  );
};

const TeamDetailModal: React.FC<{ team: Team | null; onClose: () => void }> = ({ team, onClose }) => {
  const { projects, tasks, users } = useAppStore();
  if (!team) return null;

  const members = users.filter(u => team.members.includes(u.id));
  const leader = users.find(u => u.id === team.leaderId);
  const teamProjects = projects.filter(p => team.projectIds.includes(p.id));

  return (
    <Modal open={!!team} onClose={onClose} title={team.name} size="lg">
      <div className="p-6 space-y-6">
        {/* Members section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-display font-semibold text-surface-800 dark:text-surface-200">Members ({members.length})</h4>
            <button className="btn-primary btn-sm"><UserPlus size={13} /> Invite</button>
          </div>
          <div className="space-y-2">
            {members.map(member => {
              const memberTasks = tasks.filter(t => t.assigneeIds.includes(member.id) && teamProjects.some(p => p.id === t.projectId));
              const doneTasks = memberTasks.filter(t => t.status === 'done').length;
              const isLeader = member.id === team.leaderId;
              return (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                  <UserAvatar name={member.name} color={member.color} size="md" isOnline={member.isActive} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{member.name}</p>
                      {isLeader && <Crown size={12} className="text-amber-500" />}
                    </div>
                    <p className="text-xs text-surface-400">{member.jobTitle}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-surface-500">{doneTasks}/{memberTasks.length} tasks</p>
                    <ProgressBar
                      value={doneTasks}
                      max={memberTasks.length || 1}
                      size="sm"
                      color={member.color}
                      className="w-16 mt-1"
                    />
                  </div>
                  <button className="btn-ghost btn-sm w-7 h-7"><Mail size={13} /></button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Projects section */}
        <div>
          <h4 className="font-display font-semibold text-surface-800 dark:text-surface-200 mb-3">Projects ({teamProjects.length})</h4>
          <div className="space-y-2">
            {teamProjects.map(project => (
              <div key={project.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: project.color }}>
                  {project.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{project.name}</p>
                  <ProgressBar value={project.progress} size="sm" color={project.color} className="w-24 mt-1" />
                </div>
                <span className="text-xs text-surface-500">{project.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

const CreateTeamModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: (team: Team) => void;
}> = ({ open, onClose, onCreated }) => {
  const { users, projects, addTeam } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [leaderId, setLeaderId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !leaderId) return;

    setLoading(true);
    try {
      const res = await teamsService.create({
        name,
        description,
        color,
        leaderId,
        members: selectedMembers,
        projectIds: selectedProjects,
      });

      const newTeam = res.data.data ?? res.data;
      addTeam(newTeam);
      onCreated(newTeam);
      emitSuccessToast('Team created successfully!');
      handleClose();
    } catch (err) {
      // Error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setColor('#6366f1');
    setLeaderId('');
    setSelectedMembers([]);
    setSelectedProjects([]);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create New Team" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Team Name *</label>
          <input
            required
            type="text"
            className="input-field"
            placeholder="e.g. Design Team"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Description</label>
          <textarea
            className="input-field min-h-[80px]"
            placeholder="What does this team do?"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Team Color</label>
          <div className="flex flex-wrap gap-2">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-transform",
                  color === c ? "border-brand-500 scale-110" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Team Leader *</label>
            <select
              required
              className="input-field"
              value={leaderId}
              onChange={e => setLeaderId(e.target.value)}
            >
              <option value="">Select Leader</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Team Members</label>
          <select
            multiple
            className="input-field min-h-[120px]"
            value={selectedMembers}
            onChange={e => setSelectedMembers(Array.from(e.target.selectedOptions, o => o.value))}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <p className="text-[10px] text-surface-400 mt-1">Hold Ctrl/Cmd to select multiple members</p>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button type="button" onClick={handleClose} className="btn-ghost btn-md">Cancel</button>
          <button
            type="submit"
            disabled={loading || !name.trim() || !leaderId}
            className="btn-primary btn-md"
          >
            {loading ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const TeamsPage: React.FC = () => {
  const { teams } = useAppStore();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Actions removed as per request */}
      <div className="pt-2" />

      {teams.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="No teams yet"
          description="Create teams to organize your projects and members"
          action={<button onClick={() => setShowCreate(true)} className="btn-primary btn-md"><Plus size={14} /> Create Team</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map(team => (
            <TeamCard key={team.id} team={team} onOpen={setSelectedTeam} />
          ))}
        </div>
      )}

      <TeamDetailModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      <CreateTeamModal 
        open={showCreate} 
        onClose={() => setShowCreate(false)} 
        onCreated={(t) => {
          setSelectedTeam(t);
        }}
      />
    </div>
  );
};

export default TeamsPage;
