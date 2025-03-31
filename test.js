const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = 'mongodb://127.0.0.1:27017';
  const client = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 2000
  });

  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    await client.connect();
    
    // Verify connection by listing databases
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    
    console.log('✅ Successfully connected to MongoDB!');
    console.log('📊 Available databases:', databases.databases.map(db => db.name));
    
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    
    // Detailed diagnostics
    if (err.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 Troubleshooting Tips:');
      console.log('1. Ensure MongoDB service is running');
      console.log('   Windows: net start MongoDB');
      console.log('   Mac/Linux: sudo systemctl start mongod');
      console.log('2. Check if port 27017 is blocked by firewall');
      console.log('3. Verify MongoDB data directory exists (C:\\data\\db)');
    }
    
    return false;
  } finally {
    await client.close();
  }
}

// Run the test
testConnection().then(success => {
  process.exit(success ? 0 : 1);
});