
export type User = {
  id: string;
  fullName: string;
  email: string;
  password?: string; // Password should be optional and handled securely
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

// This is a mock database. In a real application, you would use a proper database.
export const users: User[] = [
    {
        id: '1',
        fullName: 'Alicia Keys',
        email: 'alicia@example.com',
        password: 'password123',
        phone: '876-555-0101',
        trn: '111222333',
        address: {
            address1: '4350 NE 5th Terrace Bay #3',
            address2: 'FSTD101 -FSTD',
            city: 'Oakland Park',
            state: 'Florida',
            zip: '33334',
        },
        mailboxNumber: 'FSTD101',
    },
    {
        id: '2',
        fullName: 'Bob Marley',
        email: 'bob@example.com',
        password: 'password123',
        phone: '876-555-0102',
        trn: '444555666',
        address: {
            address1: '4350 NE 5th Terrace Bay #3',
            address2: 'FSTD102 -FSTD',
            city: 'Oakland Park',
            state: 'Florida',
            zip: '33334',
        },
        mailboxNumber: 'FSTD102',
    }
];
