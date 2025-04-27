import Admin from '../models/admin.model.js';
import jwt from 'jsonwebtoken';

const createToken = (id) => {
    if (!process.env.JWT_SECRET_KEY) {
        throw new Error('JWT secret key is missing');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
};

const loginAdmin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Username and password are required'
        });
    }

    try {
        const admin = await Admin.login(username, password);
        const token = createToken(admin.id);

        const adminData = {
            id: admin.id,
            username: admin.username
        };

        return res.json({
            success: true,
            data: {
                admin: adminData,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(401).json({
            success: false,
            error: error.message
        });
    }
};

export default loginAdmin;