import 'dotenv/config';
import connectDB from './src/config/db.js';
import { getTenantModels } from './src/config/tenantDb.js';
import mongoose from 'mongoose';

await connectDB();

const companyId = '69df30851e6d24fdf69c992c';
const workspaceId = '69dfd2991313a03c56fb979c';

const { TaskCreationRequest } = await getTenantModels(companyId);

const rows = await TaskCreationRequest.find({ tenantId: companyId, workspaceId })
  .sort({ createdAt: -1 })
  .limit(10)
  .lean();

console.log('latest_requests', rows.map(r => ({
  _id: String(r._id),
  title: r.title,
  requestedBy: r.requestedBy,
  requestedByCtor: r.requestedBy?.constructor?.name,
})));

await mongoose.disconnect();
