import 'dotenv/config';
import connectDB from './src/config/db.js';
import { getTenantModels } from './src/config/tenantDb.js';
import mongoose from 'mongoose';

await connectDB();
const companyId='69df30851e6d24fdf69c992c';
const { User, Membership, Workspace } = await getTenantModels(companyId);
const user = await User.findOne({ tenantId: companyId, email: 'baldaniyanitesh2003@gmail.com' }).select('_id name email role').lean();
console.log('user', user);
const memberships = user?._id ? await Membership.find({ tenantId: companyId, userId: user._id }).select('workspaceId status role').lean() : [];
console.log('memberships', memberships);
const workspaces = await Workspace.find({ tenantId: companyId }).select('_id name slug').lean();
console.log('workspaces', workspaces);
await mongoose.disconnect();
