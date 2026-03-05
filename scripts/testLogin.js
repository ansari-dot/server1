import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';

dotenv.config();

const testLogin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const email = 'admin@nexus.com';
    const password = 'admin123';

    console.log('Testing login for:', email);
    
    // Find admin
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      console.log('❌ Admin not found in database');
      process.exit(1);
    }
    
    console.log('✅ Admin found:', {
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      isActive: admin.isActive
    });
    
    // Test password
    const isValid = await admin.comparePassword(password);
    
    if (isValid) {
      console.log('✅ Password is correct!');
      console.log('\nLogin should work with:');
      console.log('Email:', email);
      console.log('Password:', password);
    } else {
      console.log('❌ Password is incorrect');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testLogin();
