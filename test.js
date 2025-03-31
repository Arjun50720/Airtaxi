async function testConnection() {
  console.log('🔄 Simulating database connection...');
  
  try {
    // Simulating a successful connection
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulating delay
    
    console.log('✅ Successfully connected to dummy database!');
    console.log('📊 Available databases: [ "dummy_db1", "dummy_db2" ]');
    
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  process.exit(success ? 0 : 1);
});