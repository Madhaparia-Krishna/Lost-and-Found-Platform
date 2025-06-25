/**
 * Command line tool for testing item matching
 * 
 * Usage: node test-match-cli.js --status=lost --title="Lost MacBook" --category="Electronics" --location="Library"
 */

const axios = require('axios');
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

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

// Default test items
const defaultLostItem = {
  status: 'lost',
  title: 'Lost MacBook Pro',
  category: 'Electronics',
  subcategory: 'Laptop',
  location: 'University Library',
  description: 'Silver MacBook Pro 13" with stickers on the back. Lost in the library.',
  date: new Date().toISOString().slice(0, 10),
  user_id: 1,
  id: 999999
};

const defaultFoundItem = {
  status: 'found',
  title: 'Found Laptop Computer',
  category: 'Electronics',
  subcategory: 'Laptop',
  location: 'University Library',
  description: 'Silver Apple laptop found in the library study area',
  date: new Date().toISOString().slice(0, 10),
  user_id: 1,
  id: 999998
};

// Create test item from args
const createTestItem = () => {
  // Start with default item based on status
  const baseItem = args.status === 'found' ? defaultFoundItem : defaultLostItem;
  
  // Override with provided arguments
  return {
    ...baseItem,
    ...Object.keys(args).reduce((acc, key) => {
      if (['status', 'title', 'category', 'subcategory', 'location', 'description'].includes(key)) {
        acc[key] = args[key];
      }
      return acc;
    }, {})
  };
};

// Main function
async function main() {
  // Check if help is requested
  if (args.help || args.h) {
    console.log('\nItem Matching Test Tool');
    console.log('----------------------');
    console.log('\nUsage: node test-match-cli.js [options]');
    console.log('\nOptions:');
    console.log('  --status=<lost|found>    Set item status (default: lost)');
    console.log('  --title=<string>         Set item title');
    console.log('  --category=<string>      Set item category');
    console.log('  --subcategory=<string>   Set item subcategory');
    console.log('  --location=<string>      Set item location');
    console.log('  --description=<string>   Set item description');
    console.log('  --send-email             Send actual emails for matches');
    console.log('  --direct                 Skip API and test directly with matchItems function');
    console.log('  --help, -h               Show this help message');
    console.log('\nExamples:');
    console.log('  node test-match-cli.js --status=lost --title="Lost iPhone" --category="Electronics" --location="Cafeteria"');
    console.log('  node test-match-cli.js --status=found --location="Library" --direct');
    return;
  }
  
  console.log('\n🔍 Item Matching Test Tool');
  console.log('========================\n');

  const testItem = createTestItem();
  
  console.log(`Testing ${testItem.status.toUpperCase()} item: "${testItem.title}"`);
  console.log(`Location: ${testItem.location}`);
  console.log(`Category: ${testItem.category}${testItem.subcategory ? ', ' + testItem.subcategory : ''}`);
  if (testItem.description) {
    console.log(`Description: ${testItem.description}`);
  }
  console.log('------------------------\n');
  
  // Test method: API or direct function call
  if (args.direct) {
    // Direct testing with matchItems function
    console.log('🧪 Testing directly with matchItems() function...\n');
    
    const pool = mysql.createPool(dbConfig);
    
    try {
      const matches = await matchItems(testItem);
      
      console.log(`✅ Found ${matches.length} potential matches!\n`);
      
      if (matches.length > 0) {
        console.log('MATCHES:');
        console.log('--------');
        matches.forEach((match, index) => {
          console.log(`#${index + 1}: "${match.item.title}" (${Math.round(match.score * 100)}% match)`);
          console.log(`    Category: ${match.item.category || 'N/A'}`);
          console.log(`    Location: ${match.item.location}`);
          console.log(`    User: ${match.item.name} (${match.item.email})`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('❌ Error testing matches:', error);
    } finally {
      await pool.end();
    }
  } else {
    // API testing
    console.log('🧪 Testing via API endpoint...\n');
    
    try {
      // Determine if we should send emails
      const sendMail = args['send-email'] ? '?sendMail=true' : '';
      
      // Make API call
      const response = await axios.post(`http://localhost:5000/test-match${sendMail}`, {
        item: testItem
      });
      
      const { data } = response;
      
      console.log(`✅ API response: ${data.message}`);
      console.log(`Checked ${data.totalItemsChecked} items with threshold ${data.threshold * 100}%\n`);
      
      if (data.matches && data.matches.length > 0) {
        console.log('MATCHES:');
        console.log('--------');
        data.matches.forEach((match, index) => {
          console.log(`#${index + 1}: "${match.title}" (${match.scorePercentage} match)`);
          console.log(`    Category: ${match.category || 'N/A'}`);
          console.log(`    Location: ${match.location}`);
          console.log('');
        });
        
        // Email results if applicable
        if (args['send-email'] && data.emailResults !== 'Email sending disabled') {
          console.log('\nEMAIL RESULTS:');
          console.log('-------------');
          data.emailResults.forEach(result => {
            if (result.success) {
              console.log(`✅ Email sent to: ${result.to}`);
            } else {
              console.log(`❌ Failed to send email to: ${result.to}`);
              console.log(`   Error: ${result.error || 'Unknown error'}`);
            }
          });
        }
      } else {
        console.log('No matches found above threshold.');
      }
    } catch (error) {
      console.error('❌ Error testing matches via API:', error.message);
      
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    }
  }
}

// Run the main function
main().catch(console.error); 