import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from './logger';

export class EmailService {
    private static transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
    });

    static async sendCredentialsEmail(email: string, password: string, name: string, type: 'user' | 'hotel') {
        const subject = `Welcome to Mend - Your ${type === 'hotel' ? 'Hotel' : 'User'} Credentials`;
        const html = `
            <h1>Welcome to Mend, ${name}!</h1>
            <p>Your registration was successful. Below are your login credentials:</p>
            <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Password:</strong> ${password}</li>
            </ul>
            <p>Please login and change your password as soon as possible.</p>
            <p>Best Regards,<br/>The Mend Team</p>
        `;

        try {
            const info = await this.transporter.sendMail({
                from: env.FROM_EMAIL,
                to: email,
                subject: subject,
                html: html,
            });
            logger.info(`Email sent: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error(`Error sending email to ${email}:`, error);
            return false;
        }
    }

    /**
     * Generic alert email — used by the wellbeing fatigue alert dispatcher (FR18)
     * and any future alert-type notifications.
     */
    static async sendAlertEmail(
        email:   string,
        subject: string,
        html:    string
    ): Promise<boolean> {
        try {
            const info = await this.transporter.sendMail({
                from:    env.FROM_EMAIL,
                to:      email,
                subject,
                html,
            });
            logger.info(`Alert email sent: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error(`Error sending alert email to ${email}:`, error);
            return false;
        }
    }
}
