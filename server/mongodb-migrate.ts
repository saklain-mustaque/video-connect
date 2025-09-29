import { connectDB } from './mongodb-connection';
import { User, Room, Message } from '../shared/mongodb-schema';
import dotenv from 'dotenv';

dotenv.config();

async function createIndexes() {
  console.log('📊 Creating database indexes...');
  
  try {
    await connectDB();
    
    // User indexes
    await User.collection.createIndex({ username: 1 }, { unique: true });
    await User.collection.createIndex({ isOnline: 1 });
    await User.collection.createIndex({ lastSeen: -1 });
    console.log('✅ User indexes created');
    
    // Room indexes
    await Room.collection.createIndex({ code: 1 }, { unique: true });
    await Room.collection.createIndex({ createdBy: 1 });
    await Room.collection.createIndex({ isActive: 1 });
    await Room.collection.createIndex({ lastActivity: -1 });
    await Room.collection.createIndex({ createdAt: -1 });
    console.log('✅ Room indexes created');
    
    // Message indexes
    await Message.collection.createIndex({ roomId: 1, timestamp: -1 });
    await Message.collection.createIndex({ userId: 1 });
    await Message.collection.createIndex({ timestamp: -1 });
    console.log('✅ Message indexes created');
    
    console.log('🎉 All indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

async function seedDatabase() {
  console.log('🌱 Seeding database with sample data...');
  
  try {
    const userCount = await User.countDocuments();
    
    if (userCount > 0) {
      console.log('📊 Database already contains data, skipping seed');
      return;
    }
    
    const sampleUsers = [
      { username: 'admin', displayName: 'Administrator' },
      { username: 'testuser1', displayName: 'Test User 1' },
      { username: 'testuser2', displayName: 'Test User 2' }
    ];
    
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      const savedUser = await user.save();
      createdUsers.push(savedUser);
      console.log(`👤 Created user: ${userData.username}`);
    }
    
    const sampleRoom = new Room({
      name: 'Welcome Room',
      code: 'WELCOME',
      createdBy: createdUsers[0]._id,
      isActive: true
    });
    
    await sampleRoom.save();
    console.log('🏠 Created sample room: WELCOME');
    
    console.log('🎉 Database seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

async function runMigration() {
  console.log('🚀 Starting MongoDB migration...');
  
  try {
    await createIndexes();
    await seedDatabase();
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
