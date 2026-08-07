import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminField } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

/**
 * @fileOverview Secure administrative password reset endpoint with SMTP fallback.
 */

async function getSafeBody(request: Request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

export async function POST(request: Request) {
    try {
        const body = await getSafeBody(request);
        const { userId, newPassword } = body;

        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Authorization required.' }, { status: 401 });
        }
        const idToken = authHeader.substring(7);

        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (tokenErr: any) {
            return NextResponse.json({ message: 'Session expired or invalid.' }, { status: 401 });
        }

        const adminUid = decodedToken.uid;
        const isAdminEmail = decodedToken.email === 'admin@neilussolutions.com';
        const adminRoleDoc = await adminDb.collection('admin_roles').doc(adminUid).get();
        
        if (!adminRoleDoc.exists && !isAdminEmail) {
            return NextResponse.json({ message: 'Access Denied.' }, { status: 403 });
        }
        
        if (!userId || !newPassword || newPassword.length < 6) {
            return NextResponse.json({ message: 'Invalid payload. Password must be 6+ chars.' }, { status: 400 });
        }

        let userRecord;
        try {
            userRecord = await adminAuth.getUser(userId);
        } catch (fetchErr: any) {
            return NextResponse.json({ message: 'User not found.' }, { status: 404 });
        }

        const userProfileSnap = await adminDb.collection('users').doc(userId).get();
        const userProfile = userProfileSnap.exists ? userProfileSnap.data() : null;
        const recipientName = userProfile?.fullName || userRecord.displayName || 'Valued Customer';
        const recipientEmail = userRecord.email;

        if (!recipientEmail) {
             return NextResponse.json({ message: 'User email not found.' }, { status: 404 });
        }

        await adminAuth.updateUser(userId, { password: newPassword });

        await adminDb.collection('users').doc(userId).update({
            needsPasswordReset: true,
            updatedAt: adminField.serverTimestamp()
        }).catch(() => {});

        // Resolve Credentials (ENV -> Firestore)
        let host = process.env.SMTP_HOST;
        let port = process.env.SMTP_PORT;
        let user = process.env.SMTP_USER;
        let pass = process.env.SMTP_PASS;

        if (!host || !port || !user || !pass || pass.includes('xxxx')) {
            const configSnap = await adminDb.collection('metadata').doc('email_config').get();
            if (configSnap.exists) {
                const data = configSnap.data();
                host = data?.host || host;
                port = data?.port || port;
                user = data?.user || user;
                pass = data?.pass || pass;
            }
        }

        const subject = 'Your Secure Access Key Has Been Updated';
        const emailBody = `Hi ${recipientName},\n\nYour administrator has updated your secure access key.\n\nYour new credentials are:\nEmail: ${recipientEmail}\nNew Password: ${newPassword}\n\nPlease sign in to update your password.`;

        const logEmail = async (status: 'sent' | 'simulated' | 'failed', error?: string) => {
            await adminDb.collection('sent_emails').add({
                recipientName, recipientEmail, subject, body: emailBody, status, error: error || null, sentAt: adminField.serverTimestamp(),
            }).catch(() => {});
        };

        if (!host || !port || !user || !pass || pass.includes('xxxx')) {
            await logEmail('simulated');
            return NextResponse.json({ success: true, simulated: true });
        }

        try {
            const transporter = nodemailer.createTransport({
                host: host, port: Number(port), secure: Number(port) === 465,
                auth: { user: user, pass: pass }, tls: { rejectUnauthorized: false }
            });

            await transporter.sendMail({
                from: `"FromStore2Door Global" <${user}>`,
                to: recipientEmail, subject: subject, text: emailBody,
            });

            await logEmail('sent');
            return NextResponse.json({ success: true });
        } catch (mailErr: any) {
            await logEmail('failed', mailErr.message);
            return NextResponse.json({ success: true, emailError: mailErr.message });
        }

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
