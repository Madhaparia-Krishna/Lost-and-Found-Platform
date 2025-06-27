/**
 * Test script for item matching functionality
 */

const { matchItems, calculateMatchScore } = require('./services/matching.service');
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lost_and_found_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function testMatching() {
  console.log('Starting matching test...');
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    console.log('Connected to database.');
    
    // Test case 1: Get a random lost item and test matching
    console.log('\n--- Test Case 1: Match a lost item with found items ---');
    const [lostItems] = await pool.query(
      'SELECT * FROM Items WHERE status = "lost" AND is_deleted = FALSE LIMIT 1'
    );
    
    if (lostItems.length === 0) {
      console.log('No lost items found in database. Skipping test case 1.');
    } else {
      const lostItem = lostItems[0];
      console.log(`Testing with lost item ID ${lostItem.id}: "${lostItem.title}"`);
      
      // Get user details
      const [userDetails] = await pool.query(
        'SELECT * FROM Users WHERE id = ?',
        [lostItem.user_id]
      );
      
      if (userDetails.length > 0) {
        console.log(`Item reported by user: ${userDetails[0].name} (${userDetails[0].email})`);
      }
      
      // Run matching
      console.log('Running matching algorithm...');
      const matches = await matchItems(lostItem);
      
      console.log(`Found ${matches.length} potential matches.`);
      if (matches.length > 0) {
        console.log('Matches:');
        matches.forEach((match, index) => {
          console.log(`${index + 1}. "${match.item.title}" (Score: ${match.score}) - ${match.item.location}`);
        });
      }
    }
    
    // Test case 2: Create test items with known similarity and test matching
    console.log('\n--- Test Case 2: Test with synthetic items ---');
    
    const lostItem = {
      id: 999999, // Fake ID for testing
      title: 'Lost MacBook Pro',
      category: 'Electronics',
      subcategory: 'Laptop',
      description: 'Silver MacBook Pro 13" with stickers on the back. Lost in the library.',
      location: 'University Library',
      status: 'lost',
      date: new Date(),
      user_id: 1 // Assuming user with ID 1 exists
    };
    
    const foundItem = {
      id: 999998, // Fake ID for testing
      title: 'Found Laptop Computer',
      category: 'Electronics',
      subcategory: 'Laptop',
      description: 'Silver Apple laptop found in the library study area',
      location: 'University Library',
      status: 'found',
      date: new Date(),
      user_id: 1 // Assuming user with ID 1 exists
    };
    
    console.log('Calculating match score between:');
    console.log(`Lost: "${lostItem.title}" (${lostItem.category}, ${lostItem.location})`);
    console.log(`Found: "${foundItem.title}" (${foundItem.category}, ${foundItem.location})`);
    
    const score = calculateMatchScore(lostItem, foundItem);
    console.log(`Match score: ${score} (${Math.round(score * 100)}%)`);
    
    // Test case 3: Location mismatch
    console.log('\n--- Test Case 3: Test with location mismatch ---');
    
    const foundItemWrongLocation = {
      ...foundItem,
      id: 999997,
      location: 'Science Building'
    };
    
    console.log('Calculating match score between:');
    console.log(`Lost: "${lostItem.title}" (${lostItem.category}, ${lostItem.location})`);
    console.log(`Found: "${foundItemWrongLocation.title}" (${foundItemWrongLocation.category}, ${foundItemWrongLocation.location})`);
    
    const scoreMismatch = calculateMatchScore(lostItem, foundItemWrongLocation);
    console.log(`Match score: ${scoreMismatch} (${Math.round(scoreMismatch * 100)}%)`);
    console.log('Expected behavior: Score should be 0 due to location mismatch');
    
    // Test case 4: High similarity
    console.log('\n--- Test Case 4: Test with high similarity ---');
    
    const foundItemHighSimilarity = {
      ...foundItem,
      id: 999996,
      title: 'Found MacBook Pro Laptop',
      description: 'Silver MacBook Pro with some stickers found in library main area'
    };
    
    console.log('Calculating match score between:');
    console.log(`Lost: "${lostItem.title}" (${lostItem.category}, ${lostItem.location})`);
    console.log(`Found: "${foundItemHighSimilarity.title}" (${foundItemHighSimilarity.category}, ${foundItemHighSimilarity.location})`);
    console.log(`Lost description: "${lostItem.description}"`);
    console.log(`Found description: "${foundItemHighSimilarity.description}"`);
    
    const scoreHighSim = calculateMatchScore(lostItem, foundItemHighSimilarity);
    console.log(`Match score: ${scoreHighSim} (${Math.round(scoreHighSim * 100)}%)`);
    
    console.log('\nMatching test completed.');
  } catch (error) {
    console.error('Error during matching test:', error);
  } finally {
    // Close the pool
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Run the test
testMatching().catch(console.error); 