import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const tenants = await mongoose.connection.db.collection('tenants').find({}).toArray();
  console.log('Tenants:', JSON.stringify(tenants, null, 2));
  await mongoose.disconnect();
}

run();
