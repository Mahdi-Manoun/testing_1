import sequelize from '../config/db.js';
import AgeRange from './ageRange.model.js';
import Category from './category.model.js';
import Color from './color.model.js';
import Customer from './customer.model.js';
import Product from './product.model.js';
import ProductImage from './productImage.model.js';
import ProductInventory from './productInventory.model.js';
import Sale from './sale.model.js';

// relationships
Product.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(Product, { foreignKey: 'category_id' });

Product.hasMany(ProductImage, { foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

Product.hasMany(ProductInventory, { foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductInventory.belongsTo(Product, { foreignKey: 'product_id' });

Color.hasMany(ProductInventory, { foreignKey: 'color_id' });
ProductInventory.belongsTo(Color, { foreignKey: 'color_id' });

AgeRange.hasMany(ProductInventory, { foreignKey: 'age_range_id' });
ProductInventory.belongsTo(AgeRange, { foreignKey: 'age_range_id' });

ProductInventory.hasMany(Sale, { foreignKey: 'inventory_id' });
Sale.belongsTo(ProductInventory, { foreignKey: 'inventory_id' });

Customer.hasOne(Sale, { foreignKey: 'customer_id' });
Sale.belongsTo(Customer, { foreignKey: 'customer_id' });

// sync db
export const syncDatabase = async () => {
    try {
        await sequelize.authenticate()
        console.log('Connection established successfully!');

        await sequelize.sync({ alter: true, force: false }); // sync tables
        console.log('Database & tables created!');
    } catch (error) {
        console.error('Error syncing database:', error);
    }
};

export { sequelize, Category, Product, ProductImage, ProductInventory, Color };