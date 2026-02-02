const bcrypt = require('bcryptjs');

const password = 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nUse this SQL to insert the admin user:');
  console.log(`
INSERT INTO users (id, organization_id, email, password_hash, full_name, role)
VALUES (
    uuid_generate_v4(),
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@limhs.edu',
    '${hash}',
    'Admin User',
    'admin'
);
  `);
});
