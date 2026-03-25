import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, FolderKanban, Crown, MoreHorizontal, UserPlus, Mail, Search } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../context/appStore';
import { PROJECT_COLORS } from '../../app/constants';
import { ColorPicker } from '../../components/ColorPicker';
import { UserAvatar } from '../../components/UserAvatar';
import { Modal } from '../../components/Modal';
import { ProgressBar, EmptyState } from '../../components/ui';
import type { Team } from '../../app/types';
import { teamsService } from '../../services/api';
import { emitSuccessToast } from '../../context/toastBus';

const TeamCard: React.FC<{ team: Team; onOpen: (t: Team) => void }> = ({ team, onOpen }) => {
  const { projects, tasks, users } = useAppStore();
  const members = users.filter(u => team.members.includes(u.id));
  const leaderIds = team.leaderIds?.length ? team.leaderIds : [team.leaderId];
  const leaders = users.filter(u => leaderIds.includes(u.id));
  const leader = leaders[0];
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
          <span className="text-xs text-surface-600 dark:text-surface-400 truncate">
            {leaders.slice(0, 2).map((item) => item.name).join(', ')}
            {leaders.length > 2 ? ` +${leaders.length - 2}` : ''}
          </span>
          <span className="text-[10px] text-surface-400 ml-auto">{leaders.length > 1 ? 'Leads' : 'Lead'}</span>
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
  const leaderIds = team.leaderIds?.length ? team.leaderIds : [team.leaderId];
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
              const isLeader = leaderIds.includes(member.id);
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
  const { users, projects, teams, addTeam } = useAppStore();
  const firstAvailableColor = PROJECT_COLORS.find((candidate) => !teams.some((team) => team.color.toLowerCase() === candidate.toLowerCase())) || PROJECT_COLORS[0];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(firstAvailableColor);
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [leaderSearch, setLeaderSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const usedTeamColors = teams.map((team) => team.color.toLowerCase());
  const isColorTaken = usedTeamColors.includes(color.toLowerCase());
  const filteredLeaderUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.jobTitle || ''}`.toLowerCase().includes(leaderSearch.toLowerCase())
  );
  const filteredMemberUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.jobTitle || ''}`.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedLeaderIds.length || isColorTaken) return;

    setLoading(true);
    try {
      const finalMembers = Array.from(new Set([...selectedMembers, ...selectedLeaderIds]));
      const res = await teamsService.create({
        name,
        description,
        color,
        leaderId: selectedLeaderIds[0],
        leaderIds: selectedLeaderIds,
        members: finalMembers,
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
    setColor(firstAvailableColor);
    setSelectedLeaderIds([]);
    setSelectedMembers([]);
    setSelectedProjects([]);
    setLeaderSearch('');
    setMemberSearch('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Team"
      description="Set the team identity, choose a leader, and invite members."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="label">Team name *</label>
          <input
            required
            type="text"
            className="input"
            placeholder="e.g. Design Team"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input h-auto min-h-[110px] resize-none py-3"
            placeholder="What does this team own, support, or deliver?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="label mb-0">Team leaders *</label>
            <span className="text-xs text-surface-400">{selectedLeaderIds.length} selected</span>
          </div>
          {selectedLeaderIds.length ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedLeaderIds.map((leaderId) => {
                const leader = users.find((user) => user.id === leaderId);
                if (!leader) return null;
                return (
                  <button
                    key={leader.id}
                    type="button"
                    onClick={() => setSelectedLeaderIds((prev) => prev.filter((id) => id !== leader.id))}
                    className="badge gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300"
                  >
                    <Crown size={10} />
                    {leader.name}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              value={leaderSearch}
              onChange={(e) => setLeaderSearch(e.target.value)}
              placeholder="Search leaders..."
              className="input h-9 pl-9"
            />
          </div>
          <div className="max-h-40 overflow-y-auto rounded-2xl border border-surface-100 bg-white p-2 dark:border-surface-800 dark:bg-surface-900">
            <div className="space-y-1.5">
              {filteredLeaderUsers.map((leader) => {
                const checked = selectedLeaderIds.includes(leader.id);
                return (
                  <label
                    key={leader.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                      checked ? 'bg-brand-50 dark:bg-brand-950/20' : 'hover:bg-surface-50 dark:hover:bg-surface-800'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedLeaderIds((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, leader.id]))
                            : prev.filter((id) => id !== leader.id)
                        );
                      }}
                    />
                    <UserAvatar name={leader.name} color={leader.color} size="sm" isOnline={leader.isActive} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">{leader.name}</p>
                      <p className="truncate text-xs text-surface-400">{leader.jobTitle || leader.email}</p>
                    </div>
                    {checked ? <Crown size={12} className="text-amber-500" /> : null}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Team color</label>
          <ColorPicker
            value={color}
            onChange={setColor}
            palette={PROJECT_COLORS}
            disallowedColors={usedTeamColors}
            helperText="Choose a unique color for this team."
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="label mb-0">Team members</label>
            <span className="text-xs text-surface-400">
              {selectedMembers.length} selected
            </span>
          </div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="input h-9 pl-9"
            />
          </div>
          <div className="max-h-52 overflow-y-auto rounded-2xl border border-surface-100 bg-white p-2 dark:border-surface-800 dark:bg-surface-900">
            <div className="space-y-1.5">
              {filteredMemberUsers.map(member => {
                const checked = selectedMembers.includes(member.id);
                const isLeader = selectedLeaderIds.includes(member.id);
                return (
                  <label
                    key={member.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                      checked
                        ? 'bg-brand-50 dark:bg-brand-950/20'
                        : 'hover:bg-surface-50 dark:hover:bg-surface-800'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedMembers((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, member.id]))
                            : prev.filter((id) => id !== member.id)
                        );
                      }}
                    />
                    <UserAvatar name={member.name} color={member.color} size="sm" isOnline={member.isActive} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">
                        {member.name}
                      </p>
                      <p className="truncate text-xs text-surface-400">
                        {member.jobTitle || member.email}
                      </p>
                    </div>
                    {isLeader ? (
                      <span className="badge text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                        Leader
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-xs text-surface-400">
            Pick the people who should belong to this team. You can update members later.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-surface-100 pt-5 dark:border-surface-800">
          <button type="button" onClick={handleClose} className="btn-ghost btn-md">Cancel</button>
          <button
            type="submit"
            disabled={loading || !name.trim() || !selectedLeaderIds.length || isColorTaken}
            className="btn-primary btn-md min-w-[140px]"
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
