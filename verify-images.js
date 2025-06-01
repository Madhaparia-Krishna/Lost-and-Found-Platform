// Script to verify image accessibility
const http = require('http');
const fs = require('fs');
const path = require('path');

// Define the path to the uploads directory
const uploadsDir = path.join(__dirname, 'uploads');

console.log('Checking uploads directory...');
if (!fs.existsSync(uploadsDir)) {
  console.error('Error: uploads directory does not exist!');
  console.log('Creating uploads directory...');
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory at:', uploadsDir);
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
    process.exit(1);
  }
} else {
  console.log('Uploads directory exists at:', uploadsDir);
}

// List all files in the uploads directory
console.log('\nListing files in uploads directory:');
try {
  const files = fs.readdirSync(uploadsDir);
  if (files.length === 0) {
    console.log('No files found in uploads directory');
  } else {
    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`- ${file} (${stats.size} bytes)`);
    });
  }
} catch (err) {
  console.error('Error listing files:', err);
}

// Create a test image if none exists
const testImagePath = path.join(uploadsDir, 'test-image.png');
if (!fs.existsSync(testImagePath)) {
  console.log('\nTest image does not exist. Creating a simple test image...');
  
  // Create a very simple PNG pixel (1x1 transparent pixel)
  const simplePng = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  try {
    fs.writeFileSync(testImagePath, simplePng);
    console.log('Created test image at:', testImagePath);
  } catch (err) {
    console.error('Failed to create test image:', err);
  }
} else {
  console.log('\nTest image exists at:', testImagePath);
  const stats = fs.statSync(testImagePath);
  console.log(`Size: ${stats.size} bytes`);
  
  if (stats.size < 10) {
    console.log('Warning: Test image file is too small and may be corrupted');
  }
}

// Test server connectivity
console.log('\nTesting server connectivity...');
const serverUrl = 'http://localhost:5000';

const testEndpoint = (url, description) => {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      console.log(`${description}: ${res.statusCode} ${res.statusMessage}`);
      resolve(res.statusCode);
    }).on('error', (err) => {
      console.error(`${description} error:`, err.message);
      resolve(null);
    });
  });
};

// Run tests
async function runTests() {
  await testEndpoint(`${serverUrl}`, 'Server root');
  await testEndpoint(`${serverUrl}/uploads/test-image.png`, 'Test image');
  await testEndpoint(`${serverUrl}/api/test-uploads`, 'Uploads directory API');
  await testEndpoint(`${serverUrl}/api/test-image`, 'Test image API');
  
  console.log('\nVerification complete. Check the results above for any issues.');
}

runTests(); 