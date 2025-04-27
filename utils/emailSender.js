import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create Transporter
const createTransporter = (user, pass) => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

// function to send message to email
export const sendEmailFrom = async ({ fromEmail, fromPassword, fromName = process.env.COMP_NAME, ...mailOptions }) => {
    const transporter = createTransporter(fromEmail, fromPassword);

    const fullOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        ...mailOptions
    };

    try {
        const info = await transporter.sendMail(fullOptions);
        console.log(`Email sent from ${fromEmail}:`, info.messageId);
        return info;
    } catch (error) {
        console.error(`Error sending from ${fromEmail}:`, error);
        throw error;
    }
};