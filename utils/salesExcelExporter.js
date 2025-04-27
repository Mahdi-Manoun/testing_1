import ExcelJS from 'exceljs';
import { sendEmailFrom } from './emailSender.js';
import dotenv from 'dotenv';
import sequelize from '../config/db.js';
import Sale from '../models/sale.model.js';
import Customer from '../models/customer.model.js';

dotenv.config();

export const generateSalesReport = async () => {
    const transaction = await sequelize.transaction(); // start transaction
    
    try {
        // Fetch data using transaction
        const [salesData] = await sequelize.query(`
            SELECT 
                s.id AS sale_id,
                s.quantity AS sale_quantity,
                s.total_price,
                s.createdAt AS sale_date,
                
                c.id AS customer_id,
                c.name AS customer_name,
                c.email AS customer_email,
                c.phone AS customer_phone,
                c.city AS customer_city,
                c.neighborhood AS customer_neighborhood,
                c.street AS customer_street,
                c.building AS customer_building,
                c.floor AS customer_floor,
                
                p.name AS product_name,
                cat.name AS category_name,
                
                ar.min_value AS age_min,
                ar.max_value AS age_max,
                ar.unit AS age_unit,
                
                col.name AS color_name
            FROM 
                sales s
            JOIN customers c ON s.customer_id = c.id
            JOIN product_inventory pi ON s.inventory_id = pi.id
            JOIN products p ON pi.product_id = p.id
            JOIN categories cat ON p.category_id = cat.id
            LEFT JOIN age_ranges ar ON pi.age_range_id = ar.id
            JOIN colors col ON pi.color_id = col.id
            ORDER BY s.createdAt DESC
        `, { transaction });

        // Create an Excel file
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Column formatting
        worksheet.columns = [
            { header: 'Customer Name', key: 'customer_name', width: 25 },
            { header: 'Phone', key: 'customer_phone', width: 20 },
            { header: 'Email', key: 'customer_email', width: 35 },
            { header: 'City', key: 'customer_city', width: 20 },
            { header: 'Address', key: 'address', width: 50 },
            { header: 'Sale ID', key: 'sale_id', width: 12 },
            { header: 'Date', key: 'sale_date', width: 20 },
            { header: 'Product', key: 'product_name', width: 25 },
            { header: 'Category', key: 'category_name', width: 25 },
            { header: 'Age Range', key: 'age_range', width: 20 },
            { header: 'Color', key: 'color_name', width: 20 },
            { header: 'Qty', key: 'sale_quantity', width: 10 },
            { header: 'Total', key: 'total_price', width: 15 }
        ];

        // add data
        salesData.forEach(sale => {
            const ageRange = sale.age_min 
                ? `${sale.age_min}-${sale.age_max} ${sale.age_unit}`
                : 'All Ages';
            
            const address = `${sale.customer_street}, ${sale.customer_building}, Floor ${sale.customer_floor}, ${sale.customer_neighborhood}`;

            worksheet.addRow({
                customer_name: sale.customer_name,
                customer_phone: sale.customer_phone,
                customer_email: sale.customer_email,
                customer_city: sale.customer_city,
                address: address,
                sale_id: sale.sale_id,
                sale_date: sale.sale_date,
                product_name: sale.product_name,
                category_name: sale.category_name,
                age_range: ageRange,
                color_name: sale.color_name,
                sale_quantity: sale.sale_quantity,
                total_price: sale.total_price
            });
        });

        // Improve coordination
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                row.eachCell(cell => {
                    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                });
                row.height = 25;
            }
            
            row.eachCell(cell => {
                cell.alignment = { vertical: 'middle', wrapText: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
        });

        // Automatically adjust column width
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 0;
                if (columnLength > maxLength) maxLength = columnLength;
            });
            column.width = Math.min(Math.max(maxLength + 5, column.width), 50);
        });

        // Create Excel file in memory
        const buffer = await workbook.xlsx.writeBuffer();

        // Send email
        const emailInfo = await sendEmailFrom({
            to: process.env.EMAIL_CLIENT,
            subject: `Sales Report - ${new Date().toLocaleDateString()}`,
            text: 'Please find attached the sales report',
            html: '<p>Attached is the latest sales report</p>',
            attachments: [{
                filename: `sales_report_${Date.now()}.xlsx`,
                content: buffer
            }]
        });

        console.log('Email sent successfully:', emailInfo.messageId);

        // Delete data after confirming successful submission
        await Sale.destroy({ where: {}, transaction });
        await Customer.destroy({ where: {}, transaction });

        // commit transaction
        await transaction.commit();
        
        console.log('Report sent and data cleaned successfully!');
    } catch (error) {
        await transaction.rollback();
        console.error('Report failed - NO data was deleted:', error.message);
        throw error;
    }
};