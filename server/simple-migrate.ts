import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function simpleMigrate() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please check your .env file contains DATABASE_URL');
    process.exit(1);
  }

  console.log('🚀 Running simple database setup...');

  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Test connection first
    console.log('📡 Testing connection...');
    await sql`SELECT 1`;
    console.log('✅ Connection successful');

    console.log('🏗️ Creating tables...');

    // Create users table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          is_online BOOLEAN DEFAULT false,
          last_seen TIMESTAMP DEFAULT now()
        )
      `;
      console.log('✅ Users table created');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('ℹ️ Users table already exists');
    }

    // Create rooms table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS rooms (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          code TEXT NOT NULL UNIQUE,
          created_by VARCHAR REFERENCES users(id),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT now(),
          last_activity TIMESTAMP DEFAULT now()
        )
      `;
      console.log('✅ Rooms table created');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('ℹ️ Rooms table already exists');
    }

    // Create messages table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          room_id VARCHAR REFERENCES rooms(id),
          user_id VARCHAR REFERENCES users(id),
          content TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'text',
          timestamp TIMESTAMP DEFAULT now()
        )
      `;
      console.log('✅ Messages table created');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('ℹ️ Messages table already exists');
    }

    console.log('📊 Creating indexes...');
    
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id)`;
      console.log('✅ Indexes created');
    } catch (error) {
      console.log('ℹ️ Some indexes may already exist');
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('📋 Your database is ready for the video conferencing app');
    
  } catch (error) {
    console.error('❌ Database setup failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.message.includes('ETIMEDOUT') || error.message.includes('fetch failed')) {
      console.error('\n🌐 Network connectivity issues detected:');
      console.error('- Check your internet connection');
      console.error('- Verify your Neon database is active');
      console.error('- Try again in a few moments');
    }
    
    if (error.message.includes('authentication failed')) {
      console.error('\n🔑 Authentication issues detected:');
      console.error('- Check your DATABASE_URL in .env file');
      console.error('- Verify your Neon database credentials');
    }
    
    process.exit(1);
  }
}

// Run migration
simpleMigrate()
  .then(() => {
    console.log('✨ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error.message);
    process.exit(1);
  });
