import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from './src/models/Company.js';
import AuthLookup from './src/models/AuthLookup.js';
import { getTenantModels } from './src/config/tenantDb.js';

dotenv.config();

const mongoURI = 'mongodb://127.0.0.1:27017/PMS';

async function check() {
  await mongoose.connect(mongoURI);
  console.log('Connected to DB');

  const lookups = await AuthLookup.find();
  console.log(`Found ${lookups.length} AuthLookups`);

  for (const lookup of lookups) {
    try {
      const company = await Company.findById(lookup.tenantId);
      if (!company) {
        console.log(`Email: ${lookup.email} -> Company NOT FOUND for ID ${lookup.tenantId}`);
        continue;
      }
      
      console.log(`Email: ${lookup.email} -> Company: ${company.name} (${company.organizationId})`);
      
      const { User } = await getTenantModels(company._id);
      const user = await User.findOne({ email: lookup.email }).select('+passwordHash');
      
      if (user) {
        console.log(`  User in Tenant: FOUND`);
        console.log(`  Name: ${user.name}, Role: ${user.role}, Active: ${user.isActive}, HasHash: ${!!user.passwordHash}`);
      } else {
        console.log(`  User in Tenant: NOT FOUND`);
      }
    } catch (err) {
      console.error(`  Error checking ${lookup.email}:`, err.message);
    }
  }

  process.exit(0);
}

check().catch(console.error);
