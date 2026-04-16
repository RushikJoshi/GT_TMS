import 'dotenv/config';
import connectDB from './src/config/db.js';
import { getTenantModels } from './src/config/tenantDb.js';
import mongoose from 'mongoose';

await connectDB();
const companyId = '69df30851e6d24fdf69c992c';
const externalId = '69df325734324183f1e892d2';
const { User } = await getTenantModels(companyId);
const u = await User.findOne({ tenantId: companyId, passwordHash: 'sso:' + externalId })
  .select('_id name email role passwordHash')
  .lean();
console.log('mappedUser', u);
await mongoose.disconnect();
