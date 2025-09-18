
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SignJWT } from 'jose';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

    // Find the user in the database
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Don't include the password in the token payload or the response
    const { password: _, ...userWithoutPassword } = user;
    
    const tokenPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      mailboxNumber: user.mailboxNumber,
      address: {
        address1: user.address1,
        address2: user.address2,
        city: user.city,
        state: user.state,
        zip: user.zip,
      }
    };


    // Create the JWT
    const token = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h') // Token expires in 1 hour
      .sign(secret);

    return NextResponse.json({ user: tokenPayload, token });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
