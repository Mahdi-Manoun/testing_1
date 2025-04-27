import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncDatabase } from './models/index.js';

// routes
import productRoutes from './Routes/productRoutes.js';
import adminRoutes from './Routes/adminRoutes.js';
import saleRoutes from './Routes/saleRoutes.js';

// config
import createAdmin from './config/adminSetup.js';


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

app.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
});

// sync db before running the server
syncDatabase()
    .then(async () => {
        console.log('Database synced successfully');

        try {
            await createAdmin();
            console.log('Admin setup check completed');

            const PORT = process.env.PORT || 5000;
            const server = app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });

            return server;
        } catch (adminError) {
            console.error('Admin initialization failed:', adminError);
            throw adminError;
        }
    })
    .catch((error) => {
        console.error('Server startup failed:', error);
        process.exit(1); // Exit with failure
    });