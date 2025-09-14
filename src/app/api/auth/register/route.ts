
import { NextResponse } from 'next/server';
import { z } from 'zod';

// This is a mock user store. In a real application, you would use a database.
const users: any[] = [];
if (typeof localStorage !== 'undefined') {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
        users.push(...JSON.parse(storedUsers));
    }
}

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
    const mailboxNumber = `FSTD${Math.floor(1000 + Math.random() * 9000)}`;
    const address = {
      address1: '4350 NE 5th Terrace Bay #3',
      address2: `${mailboxNumber} -FSTD`,
      city: 'Oakland Park',
      state: 'Florida',
      zip: '33334',
    };

    const newUser = {
        id: (users.length + 1).toString(),
        fullName,
        email,
        password, // In a real app, you would hash this password
        phone,
        trn,
        mailboxNumber,
        address
    };

    users.push(newUser);
    
    // In a real app, this would persist to a database. 
    // localStorage is not available in this server context, but this simulates the update.
    // In a real setup, you'd have a database driver call here.
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('users', JSON.stringify(users));
    }

    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
