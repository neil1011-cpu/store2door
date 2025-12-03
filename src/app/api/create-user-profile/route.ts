
import 'dotenv/config';
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initAdminApp } from '@/firebase/admin';

// Initialize the Firebase Admin SDK.
// This call ensures the backend can securely communicate with Firebase services.
try {
  initAdminApp();
} catch (e: any) {
  console.error('API Route: Firebase Admin initialization failed.', e);
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, fullName, email, phone, trn } = body;

    // Validate required fields from the client
    if (!uid || !fullName || !email) {
      return NextResponse.json({ message: 'Missing required fields: uid, fullName, and email.' }, { status: 400 });
    }

    const db = getFirestore();
    
    // Get the count of existing users to generate a unique mailbox number
    const usersCollection = db.collection("users");
    const snapshot = await usersCollection.count().get();
    const userCount = snapshot.data().count;
    const mailboxNumber = `FSTD${101 + userCount}`;
    
    const userDocRef = db.collection('users').doc(uid);
    
    const newUserProfile = {
      id: uid,
      fullName,
      email,
      phone: phone || 'N/A',
      trn: trn || 'N/A',
      mailboxNumber,
      address: {
        address1: '4350 NE 5th Terrace Bay #3',
        address2: `${mailboxNumber} -FSTD`,
        city: 'Oakland Park',
        state: 'Florida',
        zip: '33334',
      },
      createdAt: Timestamp.now(),
      pickupPersonnel: [],
      dropoffAddresses: [],
    };

    // Use the Admin SDK to set the document, which bypasses client-side security rules.
    // This is the correct and secure way to create the user's profile document.
    await userDocRef.set(newUserProfile);

    // Return a success response with the new mailbox number
    return NextResponse.json({ message: 'User profile created successfully', mailboxNumber }, { status: 201 });

  } catch (error: any) {
    console.error('API Error: create-user-profile:', error);
    // Provide a clear error message if something goes wrong on the server
    return NextResponse.json({ message: 'An unexpected server error occurred while creating the user profile.', error: error.message }, { status: 500 });
  }
}
