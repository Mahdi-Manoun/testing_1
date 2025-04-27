// index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import './setup.js';

// routes
import productRoutes from './Routes/productRoutes.js';
import adminRoutes from './Routes/adminRoutes.js';
import saleRoutes from './Routes/saleRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// routes
app.use('/api/auth', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);

// logging middleware
app.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
});

export default app;