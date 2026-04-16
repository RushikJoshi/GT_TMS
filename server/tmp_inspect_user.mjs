import 'dotenv/config';
import connectDB from './src/config/db.js';
import { getTenantModels } from './src/config/tenantDb.js';
import mongoose from 'mongoose';

await connectDB();

const companyId = '69df30851e6d24fdf69c992c';
const requesterId = '69df325734324183f1e892d2';

const { User: TenantUser, conn } = await getTenantModels(companyId);
const tenantUser = await TenantUser.findById(requesterId).select('name email role tenantId').lean();

const { getUserModel } = await import('./src/models/User.js');
const BaseUser = getUserModel(mongoose.connection);
const baseUser = await BaseUser.findById(requesterId).select('name email role').lean();

const employeeFromTenantDb = await conn.db.collection('employees').findOne({ _id: new mongoose.Types.ObjectId(requesterId) }, { projection: { firstName:1,lastName:1,name:1,email:1 } });
let employeeFromCompanyDb = null;
try {
  const hrmsConn = mongoose.connection.useDb(company_);
  employeeFromCompanyDb = await hrmsConn.db.collection('employees').findOne({ _id: new mongoose.Types.ObjectId(requesterId) }, { projection: { firstName:1,lastName:1,name:1,email:1 } });
} catch {}

console.log({ tenantUser, baseUser, employeeFromTenantDb, employeeFromCompanyDb });

await mongoose.disconnect();
