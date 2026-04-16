import 'dotenv/config';
import connectDB from './src/config/db.js';
import { getTenantModels } from './src/config/tenantDb.js';
import mongoose from 'mongoose';

await connectDB();
const companyId = '69df30851e6d24fdf69c992c';
const workspaceId = '69dfd2991313a03c56fb979c';
const { TaskCreationRequest } = await getTenantModels(companyId);
const r = await TaskCreationRequest.findOne({ tenantId: companyId, workspaceId }).sort({ createdAt:-1 }).lean();
console.log(Object.keys(r));
console.log({ requestedBy: r.requestedBy, requestedToIds: r.requestedToIds, title: r.title });
await mongoose.disconnect();
