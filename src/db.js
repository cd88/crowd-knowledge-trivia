import mongoose from 'mongoose';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/crowd-trivia';

export async function connectDb() {
  mongoose.connection.on('error', err => console.error('MongoDB error:', err.message));
  await mongoose.connect(MONGO_URL);
  console.log(`MongoDB connected: ${MONGO_URL}`);
}
