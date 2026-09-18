import nodemailer from 'nodemailer';

export type EmailConfig = {
    host: string;
    port: string;
    user: string;
    pass: string;
    fromEmail: string;
    fromName: string;
};

/**
 * @fileOverview Server-side Email Service.
 * Authoritative source for app-level automated emails.
 */

export async function createTransporter(config: EmailConfig) {
    if (!config.host || !config.user || !config.pass) {
        throw new Error('SMTP Configuration incomplete.');
    }

    return nodemailer.createTransport({
        host: config.host,
        port: Number(config.port),
        secure: Number(config.port) === 465,
        auth: {
            user: config.user,
            pass: config.pass
        },
        tls: {
            rejectUnauthorized: false
        }
    });
}

export async function testSmtpConnection(config: EmailConfig) {
    try {
        const transporter = await createTransporter(config);
        await transporter.verify();
        return { success: true, message: 'SMTP Handshake Successful.' };
    } catch (error: any) {
        console.error('[SMTP_TEST_ERROR]', error);
        return { success: false, message: error.message };
    }
}

export async function sendAppEmail(config: EmailConfig, to: string | string[], subject: string, text: string) {
    const transporter = await createTransporter(config);
    return transporter.sendMail({
        from: `"${config.fromName || 'FromStore2Door'}" <${config.fromEmail || config.user}>`,
        to: Array.isArray(to) ? config.user : to,
        bcc: Array.isArray(to) ? to : undefined,
        subject,
        text
    });
}
