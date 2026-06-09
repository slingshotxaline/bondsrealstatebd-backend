require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create superadmin if not exists
    const existing = await User.findOne({ role: 'superadmin' });
    if (existing) {
      console.log('Superadmin already exists:', existing.email);
      process.exit(0);
    }

    const superadmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@bonds.com',
      password: 'Admin@123',
      role: 'superadmin',
      status: 'active',
    });

    console.log('✅ Superadmin created:');
    console.log('   Email:', superadmin.email);
    console.log('   Password: Admin@123');
    console.log('   ⚠️  Change this password immediately after first login!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
