import { syncDatabase } from './models/index.js';
import createAdmin from './config/adminSetup.js';

async function setupApp() {
    try {
        await syncDatabase();
        await createAdmin();
        console.log('Database synced and Admin created');
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupApp();