import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Customer = sequelize.define('Customer', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Customer name is required.' },
            notEmpty: { msg: 'Customer name cannot be empty.' }
        }
    },
    email: {
        type: DataTypes.STRING,
        validate: {
            isEmail: { msg: 'Please provide a valid email address.' }
        }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'City is required.' }
        }
    },
    neighborhood: {
        type: DataTypes.STRING,
        allowNull: false
    },
    street: {
        type: DataTypes.STRING,
        allowNull: false
    },
    building: {
        type: DataTypes.STRING,
        allowNull: false
    },
    floor: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'customers',
    timestamps: true
});

export default Customer;