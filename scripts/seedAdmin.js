import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@nexus.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('Deleting existing admin to recreate...');
      await Admin.deleteOne({ email: 'admin@nexus.com' });
    }

    // Create admin user
    console.log('Creating new admin user...');
    const admin = new Admin({
      email: 'admin@nexus.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin',
      isActive: true
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('\n📧 Email: admin@nexus.com');
    console.log('🔑 Password: admin123');
    console.log('\nYou can now login to the admin panel.');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
