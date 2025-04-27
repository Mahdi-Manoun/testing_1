import sequelize from '../config/db.js';
import { sendEmailFrom } from '../utils/emailSender.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// models
import ProductInventory from '../models/productInventory.model.js';
import Customer from '../models/customer.model.js';
import Sale from '../models/sale.model.js';
import Product from '../models/product.model.js';
import Color from '../models/color.model.js';
import AgeRange from '../models/ageRange.model.js';
import ProductImage from '../models/productImage.model.js';

dotenv.config();

// Get the current file path & directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// create new sale with customer and update inventory
const createSale = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { customer, items, total_price } = req.body;

        // create new customer
        const customerRecord = await Customer.create({
            name: customer.name,
            email: customer.email || null,
            phone: customer.phone,
            city: customer.city,
            neighborhood: customer.neighborhood,
            street: customer.street,
            building: customer.building,
            floor: customer.floor
        }, { transaction });

        const purchasedItems = [];
        let calculatedTotal = 0;
        const productsToCheck = new Set();
        const ageRangesToCheck = new Set();

        // Email data collection
        const emailProducts = [];

        for (const item of items) {
            const inventory = await ProductInventory.findOne({
                where: {
                    product_id: item.product_id,
                    color_id: item.color_id,
                    age_range_id: item.age_range_id || null
                },
                include: [
                    { model: Product },
                    { model: Color },
                    { model: AgeRange }
                ],
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!inventory) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Inventory not found',
                    message: `No inventory found for product ${item.product_id}, color ${item.color_id}, age range ${item.age_range_id || 'none'}`
                });
            }

            if (inventory.quantity < item.quantity) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient stock',
                    details: {
                        product_id: item.product_id,
                        available: inventory.quantity,
                        requested: item.quantity,
                        age_range: inventory.AgeRange ?
                            `${inventory.AgeRange.min_value}-${inventory.AgeRange.max_value} ${inventory.AgeRange.unit}` : 'None'
                    }
                });
            }

            // create a sales record
            const saleItem = await Sale.create({
                customer_id: customerRecord.id,
                inventory_id: inventory.id,
                quantity: item.quantity,
                unit_price: inventory.Product.price,
                total_price: inventory.Product.price * item.quantity
            }, { transaction });

            // Update inventory
            const newQuantity = inventory.quantity - item.quantity;
            await inventory.update({ quantity: newQuantity }, { transaction });

            // Collect product data for email
            const productInfo = {
                name: inventory.Product.name,
                color: inventory.Color.name,
                age_range: inventory.AgeRange ?
                    `${inventory.AgeRange.min_value}-${inventory.AgeRange.max_value} ${inventory.AgeRange.unit}` : 'No age range',
                quantity: item.quantity,
                price: inventory.Product.price,
                total: inventory.Product.price * item.quantity
            };
            emailProducts.push(productInfo);

            purchasedItems.push({
                sale_id: saleItem.id,
                product_id: inventory.Product.id,
                product_name: inventory.Product.name,
                color: inventory.Color.name,
                age_range: inventory.AgeRange ?
                    `${inventory.AgeRange.min_value}-${inventory.AgeRange.max_value} ${inventory.AgeRange.unit}` : 'None',
                quantity: item.quantity,
                unit_price: inventory.Product.price,
                item_total: Number((inventory.Product.price * item.quantity).toFixed(2)),
                remaining_stock: newQuantity
            });

            calculatedTotal += Number((inventory.Product.price * item.quantity).toFixed(2));

            // If stock runs out
            if (newQuantity <= 0) {
                const ageRangeId = inventory.age_range_id;
                await inventory.destroy({ transaction });
                productsToCheck.add(item.product_id);

                if (ageRangeId) {
                    ageRangesToCheck.add(ageRangeId);
                }
            }
        }

        // Delete the product if it is out of stock.
        for (const productId of productsToCheck) {
            const remainingInventory = await ProductInventory.findOne({
                where: { product_id: productId },
                transaction
            });

            if (!remainingInventory) {
                const product = await Product.findByPk(productId, {
                    include: [ProductImage],
                    transaction
                });

                if (product) {
                    // delete images
                    for (const image of product.ProductImages) {
                        const filename = image.image_url.split('/').pop();
                        const filePath = path.join(__dirname, '../public/uploads/product', filename);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                        await image.destroy({ transaction });
                    }

                    // delete product
                    await product.destroy({ transaction });
                }
            }
        }

        // Delete age ranges that are no longer in stock
        for (const ageRangeId of ageRangesToCheck) {
            const remainingInventory = await ProductInventory.findOne({
                where: { age_range_id: ageRangeId },
                transaction
            });

            if (!remainingInventory) {
                await AgeRange.destroy({
                    where: { id: ageRangeId },
                    transaction
                });
            }
        }

        // Check total price
        if (Math.abs(calculatedTotal - total_price) > 0.01) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Price mismatch',
                message: `Calculated total (${calculatedTotal}) doesn't match provided total (${total_price})`
            });
        }

        // Send email with order details
        try {
            const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; color: #333;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center" style="padding:20px 0; background-color: #f8f1e9;">
                <table width="600" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="text-align:center;">
                            <h1 style="color: #d4a373; margin:0;">Sweet Cuddles Boutique</h1>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding:20px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="20" style="border:1px solid #eee; background:#fff;">
                    <tr>
                        <td>
                            <h3 style="margin-top:0;">Customer Details</h3>
                            <p><strong>Name:</strong> ${customer.name}</p>
                            <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${customer.phone}</p>
                            <p><strong>City:</strong> ${customer.city}</p>
                            <p><strong>Neighborhood:</strong> ${customer.neighborhood}</p>
                            <p><strong>Street:</strong> ${customer.street}</p>
                            <p><strong>Building:</strong> ${customer.building}</p>
                            <p><strong>Floor:</strong> ${customer.floor}</p>
                            <h3>Order Summary</h3>
                            <table width="100%" border="0" cellspacing="0" cellpadding="10" style="border-collapse:collapse; margin:20px 0;">
                                <thead>
                                    <tr style="background-color:#f8f1e9;">
                                        <th style="text-align:left; padding:10px; border-bottom:1px solid #eee;">Product</th>
                                        <th style="text-align:left; padding:10px; border-bottom:1px solid #eee;">Color</th>
                                        <th style="text-align:left; padding:10px; border-bottom:1px solid #eee;">Age Range</th>
                                        <th style="text-align:left; padding:10px; border-bottom:1px solid #eee;">Qty</th>
                                        <th style="text-align:left; padding:10px; border-bottom:1px solid #eee;">Price</th>
                                        <th style="text-align:left; padding:10px; border-bottom:1px solid #eee;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${emailProducts.map(product => `
                                    <tr>
                                        <td style="padding:10px; border-bottom:1px solid #eee;">${product.name}</td>
                                        <td style="padding:10px; border-bottom:1px solid #eee;">${product.color}</td>
                                        <td style="padding:10px; border-bottom:1px solid #eee;">${product.age_range}</td>
                                        <td style="padding:10px; border-bottom:1px solid #eee;">${product.quantity}</td>
                                        <td style="padding:10px; border-bottom:1px solid #eee;">${product.price} $</td>
                                        <td style="padding:10px; border-bottom:1px solid #eee;">${product.total} $</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            
                            <p style="text-align:right; font-weight:bold; font-size:18px; margin-top:20px;">
                                Grand Total: ${calculatedTotal} $
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding:20px 0; color:#777; font-size:14px;">
                <p>Sweet Cuddles Boutique © ${new Date().getFullYear()}</p>
            </td>
        </tr>
    </table>
</body>
</html>
`;

            await sendEmailFrom({
                to: process.env.EMAIL_CLIENT,
                subject: 'Order details:',
                html: emailHtml
            });
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
        }

        await transaction.commit();

        return res.status(201).json({
            success: true,
            message: 'Sale completed successfully!',
            data: {
                customer: customerRecord,
                items: purchasedItems,
                total: calculatedTotal
            }
        });

    } catch (error) {
        await transaction.rollback();

        console.error('Server error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};


// get all products with sales and inventory information.
const getAllSales = async (req, res) => {
    try {
        const products = await Product.findAll({
            include: [
                {
                    model: ProductInventory,
                    include: [
                        {
                            model: Color,
                            attributes: ['id', 'name']
                        },
                        {
                            model: AgeRange,
                            attributes: ['id', 'min_value', 'max_value', 'unit']
                        },
                        {
                            model: Sale,
                            include: [{
                                model: Customer,
                                attributes: ['id', 'name', 'phone']
                            }]
                        }
                    ]
                },
                {
                    model: ProductImage,
                    attributes: ['id', 'image_url']
                }
            ]
        });

        const formattedProducts = products.map(product => {
            let totalSales = 0;
            let totalQuantity = 0;
            const salesDetails = [];

            product.ProductInventories.forEach(inventory => {
                inventory.Sales.forEach(sale => {
                    totalSales += sale.total_price;
                    totalQuantity += sale.quantity;
                    salesDetails.push({
                        sale_id: sale.id,
                        date: sale.createdAt,
                        customer: {
                            id: sale.Customer.id,
                            name: sale.Customer.name,
                            phone: sale.Customer.phone
                        },
                        color: inventory.Color.name,
                        age_range: inventory.AgeRange ?
                            `${inventory.AgeRange.min_value}-${inventory.AgeRange.max_value} ${inventory.AgeRange.unit}` :
                            'None',
                        quantity: sale.quantity,
                        unit_price: sale.unit_price,
                        total_price: sale.total_price
                    });
                });
            });

            return {
                product_id: product.id,
                product_name: product.name,
                price: product.price,
                images: product.ProductImages.map(img => img.image_url),
                total_sales: totalSales,
                total_quantity_sold: totalQuantity,
                sales: salesDetails
            };
        });

        // Calculate the total for all sales
        const totalSalesAmount = formattedProducts.reduce((sum, product) => sum + product.total_sales, 0);

        return res.status(200).json({
            success: true,
            product_count: products.length,
            total_sales_amount: totalSalesAmount,
            data: formattedProducts
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

export { createSale, getAllSales };