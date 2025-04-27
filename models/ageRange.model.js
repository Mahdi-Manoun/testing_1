import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AgeRange = sequelize.define('AgeRange', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    min_value: {
        type: DataTypes.INTEGER
    },
    max_value: {
        type: DataTypes.INTEGER,
    },
    unit: {
        type: DataTypes.ENUM('months', 'years'),
        defaultValue: 'years',
    }
}, {
    tableName: 'age_ranges',
    timestamps: false,
    underscored: true,
});

export default AgeRange;