import 'dotenv/config';
import connectDB from './src/config/db.js';
import { getTenantModels } from './src/config/tenantDb.js';
import mongoose from 'mongoose';

await connectDB();
const companyId='69df30851e6d24fdf69c992c';
const { User } = await getTenantModels(companyId);
const users = await User.find({ tenantId: companyId }).sort({ createdAt:-1 }).limit(5).select('_id name email employeeId passwordHash role createdAt').lean();
console.log(users);
await mongoose.disconnect();
