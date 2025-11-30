
'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import type { UserProfile, Shipment, DropoffAddress, PickupPerson } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Mail, Phone, Home, Trash2, Package } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const getStatusVariant = (status: Shipment['status']) => {
  switch (status) {
    case 'In Transit': return 'default';
    case 'Customs': return 'secondary';
    case 'Delivered': return 'outline';
    case 'Pending': return 'destructive';
    case 'Processed': return 'secondary';
    default: return 'default';
  }
};


export default function UserDetailsPage() {
    const params = useParams();
    const userId = params.userId as string;
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const shipmentsQuery = useMemoFirebase(() => userId ? query(collection(firestore, 'users', userId, 'shipments'), orderBy('date', 'desc')) : null, [firestore, userId]);
    const { data: userShipments, isLoading: isShipmentsLoading } = useCollection<Shipment>(shipmentsQuery);

    const isLoading = isProfileLoading || isShipmentsLoading;
    
    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!userProfile) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">User Not Found</h1>
                <p className="text-muted-foreground">Could not find a user with the specified ID.</p>
                 <Button variant="outline" asChild className="mt-4">
                    <Link href="/admin/users">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
                    </Link>
                </Button>
            </div>
        );
    }

    const pickupPersonnel = userProfile.pickupPersonnel || [];
    const dropoffAddresses = userProfile.dropoffAddresses || [];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
                    <p className="text-muted-foreground">
                       Viewing account for {userProfile.fullName}.
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/admin/users">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Users
                    </Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <Card>
                        <CardHeader className="items-center">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userProfile.fullName}`} />
                                <AvatarFallback>{userProfile.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <CardTitle className="text-2xl pt-2">{userProfile.fullName}</CardTitle>
                            <CardDescription>Mailbox #: {userProfile.mailboxNumber}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                             <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span>{userProfile.email}</span>
                            </div>
                             <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>{userProfile.phone}</span>
                            </div>
                             <div>
                                <span className="font-semibold">TRN:</span> {userProfile.trn}
                            </div>
                             <div>
                                <span className="font-semibold">Member Since:</span> {userProfile.createdAt ? new Date(userProfile.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                            </div>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">US Shipping Address</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 font-mono text-sm">
                            <p>{userProfile.address.address1}</p>
                            <p className="font-bold">{userProfile.address.address2}</p>
                            <p>{userProfile.address.city}, {userProfile.address.state} {userProfile.zip}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Shipments</CardTitle>
                            <CardDescription>A list of this user's recent packages.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Tracking #</TableHead>
                                    <TableHead>Contents</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {userShipments && userShipments.length > 0 ? (
                                        userShipments.map((shipment) => (
                                        <TableRow key={shipment.id}>
                                            <TableCell className="font-mono">{shipment.trackingNumber}</TableCell>
                                            <TableCell>{shipment.contents}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(shipment.status)}>{shipment.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {shipment.cost ? `$${shipment.cost.toFixed(2)}` : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">This user has no shipments.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Drop-off Addresses (Jamaica)</CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-3">
                             {dropoffAddresses.length === 0 ? (
                                <div className="text-center text-muted-foreground p-4">
                                    <p>No drop-off addresses added yet.</p>
                                </div>
                             ) : (
                                 dropoffAddresses.map(addr => (
                                    <div key={addr.id} className="flex items-center justify-between p-3 border rounded-md">
                                        <div className="flex items-center gap-4">
                                            <Home className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-semibold">{addr.name}</p>
                                                <p className="text-sm text-muted-foreground">{addr.address}, {addr.parish}</p>
                                            </div>
                                        </div>
                                    </div>
                                 ))
                             )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Authorized Pickup Personnel</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>ID Number</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pickupPersonnel.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-24">No pickup personnel added.</TableCell>
                                        </TableRow>
                                    ) : (
                                        pickupPersonnel.map(person => (
                                            <TableRow key={person.id}>
                                                <TableCell className="font-medium">{person.name}</TableCell>
                                                <TableCell>{person.idNumber}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    );
}

