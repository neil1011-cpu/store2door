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
import { MoreHorizontal } from 'lucide-react';

const manifests = [
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

export default function ManifestsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Flight Manifests</h1>
        <p className="text-muted-foreground">
          View and manage flight manifest documents.
        </p>
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
