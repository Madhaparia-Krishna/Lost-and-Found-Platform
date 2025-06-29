const mysql = require('mysql2/promise');
const faker = require('@faker-js/faker').faker;

async function seed() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // adjust if needed
    database: 'lost_and_found_system'
  });

  // Delete only Items and Notifications to preserve Users
  await connection.execute('DELETE FROM Notifications');
  await connection.execute('DELETE FROM Items');
  // ❌ Do NOT delete Users
  // await connection.execute('DELETE FROM Users');

  const users = [];
  const roles = ['user', 'security', 'admin'];
  const faculties = ['ICS', 'Business', 'Law', 'Hospitality'];
  const years = ['1st', '2nd', '3rd', '4th'];

  // Insert or Update Users
  for (let i = 0; i < 10; i++) {
    const name = faker.person.fullName();
    const email = faker.internet.email();
    const password = faker.internet.password(10); 
    const admission_number = `AD${faker.number.int({ min: 1000, max: 9999 })}`;
    const faculty_school = faker.helpers.arrayElement(faculties);
    const year_of_study = faker.helpers.arrayElement(years);
    const phone_number = '07' + faker.number.int({ min: 10000000, max: 99999999 }).toString();
    const role = faker.helpers.arrayElement(roles);

    const [result] = await connection.execute(
      `INSERT INTO users 
        (name, email, password, admission_number, faculty_school, year_of_study, phone_number, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password = VALUES(password),
         admission_number = VALUES(admission_number),
         faculty_school = VALUES(faculty_school),
         year_of_study = VALUES(year_of_study),
         phone_number = VALUES(phone_number),
         role = VALUES(role)`,
      [name, email, password, admission_number, faculty_school, year_of_study, phone_number, role]
    );

    // Use existing ID if not inserted
    const userId = result.insertId || (
      await connection.query('SELECT id FROM users WHERE email = ?', [email])
    )[0][0]?.id;

    if (userId) {
      users.push({ id: userId });
    }
  }

  const items = [];
  const categories = ['Electronics', 'Clothing', 'Stationery', 'Accessories'];
  const locations = ['Library', 'Cafeteria', 'Auditorium', 'Parking Lot', 'Labs', 'Hostel A'];

  // Insert Items
  for (let i = 0; i < 20; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const status = faker.helpers.arrayElement(['lost', 'found']);
    const category = faker.helpers.arrayElement(categories);
    const subcategory = category === 'Electronics'
      ? faker.helpers.arrayElement(['Phone', 'EarPods', 'Laptop Charger'])
      : category === 'Clothing'
        ? faker.helpers.arrayElement(['Sweater', 'Scarf', 'Jacket'])
        : category === 'Stationery'
          ? faker.helpers.arrayElement(['Notebook', 'Pen', 'Folder'])
          : faker.helpers.arrayElement(['Umbrella', 'Keyholder', 'Water Bottle']);

    const title = `${faker.color.human()} ${subcategory}`;
    const description = `A ${title} lost near ${faker.helpers.arrayElement(locations)}.`;
    const location = faker.helpers.arrayElement(locations);
    const date = faker.date.recent({ days: 20 });

    const [result] = await connection.execute(
      `INSERT INTO items 
        (title, category, subcategory, description, location, status, date, user_id, is_approved, is_deleted, is_donated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0)`,
      [title, category, subcategory, description, location, status, date.toISOString().split('T')[0], user.id]
    );

    items.push({ id: result.insertId });
  }

  

  console.log('🎉 Dummy data inserted successfully (without deleting users)');
  await connection.end();
}

seed();

