import 'dotenv/config';
import connectDB from './src/config/db.js';
import mongoose from 'mongoose';

await connectDB();

const sample = await mongoose.connection.db.collection('employees').findOne({}, { projection: { } });
console.log('employees_sample_keys', sample ? Object.keys(sample) : null);
console.log('employees_sample', sample);

await mongoose.disconnect();
