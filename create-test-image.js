const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

try {
  // Create a 100x100 canvas with a red background
  const width = 100;
  const height = 100;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  // Fill with red
  context.fillStyle = '#FF0000';
  context.fillRect(0, 0, width, height);
  
  // Add text
  context.fillStyle = '#FFFFFF';
  context.font = 'bold 14px Arial';
  context.textAlign = 'center';
  context.fillText('TEST IMAGE', width/2, height/2);

  // Write to file
  const testImagePath = path.join(uploadsDir, 'test-image.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(testImagePath, buffer);

  console.log(`Created test image at: ${testImagePath}`);
  console.log(`File size: ${fs.statSync(testImagePath).size} bytes`);
} catch (error) {
  console.error('Error creating test image:', error.message);
  
  // Fallback to a simple 1x1 pixel PNG if canvas is not available
  console.log('Creating a simple pixel image as fallback...');
  
  // This is a minimal valid PNG file (hex data for a 1x1 red pixel)
  const pngData = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da636400000400010001034cecd8fb0000000049454e44ae426082',
    'hex'
  );

  // Write the file
  const testImagePath = path.join(uploadsDir, 'test-image.png');
  fs.writeFileSync(testImagePath, pngData);

  console.log(`Created fallback test image at: ${testImagePath}`);
  console.log(`File size: ${fs.statSync(testImagePath).size} bytes`);
} 