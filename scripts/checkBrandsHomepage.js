import mongoose from 'mongoose';
import Brand from '../models/Brand.js';

const MONGODB_URI = 'mongodb://localhost:27017/ecommerceb';

async function checkBrands() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const allBrands = await Brand.find();
        console.log('\n=== ALL BRANDS ===');
        allBrands.forEach(brand => {
            console.log(`${brand.name}: isActive=${brand.isActive}, showOnHomepage=${brand.showOnHomepage}`);
        });

        const activeBrands = await Brand.find({ isActive: true });
        console.log('\n=== ACTIVE BRANDS (for shop filter) ===');
        activeBrands.forEach(brand => {
            console.log(`${brand.name}: isActive=${brand.isActive}, showOnHomepage=${brand.showOnHomepage}`);
        });

        const homepageBrands = await Brand.find({ showOnHomepage: true, isActive: true });
        console.log('\n=== HOMEPAGE BRANDS (for homepage display) ===');
        homepageBrands.forEach(brand => {
            console.log(`${brand.name}: isActive=${brand.isActive}, showOnHomepage=${brand.showOnHomepage}`);
        });

        console.log(`\nTotal brands: ${allBrands.length}`);
        console.log(`Active brands: ${activeBrands.length}`);
        console.log(`Homepage brands: ${homepageBrands.length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkBrands();