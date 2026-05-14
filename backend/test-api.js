// Simple test to verify API structure
console.log('Testing API structure...\n');

try {
  // Test 1: Check if api/index.ts exists
  const fs = require('fs');
  const path = require('path');
  
  const apiPath = path.join(__dirname, 'api', 'index.ts');
  if (fs.existsSync(apiPath)) {
    console.log('✓ api/index.ts exists');
  } else {
    console.error('✗ api/index.ts not found');
    process.exit(1);
  }

  // Test 2: Check if required dependencies are installed
  const packageJson = require('./package.json');
  const requiredDeps = ['express', 'cors', 'cookie-parser', '@vercel/node', '@supabase/supabase-js'];
  
  for (const dep of requiredDeps) {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`✓ ${dep} is installed`);
    } else {
      console.error(`✗ ${dep} is missing`);
      process.exit(1);
    }
  }

  // Test 3: Check if vercel.json is configured
  const vercelConfig = require('./vercel.json');
  if (vercelConfig.builds && vercelConfig.builds.length > 0) {
    console.log('✓ vercel.json is configured');
  } else {
    console.error('✗ vercel.json is not properly configured');
    process.exit(1);
  }

  console.log('\n✓ All checks passed! Ready for deployment.');
} catch (error) {
  console.error('\n✗ Test failed:', error.message);
  process.exit(1);
}
