import 'dotenv/config';
import connectDB from './src/config/db.js';
import { getTenantModels } from './src/config/tenantDb.js';
import mongoose from 'mongoose';

await connectDB();

const companyId = '69df30851e6d24fdf69c992c';
const requesterId = new mongoose.Types.ObjectId('69df325734324183f1e892d2');

const { conn } = await getTenantModels(companyId);

const dbs = [];
dbs.push({ name: 'tenantDb', db: conn.db });
dbs.push({ name: 'baseDb', db: mongoose.connection.db });
try {
  dbs.push({ name: company_, db: mongoose.connection.useDb(company_).db });
} catch {}

for (const { name, db } of dbs) {
  const cols = await db.listCollections().toArray();
  const candidates = cols.map(c => c.name).filter(n => /user|employee|staff|member/i.test(n));
  console.log(name, 'candidates', candidates);
  for (const collName of candidates) {
    const doc = await db.collection(collName).findOne({ _id: requesterId }, { projection: { name:1, firstName:1, lastName:1, email:1, role:1 } });
    if (doc) {
      console.log('FOUND in', name, collName, doc);
    }
  }
}

await mongoose.disconnect();
