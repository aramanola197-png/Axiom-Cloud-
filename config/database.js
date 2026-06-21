const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connects to MongoDB if a connection string is provided. If MONGODB_URI is
 * missing or the connection fails, the app logs a clear warning and keeps
 * running — it does NOT call process.exit(). Routes that depend on the
 * database should check connectDB.isConnected() and render a graceful
 * empty/setup state when false, rather than crashing the request.
 */
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI is not set. The app will start, but database-backed features will be unavailable until you add it to .env.');
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    console.error('❌ MongoDB connection error:', error.message);
    console.warn('⚠️  The app will continue running, but database-backed features will be unavailable until this is resolved.');
  }
};

connectDB.isConnected = () => isConnected;

mongoose.connection.on('disconnected', () => { isConnected = false; });
mongoose.connection.on('connected', () => { isConnected = true; });

module.exports = connectDB;
