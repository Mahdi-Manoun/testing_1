import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProductImage = sequelize.define('ProductImage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    image_url: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    is_primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
}, {
    tableName: 'product_images',
    timestamps: false,
    underscored: true,
});

export default ProductImage;