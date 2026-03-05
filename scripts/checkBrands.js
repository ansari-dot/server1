import mongoose from 'mongoose';
import Brand from '../models/Brand.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerceb';

async function checkBrands() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const brands = await Brand.find();
        console.log('\nCurrent brands:');
        brands.forEach(brand => {
            console.log(`- ${brand.name}: showOnHomepage = ${brand.showOnHomepage}, isActive = ${brand.isActive}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkBrands();
