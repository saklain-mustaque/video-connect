import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users, rooms, messages } from '../shared/schema';
import { sql } from 'drizzle-orm';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const connection = neon(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log('🚀 Running database migrations...');

  try {
    console.log('📝 Creating extension and tables...');
    
    // Execute each SQL command separately
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    console.log('✅ Created pgcrypto extension');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        username text NOT NULL UNIQUE,
        display_name text NOT NULL,
        is_online boolean DEFAULT false,
        last_seen timestamp DEFAULT now()
      )
    `);
    console.log('✅ Created users table');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        code text NOT NULL UNIQUE,
        created_by varchar REFERENCES users(id),
        is_active boolean DEFAULT true,
        created_at timestamp DEFAULT now(),
        last_activity timestamp DEFAULT now()
      )
    `);
    console.log('✅ Created rooms table');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id varchar REFERENCES rooms(id),
        user_id varchar REFERENCES users(id),
        content text NOT NULL,
        type text NOT NULL DEFAULT 'text',
        timestamp timestamp DEFAULT now()
      )
    `);
    console.log('✅ Created messages table');
    
    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id)`);
    console.log('✅ Created indexes');

    console.log('✅ Database migrations completed successfully');
    console.log('📊 Database schema is ready');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      console.log('🎉 Migration complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration error:', error);
      process.exit(1);
    });
}

export { migrate };
