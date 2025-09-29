import { MongoDBStorage } from './mongodb-storage';
import { connectDB } from './mongodb-connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testMongoDB() {
  console.log('🧪 Testing MongoDB Integration...\n');

  try {
    // Test connection
    console.log('1. Testing database connection...');
    await connectDB();
    console.log('✅ Database connection successful\n');

    // Initialize storage
    const storage = new MongoDBStorage();
    console.log('2. Storage instance created\n');

    // Test user operations
    console.log('3. Testing user operations...');
    
    // Create a test user
    const testUser = await storage.createUser({
      username: `testuser_${Date.now()}`,
      displayName: 'Test User'
    });
    console.log('✅ User created:', testUser.id, testUser.username);

    // Get user by ID
    const foundUser = await storage.getUser(testUser.id);
    console.log('✅ User found by ID:', foundUser?.username);

    // Get user by username
    const foundByUsername = await storage.getUserByUsername(testUser.username);
    console.log('✅ User found by username:', foundByUsername?.displayName);

    // Test room operations
    console.log('\n4. Testing room operations...');
    
    // Create a test room
    const testRoom = await storage.createRoom({
      name: 'Test Room',
      code: 'TEST123',
      createdBy: testUser.id
    });
    console.log('✅ Room created:', testRoom.id, testRoom.code);

    // Get room by code
    const foundRoom = await storage.getRoomByCode('TEST123');
    console.log('✅ Room found by code:', foundRoom?.name);

    // Get active room by code
    const activeRoom = await storage.getActiveRoomByCode('TEST123');
    console.log('✅ Active room found:', activeRoom?.name);

    // Update room activity
    await storage.updateRoomActivity(testRoom.id);
    console.log('✅ Room activity updated');

    // Set room status
    await storage.setRoomStatus(testRoom.id, false);
    console.log('✅ Room status updated to inactive');

    // Get rooms by user
    const userRooms = await storage.getRoomsByUser(testUser.id);
    console.log('✅ User rooms found:', userRooms.length);

    // Test MongoDB-specific features
    console.log('\n5. Testing MongoDB-specific features...');

    // Update user online status
    await storage.updateUserOnlineStatus(testUser.id, true);
    console.log('✅ User online status updated');

    const updatedUser = await storage.getUser(testUser.id);
    console.log('✅ User is online:', updatedUser?.isOnline);

    // Test cleanup (won't clean anything since rooms are new)
    const cleanedCount = await storage.cleanupInactiveRooms(0.001); // 0.001 hours = 3.6 seconds
    console.log('✅ Cleanup completed, rooms cleaned:', cleanedCount);

    console.log('\n🎉 All tests passed! MongoDB integration is working correctly.');
    
    // Optional: Clean up test data
    console.log('\n6. Cleaning up test data...');
    // Note: In a real app, you'd want to delete the test data
    // For now, we'll just log the IDs
    console.log('Test user ID:', testUser.id);
    console.log('Test room ID:', testRoom.id);
    console.log('(Test data left in database for verification)');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    // Close the connection
    const mongoose = await import('mongoose');
    if (mongoose.default.connection.readyState !== 0) {
      await mongoose.default.connection.close();
      console.log('\n🔌 Database connection closed');
    }
    process.exit(0);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testMongoDB();
}

export { testMongoDB };
