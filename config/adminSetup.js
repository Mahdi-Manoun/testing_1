import Admin from '../models/admin.model.js';

const createAdmin = async () => {
    try {
        const count = await Admin.count();

        if (count === 0) {
            const password = 'swc_admin_123!';
            await Admin.create({
                username: 'sweet_cuddles_admin',
                password: password
            });

            console.log('Admin account created successfully!');
            console.log({ username: 'sweet_cuddles_admin', password: password });
        } else {
            const admin = await Admin.findOne();
            console.log('Admin already exists:', admin.username);
        }
    } catch (error) {
        console.error('Failed to create admin:', error);
    }
};

export default createAdmin;