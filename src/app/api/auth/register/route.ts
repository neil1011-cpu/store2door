
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { users } from '@/lib/mock-data';
import type { User } from '@/lib/mock-data';

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
    if (users.find(u => u.email === email)) {
        return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
    }

    // Generate a new US address and mailbox number.
    const lastMailboxNum = users.length > 0 ? parseInt(users[users.length - 1].mailboxNumber.replace('FSTD', '')) : 100;
    const nextMailboxNumber = `FSTD${lastMailboxNum + 1}`;
    
    const newUser: User = {
        id: (users.length + 1).toString(),
        fullName,
        email,
        password, // In a real app, hash this!
        phone,
        trn,
        mailboxNumber: nextMailboxNumber,
        address: {
            address1: '4350 NE 5th Terrace Bay #3',
            address2: `${nextMailboxNumber} -FSTD`,
            city: 'Oakland Park',
            state: 'Florida',
            zip: '33334',
        }
    };
    
    users.push(newUser);
    
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
