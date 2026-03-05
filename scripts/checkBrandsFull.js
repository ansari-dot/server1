import mongoose from 'mongoose';
import Brand from '../models/Brand.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerceb';

async function checkBrands() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const brands = await Brand.find().lean();
        console.log('Full brand documents:');
        console.log(JSON.stringify(brands, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkBrands();
