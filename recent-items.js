const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lost_and_found_system'
  });
  const [items] = await pool.query('SELECT id, title, category, subcategory, description, location, status, date FROM Items WHERE is_deleted=FALSE AND is_approved=TRUE ORDER BY created_at DESC LIMIT 10');
  fs.writeFileSync('recent-items.json', JSON.stringify(items, null, 2));
  console.log('Wrote 10 most recent approved items to recent-items.json');
  process.exit(0);
})(); 