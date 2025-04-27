import cron from 'node-cron';
import { generateSalesReport } from '../utils/salesExcelExporter.js';

// Initial instant playback
generateSalesReport().catch(console.error);

// Scheduling in the months of (6) and (12) on the 1st of the month at 8:00 AM
cron.schedule('0 8 1 6,12 *', () => {
    console.log(`⏰ Running semi-annual report at ${new Date().toLocaleString()}`);
    generateSalesReport().catch(console.error);
});