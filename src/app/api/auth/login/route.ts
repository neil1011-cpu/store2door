
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { users } from '@/lib/mock-db';

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
