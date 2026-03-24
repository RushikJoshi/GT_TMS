import Company from '../models/Company.js';
import { getTenantModels } from './tenantDb.js';
import { logger } from '../utils/logger.js';

const LEGACY_PROJECT_INDEXES = ['id_1', 'workspaceId_1', 'name_1'];

export async function alignProjectIndexes() {
  const companies = await Company.find().select('_id');

  for (const company of companies) {
    const { Project } = await getTenantModels(company._id);

    try {
      await Project.init();
    } catch (error) {
      logger.warn('project_init_failed', { companyId: String(company._id), message: error?.message });
    }

    let existingIndexes = [];
    try {
      existingIndexes = await Project.collection.indexes();
    } catch (error) {
      logger.warn('project_indexes_list_failed', { companyId: String(company._id), message: error?.message });
      continue;
    }

    for (const indexName of LEGACY_PROJECT_INDEXES) {
      const hasIndex = existingIndexes.some((index) => index.name === indexName);
      if (!hasIndex) continue;

      try {
        await Project.collection.dropIndex(indexName);
        logger.info('project_legacy_index_dropped', { companyId: String(company._id), indexName });
      } catch (error) {
        logger.warn('project_legacy_index_drop_failed', {
          companyId: String(company._id),
          indexName,
          message: error?.message,
        });
      }
    }

    try {
      await Project.syncIndexes();
    } catch (error) {
      logger.warn('project_sync_indexes_failed', { companyId: String(company._id), message: error?.message });
    }
  }
}
