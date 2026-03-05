import express from 'express';
import authRoutes from './routes/auth.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// List all routes
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log(r.route.path)
  }
});

console.log('Auth routes loaded successfully!');
console.log('Available routes:');
console.log('POST /api/auth/register');
console.log('POST /api/auth/login');
console.log('GET /api/auth/profile');
console.log('PUT /api/auth/profile');
console.log('GET /api/auth/coupons');
