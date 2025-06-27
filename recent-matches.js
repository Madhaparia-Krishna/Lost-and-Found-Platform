const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lost_and_found_system'
  });
  const [matches] = await pool.query('SELECT * FROM ItemMatches ORDER BY created_at DESC LIMIT 10');
  fs.writeFileSync('recent-matches.json', JSON.stringify(matches, null, 2));
  console.log('Wrote 10 most recent matches to recent-matches.json');
  process.exit(0);
})(); 