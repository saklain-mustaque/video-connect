import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...');

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI
  console.log('🔗 MongoDB URI found (length:', uri.length, ')');
  
  // Create a MongoClient with a Stable API version
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    // Connect the client to the server (Mongoose handles this automatically)
    await client.connect();
    
    // Ping the database to confirm a successful connection
    const db = client.db("admin"); // You can use any database name here
    await db.command({ ping: 1 });
    console.log('✅ Connection successful!');

    console.log('📊 Testing basic operation...');
    // Example: List the names of all collections (tables) in a specific database
    const databaseName = "yourDatabaseName"; // <<< REPLACE THIS
    const collections = await client.db(databaseName).listCollections().toArray();
    
    console.log(`📋 Existing collections in '${databaseName}':`);
    collections.forEach(c => console.log(` - ${c.name}`));

    console.log('🎉 Database connection test completed successfully!');

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error type:', error instanceof Error ? error.constructor.name : 'UnknownError');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    // console.error('Full error:', error); // Uncomment for full stack trace
    process.exit(1);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

// Run test
testConnection();