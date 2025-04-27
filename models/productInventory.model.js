import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProductInventory = sequelize.define('ProductInventory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    color_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    age_range_id: {
        type: DataTypes.INTEGER,
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    }
}, {
    tableName: 'product_inventory',
    timestamps: true,
    underscored: true,
});

export default ProductInventory;