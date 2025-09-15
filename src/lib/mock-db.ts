// This is a mock database. In a real application, you would use a real database.

export type User = {
    id: string;
    fullName: string;
    email: string;
    password?: string;
    phone: string;
    trn: string;
    mailboxNumber: string;
    address: {
        address1: string;
        address2: string;
        city: string;
        state: string;
        zip: string;
    };
};


export const users: User[] = [
    {
        id: '0',
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
    }
];
