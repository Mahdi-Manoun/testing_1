import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(10, 2)
    },
    description: {
        type: DataTypes.TEXT,
    },
    category_id: {
        type: DataTypes.INTEGER,
    }
}, {
    tableName: 'products',
    timestamps: true,
    underscored: true,
});

export default Product;