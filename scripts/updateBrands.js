import mongoose from 'mongoose';
import Brand from '../models/Brand.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerceb';

async function updateBrands() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update all brands that don't have showOnHomepage field or have it as true
        const result = await Brand.updateMany(
            {},
            { $set: { showOnHomepage: false } }
        );

        console.log(`Updated ${result.modifiedCount} brands`);
        console.log('All brands now have showOnHomepage set to false');
        
        process.exit(0);
    } catch (error) {
        console.error('Error updating brands:', error);
        process.exit(1);
    }
}

updateBrands();
