import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// models
import Product from '../models/product.model.js';
import ProductImage from '../models/productImage.model.js';
import ProductInventory from '../models/productInventory.model.js';
import Category from '../models/category.model.js';
import Color from '../models/color.model.js';
import AgeRange from '../models/ageRange.model.js';

// Get the current file path & directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// add a product
const addProduct = async (req, res) => {
    const { name, price, description, category_id, inventory = [], images: additionalImages = [] } = req.body;
    const uploadedImage = req.file && {
        url: `http://localhost:5000/uploads/product/${req.file.filename}`,
        is_primary: true
    };

    try {
        // Verify the required data
        const errors = [];
        if (!name?.trim()) errors.push('Name is required');
        if (!category_id || isNaN(category_id)) errors.push('Valid category ID is required');

        if (errors.length > 0) {
            if (req.file) fs.unlinkSync(path.join(__dirname, '../public/uploads/product', req.file.filename));
            return res.status(400).json({ success: false, errors });
        }

        const transaction = await sequelize.transaction();

        try {
            // create new product
            const product = await Product.create({
                name: name.trim(),
                price: price || 0,
                description: description?.trim(),
                category_id
            }, { transaction });

            // Image processing
            const imagesToCreate = uploadedImage ? [{
                product_id: product.id,
                image_url: uploadedImage.url,
                is_primary: true
            }] : [];

            additionalImages.forEach(image => {
                if (image?.url) imagesToCreate.push({
                    product_id: product.id,
                    image_url: image.url,
                    is_primary: image.is_primary || false
                });
            });

            if (imagesToCreate.length) {
                await ProductImage.bulkCreate(imagesToCreate, { transaction });
            }

            // Inventory processing
            if (inventory.length) {
                for (const item of inventory) {
                    // Delete any existing stock of the same product and color first
                    await ProductInventory.destroy({
                        where: {
                            product_id: product.id,
                            color_id: item.color_id
                        },
                        transaction
                    });

                    // If there are age ranges
                    if (item.age_ranges?.length) {
                        for (const ageRange of item.age_ranges) {
                            // create or get age ranges
                            const [createdAgeRange] = await AgeRange.findOrCreate({
                                where: {
                                    min_value: ageRange.min_value || 0,
                                    max_value: ageRange.max_value,
                                    unit: ageRange.unit || 'years'
                                },
                                transaction
                            });

                            // Create inventory record
                            await ProductInventory.create({
                                product_id: product.id,
                                color_id: item.color_id,
                                age_range_id: createdAgeRange.id,
                                quantity: ageRange.quantity || 0
                            }, { transaction });
                        }
                    } else {
                        // If there are no age ranges
                        await ProductInventory.create({
                            product_id: product.id,
                            color_id: item.color_id,
                            age_range_id: null,
                            quantity: item.quantity || 0
                        }, { transaction });
                    }
                }
            }

            await transaction.commit();

            return res.status(201).json({
                success: true,
                message: 'Product added successfully!',
                productId: product.id
            });

        } catch (error) {
            await transaction.rollback();
            if (req.file) fs.unlinkSync(path.join(__dirname, '../public/uploads/product', req.file.filename));
            console.error('Transaction error:', error);

            return res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};



// get all products
const getAllProducts = async (req, res) => {
    try {
        const products = await Product.findAll({
            include: [
                {
                    model: Category,
                    attributes: ['id', 'name']
                },
                {
                    model: ProductImage,
                    attributes: ['id', 'image_url', 'is_primary'],
                    order: [['is_primary', 'DESC']]
                },
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
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        if (!products.length) {
            return res.status(404).json({
                success: false,
                message: 'No products found'
            });
        }

        const formattedProducts = products.map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            category: {
                id: product.Category?.id,
                name: product.Category?.name
            },
            images: product.ProductImages,
            inventory: product.ProductInventories?.map(inv => ({
                id: inv.id,
                color_id: inv.color_id,
                color_name: inv.Color?.name,
                quantity: inv.quantity,
                age_range: inv.AgeRange ? {
                    id: inv.AgeRange.id,
                    min: inv.AgeRange.min_value,
                    max: inv.AgeRange.max_value,
                    unit: inv.AgeRange.unit
                } : null,
                created_at: inv.created_at
            })),
            created_at: product.created_at
        }));

        return res.status(200).json({
            success: true,
            count: products.length,
            data: formattedProducts
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};


// get a single product or products by supplier_id or category (filtering)
const getProduct = async (req, res) => {
    try {
        const { id, name, category_id } = req.query;
        const whereClause = {
            ...(id && { id: parseInt(id) }),
            ...(name && { name: { [Op.like]: `%${name.trim()}%` } }),
            ...(category_id && { category_id: parseInt(category_id) })
        };

        const products = await Product.findAll({
            where: whereClause,
            include: [
                {
                    model: Category,
                    attributes: ['id', 'name']
                },
                {
                    model: ProductImage,
                    attributes: ['id', 'image_url', 'is_primary'],
                    order: [['is_primary', 'DESC']]
                },
                {
                    model: ProductInventory,
                    include: [
                        { model: Color, attributes: ['id', 'name'] },
                        { model: AgeRange, attributes: ['id', 'min_value', 'max_value', 'unit'] }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        if (!products.length) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'No products found'
            });
        }

        const formattedProducts = products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            description: p.description,
            category: p.Category && { id: p.Category.id, name: p.Category.name },
            images: p.ProductImages?.map(img => ({
                id: img.id,
                url: img.image_url,
                is_primary: img.is_primary
            })),
            inventory: p.ProductInventories?.map(inv => ({
                id: inv.id,
                quantity: inv.quantity,
                color: inv.Color && { id: inv.Color.id, name: inv.Color.name },
                age_range: inv.AgeRange && {
                    id: inv.AgeRange.id,
                    min: inv.AgeRange.min_value,
                    max: inv.AgeRange.max_value,
                    unit: inv.AgeRange.unit
                },
                created_at: inv.created_at
            })),
            created_at: p.created_at
        }));

        return res.json({
            success: true,
            count: products.length,
            data: formattedProducts
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};


const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const product = await Product.findOne({
            where: { id },
            include: [
                {
                    model: Category,
                    attributes: ['id', 'name']
                },
                {
                    model: ProductImage,
                    attributes: ['id', 'image_url', 'is_primary'],
                    order: [['is_primary', 'DESC']]
                },
                {
                    model: ProductInventory,
                    include: [
                        { model: Color, attributes: ['id', 'name'] },
                        { model: AgeRange, attributes: ['id', 'min_value', 'max_value', 'unit'] }
                    ]
                }
            ]
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Product not found'
            });
        }

        const formattedProduct = {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            category: product.Category && { id: product.Category.id, name: product.Category.name },
            images: product.ProductImages?.map(img => ({
                id: img.id,
                url: img.image_url,
                is_primary: img.is_primary
            })),
            inventory: product.ProductInventories?.map(inv => ({
                id: inv.id,
                quantity: inv.quantity,
                color: inv.Color && { id: inv.Color.id, name: inv.Color.name },
                age_range: inv.AgeRange && {
                    id: inv.AgeRange.id,
                    min: inv.AgeRange.min_value,
                    max: inv.AgeRange.max_value,
                    unit: inv.AgeRange.unit
                },
                created_at: inv.created_at
            })),
            created_at: product.created_at
        };

        return res.json({
            success: true,
            data: formattedProduct
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};


// edit product's info
const editProduct = async (req, res) => {
    const { id } = req.params;
    const { name, price, description, category_id, inventory = [], images = [] } = req.body;
    const uploadedImage = req.file ? {
        url: `http://localhost:5000/uploads/product/${req.file.filename}`,
        is_primary: true
    } : null;

    try {
        const transaction = await sequelize.transaction();

        try {
            // Search for the product and make sure it is available
            const product = await Product.findByPk(id, {
                include: [
                    { model: ProductImage },
                    {
                        model: ProductInventory,
                        include: [AgeRange]
                    }
                ],
                transaction
            });

            if (!product) {
                await transaction.rollback();
                if (req.file) fs.unlinkSync(path.join(__dirname, '../public/uploads/product', req.file.filename));
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
                });
            }

            // Update basic product data (only submitted fields)
            const updateData = {};
            if (name) updateData.name = name.trim();
            if (price !== undefined) updateData.price = price;
            if (description !== undefined) updateData.description = description?.trim();
            if (category_id) updateData.category_id = category_id;

            if (Object.keys(updateData).length > 0) {
                await product.update(updateData, { transaction });
            }

            // Image processing
            if (uploadedImage || images.length > 0) {
                const imagesToCreate = [];

                // If there is an image uploaded, we put it as the primary one
                if (uploadedImage) {
                    imagesToCreate.push({
                        product_id: id,
                        image_url: uploadedImage.url,
                        is_primary: true
                    });
                }

                // Additional image processing
                let hasPrimary = Boolean(uploadedImage);
                images.forEach(image => {
                    if (image?.url) {
                        const isPrimary = !hasPrimary && (image.is_primary || false);
                        imagesToCreate.push({
                            product_id: id,
                            image_url: image.url,
                            is_primary: isPrimary
                        });
                        if (isPrimary) hasPrimary = true;
                    }
                });

                // Delete old photos only if there are new photos.
                await ProductImage.destroy({ where: { product_id: id }, transaction });

                // Create new images
                if (imagesToCreate.length > 0) {
                    await ProductImage.bulkCreate(imagesToCreate, { transaction });
                }
            }

            // inventory & age ranges processing
            if (inventory.length > 0) {
                // delete old inventory
                await ProductInventory.destroy({ where: { product_id: id }, transaction });

                // Process each inventory item
                for (const item of inventory) {
                    // If there are age ranges
                    if (item.age_ranges?.length > 0) {
                        for (const ageRange of item.age_ranges) {
                            // Find or create an age range
                            const [createdAgeRange] = await AgeRange.findOrCreate({
                                where: {
                                    min_value: ageRange.min_value || 0,
                                    max_value: ageRange.max_value,
                                    unit: ageRange.unit || 'years'
                                },
                                transaction
                            });

                            // Create an inventory record for this age range
                            await ProductInventory.create({
                                product_id: id,
                                color_id: item.color_id,
                                age_range_id: createdAgeRange.id,
                                quantity: item.quantity || 0
                            }, { transaction });
                        }
                    } else {
                        // if there are no age ranges
                        await ProductInventory.create({
                            product_id: id,
                            color_id: item.color_id,
                            age_range_id: null,
                            quantity: item.quantity || 0
                        }, { transaction });
                    }
                }
            }

            await transaction.commit();

            // Fetch updated data for return
            const updatedProduct = await Product.findByPk(id, {
                include: [
                    { model: ProductImage },
                    {
                        model: ProductInventory,
                        include: [
                            { model: Color },
                            { model: AgeRange }
                        ]
                    }
                ]
            });

            return res.json({
                success: true,
                message: 'Product updated successfully!',
                product: updatedProduct
            });

        } catch (error) {
            await transaction.rollback();
            if (req.file) {
                const filePath = path.join(__dirname, '../public/uploads/product', req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            console.error('Error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};


// reduce the quantity of the product by 1 and if it runs out, it will be deleted from db.
const decreaseQuantity = async (req, res) => {
    const { product_id, color_id, age_range_id } = req.params;

    try {
        const transaction = await sequelize.transaction(); // start transaction

        try {
            // create a search condition
            const whereCondition = {
                product_id,
                color_id,
                [Op.or]: [
                    { age_range_id: age_range_id || null },
                    { age_range_id: null }
                ]
            };

            // find the inventory record
            const inventory = await ProductInventory.findOne({
                where: whereCondition,
                order: [
                    ['age_range_id', age_range_id ? 'DESC' : 'ASC']
                ],
                transaction
            });

            // Check if the record exists
            if (!inventory) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Inventory not found',
                    message: 'No inventory record found for this product and color combination'
                });
            }

            // Check that the quantity is sufficient
            if (inventory.quantity <= 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Out of stock',
                    message: 'This product variation is already out of stock'
                });
            }

            // Store the age_range_id before potentially deleting the inventory
            const currentAgeRangeId = inventory.age_range_id;

            // Decrease quantity by 1
            const newQuantity = inventory.quantity - 1;
            await inventory.update({ quantity: newQuantity }, { transaction });

            // delete the stock record if the quantity becomes 0
            if (newQuantity === 0) {
                await inventory.destroy({ transaction });

                // Check if this is the last stock record for the product
                const remainingInventory = await ProductInventory.findAll({
                    where: { product_id },
                    transaction
                });

                // If the product is no longer in stock, delete associated images and product
                if (remainingInventory.length === 0) {
                    const product = await Product.findByPk(product_id, {
                        include: [ProductImage],
                        transaction
                    });

                    if (product) {
                        const deleteImagePromises = product.ProductImages.map(image => {
                            const filename = image.image_url.split('/').pop();
                            const filePath = path.join(__dirname, '../public/uploads/product', filename);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                            return image.destroy({ transaction });
                        });

                        await Promise.all(deleteImagePromises);
                        await product.destroy({ transaction });
                    }
                }

                // Check if there are ANY products left in the entire inventory with this age_range_id
                if (currentAgeRangeId) {
                    const anyInventoryWithThisAgeRange = await ProductInventory.findOne({
                        where: { age_range_id: currentAgeRangeId },
                        transaction
                    });

                    // If no products exist with this age range anywhere in the inventory
                    if (!anyInventoryWithThisAgeRange) {
                        await AgeRange.destroy({
                            where: { id: currentAgeRangeId },
                            transaction
                        });
                    }
                }
            }

            await transaction.commit(); // commit transaction

            return res.json({
                success: true,
                message: 'Quantity decreased successfully!',
                remainingQuantity: newQuantity,
                status: newQuantity === 0 ? 'Item removed from inventory' : 'Item updated'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Transaction error:', error);
            return res.status(500).json({
                success: false,
                error: 'Transaction failed',
                message: error.message
            });
        }
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};


// delete a product
const deleteProduct = async (req, res) => {
    const { id } = req.params;

    try {
        const transaction = await sequelize.transaction();

        try {
            const product = await Product.findByPk(id, {
                include: [
                    {
                        model: ProductImage,
                        attributes: ['id', 'image_url']
                    },
                    {
                        model: ProductInventory,
                        attributes: ['id', 'age_range_id']
                    }
                ],
                transaction
            });

            if (!product) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: `Product with ID ${id} not found`
                });
            }

            const ageRangeIds = [...new Set(
                product.ProductInventories
                    .map(inv => inv.age_range_id)
                    .filter(id => id !== null)
            )];

            await ProductImage.destroy({ where: { product_id: id }, transaction });
            await ProductInventory.destroy({ where: { product_id: id }, transaction });

            if (ageRangeIds.length > 0) {
                await AgeRange.destroy({
                    where: { id: ageRangeIds },
                    transaction
                });
            }

            product.ProductImages?.forEach(image => {
                if (image.image_url.includes('/uploads/product/')) {
                    const filePath = path.join(__dirname, '../public/uploads/product', image.image_url.split('/').pop());
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            });

            await product.destroy({ transaction });

            await transaction.commit();

            return res.json({
                success: true,
                message: `Product ${id} and its related age ranges deleted successfully!`
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete product'
            });
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export {
    addProduct,
    getAllProducts,
    getProduct,
    getProductById,
    editProduct,
    decreaseQuantity,
    deleteProduct
};