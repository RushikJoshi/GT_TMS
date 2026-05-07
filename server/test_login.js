import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Company from './src/models/Company.js';
import AuthLookup from './src/models/AuthLookup.js';
import { getTenantModels } from './src/config/tenantDb.js';

dotenv.config();

const mongoURI = 'mongodb://127.0.0.1:27017/PMS';

async function testLogin() {
  await mongoose.connect(mongoURI);
  console.log('Connected to DB');

  const email = 'gitakshmi@gmail.com';
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD || 'Gitakshmi@123';
  
  console.log(`Testing login for ${email} with password: ${password}`);

  const lookup = await AuthLookup.findOne({ email });
  if (!lookup) {
    console.log('Lookup not found');
    process.exit(1);
  }

  const { User } = await getTenantModels(lookup.tenantId);
  const user = await User.findOne({ email }).select('+passwordHash');
  
  if (!user) {
    console.log('User not found in tenant');
    process.exit(1);
  }

  console.log(`User hash in DB: ${user.passwordHash}`);
  
  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log(`Bcrypt compare result: ${ok}`);

  process.exit(0);
}

testLogin().catch(console.error);
