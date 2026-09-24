import mongoose from 'mongoose';
import env from './env.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

const connectDB = async () => {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(env.MONGODB_URI);
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      retries++;
      console.error(
        `MongoDB connection attempt ${retries}/${MAX_RETRIES} failed: ${error.message}`,
      );
      if (retries >= MAX_RETRIES) {
        console.error('Max MongoDB connection retries reached. Exiting.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
};

export default connectDB;
