import mongoose from 'mongoose';

function getMongoUri() {
  // Commented out process.env.MONGODB_URI to force local connection and bypass GT ONE
  // return process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/PMS';
  return 'mongodb://127.0.0.1:27017/PMS';
}

const connectDB = async () => {
  const mongoURI = getMongoUri();

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log('Database connected successfully:', conn.connection.host, '/', conn.connection.name);
    return conn;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.error('Mongo URI:', mongoURI);
    throw error;
  }
};

export default connectDB;
