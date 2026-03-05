import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerceb';

async function updateBrands() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const result = await db.collection('brands').updateMany(
            {},
            { $set: { showOnHomepage: false } }
        );

        console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        
        const brands = await db.collection('brands').find().toArray();
        console.log('\nUpdated brands:');
        brands.forEach(brand => {
            console.log(`- ${brand.name}: showOnHomepage = ${brand.showOnHomepage}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateBrands();
