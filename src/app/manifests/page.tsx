
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';

const initialManifests = [
  {
    flightNumber: 'SR-235',
    date: '2024-07-28',
    origin: 'JFK - New York',
    destination: 'LHR - London',
    status: 'Closed',
  },
  {
    flightNumber: 'SR-812',
    date: '2024-07-28',
    origin: 'LAX - Los Angeles',
    destination: 'HND - Tokyo',
    status: 'Closed',
  },
  {
    flightNumber: 'SR-451',
    date: '2024-07-29',
    origin: 'CDG - Paris',
    destination: 'DXB - Dubai',
    status: 'Open',
  },
  {
    flightNumber: 'SR-622',
    date: '2024-07-29',
    origin: 'SYD - Sydney',
    destination: 'SFO - San Francisco',
    status: 'Open',
  },
  {
    flightNumber: 'SR-303',
    date: '2024-07-30',
    origin: 'MIA - Miami',
    destination: 'GRU - São Paulo',
    status: 'Scheduled',
  },
];

type Manifest = {
  flightNumber: string;
  date: string;
  origin: string;
  destination: string;
  status: 'Open' | 'Closed' | 'Scheduled';
};

export default function ManifestsPage() {
  const [manifests, setManifests] = useState<Manifest[]>(initialManifests);
  const [open, setOpen] = useState(false);
  const [newManifest, setNewManifest] = useState<Omit<Manifest, 'flightNumber'>>({
    date: '',
    origin: '',
    destination: '',
    status: 'Scheduled',
  });
  const [flightNumber, setFlightNumber] = useState('');

  const handleCreateManifest = () => {
    if (!flightNumber) return;
    const manifestToAdd: Manifest = {
        flightNumber,
        ...newManifest,
    };
    setManifests([...manifests, manifestToAdd]);
    setOpen(false);
    setFlightNumber('');
    setNewManifest({
        date: '',
        origin: '',
        destination: '',
        status: 'Scheduled',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flight Manifests</h1>
          <p className="text-muted-foreground">
            View and manage flight manifest documents.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Manifest
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Create New Manifest</DialogTitle>
                <DialogDescription>
                    Enter the details for the new flight manifest.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="flightNumber" className="text-right">
                    Flight #
                    </Label>
                    <Input id="flightNumber" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right">
                    Date
                    </Label>
                    <Input id="date" type="date" value={newManifest.date} onChange={(e) => setNewManifest({...newManifest, date: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="origin" className="text-right">
                    Origin
                    </Label>
                    <Input id="origin" value={newManifest.origin} onChange={(e) => setNewManifest({...newManifest, origin: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="destination" className="text-right">
                    Destination
                    </Label>
                    <Input id="destination" value={newManifest.destination} onChange={(e) => setNewManifest({...newManifest, destination: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">
                    Status
                    </Label>
                    <Select
                    onValueChange={(value: Manifest['status']) => setNewManifest({...newManifest, status: value})}
                    defaultValue={newManifest.status}
                    >
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                </div>
                <DialogFooter>
                <Button type="submit" onClick={handleCreateManifest}>Save Manifest</Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Manifests</CardTitle>
          <CardDescription>
            A list of all recent flight manifests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flight #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manifests.map((manifest) => (
                <TableRow key={manifest.flightNumber}>
                  <TableCell className="font-medium">
                    {manifest.flightNumber}
                  </TableCell>
                  <TableCell>{manifest.date}</TableCell>
                  <TableCell>{manifest.origin}</TableCell>
                  <TableCell>{manifest.destination}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        manifest.status === 'Closed'
                          ? 'secondary'
                          : manifest.status === 'Open'
                          ? 'default'
                          : 'outline'
                      }
                      className={
                        manifest.status === 'Open'
                          ? 'bg-accent text-accent-foreground'
                          : ''
                      }
                    >
                      {manifest.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
