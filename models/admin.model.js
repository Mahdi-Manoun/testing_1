import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import bcrypt from 'bcrypt';

const Admin = sequelize.define('Admin', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        set(value) {
            this.setDataValue('username', value.trim());
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        set(value) {
            this.setDataValue('password', value);
        }
    }
}, {
    tableName: 'admins',
    timestamps: false,
    hooks: {
        beforeCreate: async (admin) => {
            if (admin.password) {
                const salt = await bcrypt.genSalt(10);
                admin.password = await bcrypt.hash(admin.password, salt);
            }
        },
        beforeUpdate: async (admin) => {
            if (admin.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                admin.password = await bcrypt.hash(admin.password, salt);
            }
        }
    }
});

// Improved login method
Admin.login = async function (username, password) {
    if (!username || !password) {
        throw new Error('All fields are required');
    }

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    const admin = await this.findOne({
        where: { username: cleanUsername }
    });

    if (!admin) {
        throw new Error('Incorrect username or password');
    }

    const isMatch = await bcrypt.compare(cleanPassword, admin.password);

    if (!isMatch) {
        throw new Error('Incorrect username or password');
    }

    return admin;
};

export default Admin;