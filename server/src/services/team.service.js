import { getTenantModels } from '../config/tenantDb.js';

export async function listTeams({ companyId, workspaceId }) {
  const tenantId = companyId;
  const { Team } = await getTenantModels(companyId);
  const items = await Team.find({ tenantId, workspaceId }).sort({ createdAt: -1 });
  return items;
}

export async function createTeam({ companyId, workspaceId, userId, data }) {
  const tenantId = companyId;
  const { Team, ActivityLog } = await getTenantModels(companyId);
  const leaderIds = Array.from(
    new Set(
      (Array.isArray(data.leaderIds) ? data.leaderIds : [data.leaderId || userId])
        .filter(Boolean)
        .map((value) => String(value))
    )
  );
  const members = Array.from(
    new Set([
      ...(Array.isArray(data.members) ? data.members : []),
      ...leaderIds,
      String(userId),
    ].filter(Boolean).map((value) => String(value)))
  );
  const team = await Team.create({
    tenantId,
    workspaceId,
    name: data.name,
    description: data.description,
    leaderId: leaderIds[0] || userId,
    leaderIds,
    members,
    projectIds: data.projectIds || [],
    color: data.color,
  });

  await ActivityLog.create({
    tenantId,
    workspaceId,
    userId,
    type: 'team_created',
    description: `Created team "${team.name}"`,
    entityType: 'team',
    entityId: team._id,
    metadata: {},
  });

  return team;
}

