import 'dotenv/config';
import connectDB from './src/config/db.js';
import { listWorkspacesForUser } from './src/services/workspace.service.js';
import { getTenantModels } from './src/config/tenantDb.js';
import mongoose from 'mongoose';

await connectDB();
const companyId='69df30851e6d24fdf69c992c';
const { User, Membership } = await getTenantModels(companyId);
const user = await User.findOne({ tenantId: companyId, email: 'baldaniyanitesh2003@gmail.com' }).select('_id name role').lean();
console.log('user', user);
const items = await listWorkspacesForUser({ userId: String(user._id), companyId });
console.log('items', items);
const memberships = await Membership.find({ tenantId: companyId, userId: user._id }).select('workspaceId role status').lean();
console.log('memberships_after', memberships);
await mongoose.disconnect();
