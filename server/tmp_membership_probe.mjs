import 'dotenv/config';
import connectDB from './src/config/db.js';
import { getTenantModels } from './src/config/tenantDb.js';
import mongoose from 'mongoose';

await connectDB();

const companyId = '69df30851e6d24fdf69c992c';
const requesterId = '69df325734324183f1e892d2';

const { conn } = await getTenantModels(companyId);

const membership = await conn.db.collection('memberships').findOne(
  { userId: new mongoose.Types.ObjectId(requesterId) },
  { projection: { userId:1, userEmail:1, email:1, name:1, userName:1, role:1, workspaceId:1 } }
);
console.log({ membership });

await mongoose.disconnect();
