
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SignJWT } from 'jose';

// This is a mock user store. In a real application, you would query a database.
const users: any[] = [];
if (typeof localStorage !== 'undefined') {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
        users.push(...JSON.parse(storedUsers));
    }
} else {
    // Mock data for environments where localStorage is not available (e.g. server-side during build)
    users.push({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        phone: '1234567890',
        trn: '123456789',
        mailboxNumber: 'FSTD1234',
        address: {
            address1: '4350 NE 5th Terrace Bay #3',
            address2: 'FSTD1234 -FSTD',
            city: 'Oakland Park',
            state: 'Florida',
            zip: '33334',
        },
    });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// A secret key for signing the JWT. In a real app, load this from environment variables.
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-and-long-jwt-secret');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.errors }, { status: 400 });
    }

    const { email, password } = validation.data;

    // Find the user in our mock database
    const user = users.find((u) => u.email === email && u.password === password);

    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Don't include the password in the token payload or the response
    const { password: _, ...userWithoutPassword } = user;

    // Create the JWT
    const token = await new SignJWT(userWithoutPassword)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h') // Token expires in 1 hour
      .sign(secret);

    return NextResponse.json({ user: userWithoutPassword, token });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
