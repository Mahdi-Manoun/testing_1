import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Color = sequelize.define('Color', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.ENUM(
            'Red', 'Blue', 'Green', 'Yellow', 'Pink',
            'White', 'Black', 'Gray', 'Purple', 'Orange',
            'Brown', 'Gold', 'Silver'
        ),
        allowNull: false,
        unique: true
    },
}, {
    tableName: 'colors',
    timestamps: false,
});

export default Color;