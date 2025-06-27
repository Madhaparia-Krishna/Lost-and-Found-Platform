const mysql = require('mysql2/promise');
const { calculateMatchScore } = require('./services/matching.service');

// Set the item IDs to test
const LOST_ITEM_ID = 47; // Update this to your latest lost item ID
const FOUND_ITEM_ID = 35; // This is the found watch in Library

(async () => {
  try {
    console.log('🔍 Direct Match Testing Tool');
    console.log('===========================');
    
    // Connect to database
    const pool = await mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'lost_and_found_system'
    });

    // Fetch the lost item
    const [lostItems] = await pool.query(
      'SELECT * FROM Items WHERE id = ?',
      [LOST_ITEM_ID]
    );

    if (lostItems.length === 0) {
      console.error(`❌ Lost item with ID ${LOST_ITEM_ID} not found`);
      process.exit(1);
    }

    // Fetch the found item
    const [foundItems] = await pool.query(
      'SELECT * FROM Items WHERE id = ?',
      [FOUND_ITEM_ID]
    );

    if (foundItems.length === 0) {
      console.error(`❌ Found item with ID ${FOUND_ITEM_ID} not found`);
      process.exit(1);
    }

    const lostItem = lostItems[0];
    const foundItem = foundItems[0];

    console.log(`Testing match between:`);
    console.log(`LOST: ID=${lostItem.id}, Title="${lostItem.title}", Category="${lostItem.category}", Location="${lostItem.location}", Description="${lostItem.description}"`);
    console.log(`FOUND: ID=${foundItem.id}, Title="${foundItem.title}", Category="${foundItem.category}", Location="${foundItem.location}", Description="${foundItem.description}"`);
    console.log('----------------------------');

    // Calculate match score
    const matchScore = calculateMatchScore(lostItem, foundItem);
    const percentage = Math.round(matchScore * 100);
    
    console.log(`Match Score: ${matchScore} (${percentage}%)`);
    
    // Check if match is above threshold
    const THRESHOLD = 0.7; // 70%
    if (matchScore >= THRESHOLD) {
      console.log(`✅ Match is ABOVE threshold (${THRESHOLD * 100}%)`);
      
      // Check if match exists in database
      const [matches] = await pool.query(
        'SELECT * FROM ItemMatches WHERE lost_item_id = ? AND found_item_id = ?',
        [lostItem.id, foundItem.id]
      );
      
      if (matches.length > 0) {
        console.log(`🔍 Match already exists in database with score ${matches[0].match_score} (${Math.round(matches[0].match_score * 100)}%)`);
        console.log(`Status: ${matches[0].status}`);
        console.log(`Created at: ${matches[0].created_at}`);
      } else {
        console.log(`❓ No match record exists in database - automatic matching may not be working`);
      }
    } else {
      console.log(`❌ Match is BELOW threshold (${THRESHOLD * 100}%)`);
    }
    
    // Get detailed scores for each component
    console.log('\nDetailed component scores:');
    
    // These weights should match those in matching.service.js
    const weights = {
      location: 0.3,    // 30%
      category: 0.2,    // 20%
      subcategory: 0.15, // 15%
      description: 0.35  // 35%
    };
    
    // Import the similarity function from the matching service
    const { calculateStringSimilarity } = require('./services/matching.service');
    
    // Location comparison
    const locationSimilarity = calculateStringSimilarity(
      lostItem.location || '',
      foundItem.location || ''
    );
    console.log(`Location: ${locationSimilarity} * ${weights.location} = ${locationSimilarity * weights.location} (${Math.round(locationSimilarity * 100)}% similar)`);
    
    // Category comparison
    const categorySimilarity = calculateStringSimilarity(
      lostItem.category || '',
      foundItem.category || ''
    );
    console.log(`Category: ${categorySimilarity} * ${weights.category} = ${categorySimilarity * weights.category} (${Math.round(categorySimilarity * 100)}% similar)`);
    
    // Subcategory comparison
    const subcategorySimilarity = calculateStringSimilarity(
      lostItem.subcategory || '',
      foundItem.subcategory || ''
    );
    console.log(`Subcategory: ${subcategorySimilarity} * ${weights.subcategory} = ${subcategorySimilarity * weights.subcategory} (${Math.round(subcategorySimilarity * 100)}% similar)`);
    
    // Description comparison
    const descriptionSimilarity = calculateStringSimilarity(
      lostItem.description || '',
      foundItem.description || ''
    );
    console.log(`Description: ${descriptionSimilarity} * ${weights.description} = ${descriptionSimilarity * weights.description} (${Math.round(descriptionSimilarity * 100)}% similar)`);

    // Exit
    process.exit(0);
  } catch (error) {
    console.error('Error testing match:', error);
    process.exit(1);
  }
})(); 