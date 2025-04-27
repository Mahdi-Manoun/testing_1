import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.ENUM(
            'Special prices',
            'Cotton overalls and sets',
            'Wool Fleece and velvet overalls',
            'Baby boy',
            'Baby girls',
            'Boys',
            'Girls',
            'Blankets',
            'Bath towels',
            'Cotton Underwears',
            'Bibs',
            'Baby shoes',
            'Socks and tights',
            'Baby gadgets toys',
            'Others'
        ),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'categories',
    timestamps: false,
    underscored: true,
});

export default Category;