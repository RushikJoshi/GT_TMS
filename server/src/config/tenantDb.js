import crypto from 'crypto';
import mongoose from 'mongoose';
import Company from '../models/Company.js';
import { getUserModel } from '../models/User.js';
import { getWorkspaceModel } from '../models/Workspace.js';
import { getMembershipModel } from '../models/Membership.js';
import { getProjectModel } from '../models/Project.js';
import { getPhaseModel } from '../models/Phase.js';
import { getTaskModel } from '../models/Task.js';
import { getTeamModel } from '../models/Team.js';
import { getQuickTaskModel } from '../models/QuickTask.js';
import { getNotificationModel } from '../models/Notification.js';
import { getActivityLogModel } from '../models/ActivityLog.js';
import { getRefreshTokenModel } from '../models/RefreshToken.js';
import { getProjectTimelineModel } from '../models/ProjectTimeline.js';
import { getAdminConversationModel } from '../models/admin/AdminConversation.model.js';
import { getAdminMessageModel } from '../models/admin/AdminMessage.model.js';
import { getTaskReassignRequestModel } from '../models/TaskReassignRequest.js';
import { getPersonalTaskModel } from '../models/PersonalTask.js';
import { getTaskCreationRequestModel } from '../models/TaskCreationRequest.js';
import { getDailyWorkReportModel } from '../models/DailyWorkReport.js';
import { getMISModel } from '../models/MIS.js';
import { getLabelModel } from '../models/Label.js';
import { getExtensionRequestModel } from '../models/ExtensionRequest.js';


const TENANT_DB_PREFIX = process.env.TENANT_DB_PREFIX || 'GT_PMS';
const tenantDbCache = new Map();
const MAX_MONGO_DB_NAME_BYTES = 38;

function normalizeSegment(value, fallback = 'tenant') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (normalized || fallback).slice(0, 24);
}

function byteLength(value) {
  return Buffer.byteLength(String(value || ''), 'utf8');
}

function ensureLegacyOrganizationId(company) {
  const current = String(company?.organizationId || '').trim();
  if (current) return current;
  const legacyFallback = `legacy_${String(company?._id || '').slice(-12) || Date.now()}`;
  return legacyFallback.slice(0, 80);
}

function buildLegacyTenantDatabaseName({ companyName, organizationId }) {
  const namePart = normalizeSegment(companyName, 'company');
  const orgPart = normalizeSegment(organizationId, 'org');
  return `${TENANT_DB_PREFIX}_${namePart}_${orgPart}`.slice(0, 63);
}

function normalizeShortSegment(value, fallback = 'tenant') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (normalized || fallback);
}

export function buildTenantDatabaseName({ companyName, organizationId, companyId }) {
  // Kept for backward compatibility in callers/tests: now returns a Mongo-safe name.
  // The "legacy" builder still exists internally for detecting/keeping older names.
  return buildSafeTenantDatabaseName({ companyName, organizationId, companyId });
}

export function buildSafeTenantDatabaseName({ companyName, organizationId, companyId }) {
  const baseRaw = normalizeShortSegment(companyName, 'company');
  const baseFallback = normalizeShortSegment(organizationId, 'org');
  const baseCandidate = (baseRaw || baseFallback || 'tenant');

  const suffixSource = String(companyId || organizationId || '').trim();
  const suffixHexFromId = suffixSource.replace(/[^a-f0-9]/gi, '').toLowerCase();
  const suffix =
    suffixHexFromId.slice(-8) ||
    crypto.createHash('sha1').update(suffixSource || baseCandidate).digest('hex').slice(-8);

  const fixed = `${TENANT_DB_PREFIX}__${suffix}`;
  const fixedBytes = byteLength(fixed);
  let availableForBase = MAX_MONGO_DB_NAME_BYTES - fixedBytes;
  if (!Number.isFinite(availableForBase)) availableForBase = 8;
  if (availableForBase < 1) availableForBase = 1;

  const base = baseCandidate.slice(0, Math.min(12, availableForBase)) || 't';
  let name = `${TENANT_DB_PREFIX}_${base}_${suffix}`;

  // Hard cap (should rarely be needed since we computed availableForBase)
  if (byteLength(name) > MAX_MONGO_DB_NAME_BYTES) {
    name = name.slice(0, MAX_MONGO_DB_NAME_BYTES);
  }

  return name;
}

async function resolveTenantDatabaseName(companyId) {
  const cacheKey = String(companyId);
  if (tenantDbCache.has(cacheKey)) {
    return tenantDbCache.get(cacheKey);
  }

  const company = await Company.findById(companyId).select('name organizationId databaseName');
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    err.code = 'COMPANY_NOT_FOUND';
    throw err;
  }

  const ensuredOrganizationId = ensureLegacyOrganizationId(company);
  const existingDbName = String(company.databaseName || '').trim();

  // Prefer the persisted dbName if it's already Mongo-safe.
  if (existingDbName && byteLength(existingDbName) <= MAX_MONGO_DB_NAME_BYTES) {
    tenantDbCache.set(cacheKey, existingDbName);
    return existingDbName;
  }

  // Backward compatibility: try the old naming convention if it happens to fit Mongo's limit.
  const legacyCandidate = buildLegacyTenantDatabaseName({
    companyName: company.name,
    organizationId: ensuredOrganizationId,
  });

  const safeCandidate = buildSafeTenantDatabaseName({
    companyName: company.name,
    organizationId: ensuredOrganizationId,
    companyId,
  });

  const databaseName =
    byteLength(legacyCandidate) <= MAX_MONGO_DB_NAME_BYTES ? legacyCandidate : safeCandidate;

  if (company.organizationId !== ensuredOrganizationId || company.databaseName !== databaseName) {
    company.organizationId = ensuredOrganizationId;
    company.databaseName = databaseName;
    await company.save();
  }

  tenantDbCache.set(cacheKey, databaseName);
  return databaseName;
}

export async function getTenantConnection(companyId = null) {
  const baseConn = mongoose.connection;
  if (!companyId) {
    return baseConn;
  }

  const databaseName = await resolveTenantDatabaseName(companyId);
  return baseConn.useDb(databaseName, { useCache: true });
}

export function clearTenantDbCache(companyId = null) {
  if (!companyId) {
    tenantDbCache.clear();
    return;
  }
  tenantDbCache.delete(String(companyId));
}

export async function getTenantModels(companyId = null) {
  const conn = await getTenantConnection(companyId);
  return {
    conn,
    User: getUserModel(conn),
    Workspace: getWorkspaceModel(conn),
    Membership: getMembershipModel(conn),
    Project: getProjectModel(conn),
    Phase: getPhaseModel(conn),
    Task: getTaskModel(conn),
    Team: getTeamModel(conn),
    QuickTask: getQuickTaskModel(conn),
    Notification: getNotificationModel(conn),
    ActivityLog: getActivityLogModel(conn),
    RefreshToken: getRefreshTokenModel(conn),
    ProjectTimeline: getProjectTimelineModel(conn),
    AdminConversation: getAdminConversationModel(conn),
    AdminMessage: getAdminMessageModel(conn),
    TaskReassignRequest: getTaskReassignRequestModel(conn),
    PersonalTask: getPersonalTaskModel(conn),
    TaskCreationRequest: getTaskCreationRequestModel(conn),
    DailyWorkReport: getDailyWorkReportModel(conn),
    MIS: getMISModel(conn),
    Label: getLabelModel(conn),
    ExtensionRequest: getExtensionRequestModel(conn),
  };
}


