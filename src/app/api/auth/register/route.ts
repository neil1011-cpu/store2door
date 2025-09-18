
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(10),
  trn: z.string().min(9).max(9),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.errors }, { status: 400 });
    }

    const { email, fullName, password, phone, trn } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a new US address and mailbox number.
    const lastUser = await prisma.user.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    const lastMailboxNum = lastUser ? parseInt(lastUser.mailboxNumber.replace('FSTD', ''), 10) : 1000;
    const nextMailboxNumber = `FSTD${lastMailboxNum + 1}`;
    
    const newUser = await prisma.user.create({
        data: {
            fullName,
            email,
            password: hashedPassword,
            phone,
            trn,
            mailboxNumber: nextMailboxNumber,
            address1: '4350 NE 5th Terrace Bay #3',
            address2: `${nextMailboxNumber} -FSTD`,
            city: 'Oakland Park',
            state: 'Florida',
            zip: '33334',
        }
    });
    
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
