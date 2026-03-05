import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Newsletter from '../models/Newsletter.js';

dotenv.config();

async function testNewsletter() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerceb');
    console.log('Connected to MongoDB');

    const subscriptions = await Newsletter.find().sort({ createdAt: -1 });
    console.log(`\nFound ${subscriptions.length} newsletter subscriptions:\n`);
    
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. Email: ${sub.email}`);
      console.log(`   Name: ${sub.name || 'N/A'}`);
      console.log(`   Source: ${sub.source}`);
      console.log(`   Active: ${sub.isActive}`);
      console.log(`   Created: ${sub.createdAt}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testNewsletter();
