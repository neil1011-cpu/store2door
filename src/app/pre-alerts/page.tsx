
'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateCustomsForm } from '@/ai/flows/generate-customs-form';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const PreAlertFormSchema = z.object({
  trackingNumber: z.string().regex(/^JM\d{3,}/, "Tracking number must be in JMXXX format."),
  contentsDescription: z.string().min(1, "Contents description is required."),
  weight: z.string().min(1, "Weight is required."),
  invoice: z.any().refine(
    (file) => file instanceof File, "Invoice file is required."
  ).refine(
    (file) => ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type),
    "Only JPEG, PNG, or PDF files are allowed."
  ),
});

type PreAlertFormValues = z.infer<typeof PreAlertFormSchema>;

type GeneratedDocs = {
  customsForm: {
    trackingNumber: string;
    contentsDescription: string;
    weight: string;
    sender: string;
    recipient: string;
  };
  warehouseTicket: {
    ticketId: string;
    trackingNumber: string;
    status: string;
  };
}

export default function PreAlertsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocs | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PreAlertFormValues>({
    resolver: zodResolver(PreAlertFormSchema),
  });

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  }

  const onSubmit = async (data: PreAlertFormValues) => {
    setIsLoading(true);
    setGeneratedDocs(null);
    try {
      const invoiceDataUri = await fileToDataUri(data.invoice);
      const result = await generateCustomsForm({
        trackingNumber: data.trackingNumber,
        contentsDescription: data.contentsDescription,
        weight: data.weight,
        invoiceDataUri: invoiceDataUri,
      });
      setGeneratedDocs(result);
      toast({
        title: 'Documents Generated Successfully',
        description: 'Customs form and warehouse ticket have been created.',
      });
      reset();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error Generating Documents',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Pre-Alerts</h1>
        <p className="text-muted-foreground">
          Generate customs forms and warehouse tickets from shipper input.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Pre-Alert</CardTitle>
            <CardDescription>
              Fill out the form to generate shipping documents.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Controller
                  name="trackingNumber"
                  control={control}
                  defaultValue=""
                  render={({ field }) => <Input id="trackingNumber" {...field} placeholder="JM123" />}
                />
                {errors.trackingNumber && <p className="text-sm text-destructive">{errors.trackingNumber.message}</p>}
              </div>
              <div>
                <Label htmlFor="contentsDescription">Contents Description</Label>
                <Controller
                  name="contentsDescription"
                  control={control}
                  defaultValue=""
                  render={({ field }) => <Textarea id="contentsDescription" {...field} placeholder="e.g., Electronics, clothing" />}
                />
                 {errors.contentsDescription && <p className="text-sm text-destructive">{errors.contentsDescription.message}</p>}
              </div>
              <div>
                <Label htmlFor="weight">Weight</Label>
                <Controller
                  name="weight"
                  control={control}
                  defaultValue=""
                  render={({ field }) => <Input id="weight" {...field} placeholder="e.g., 5.2 lbs" />}
                />
                {errors.weight && <p className="text-sm text-destructive">{errors.weight.message}</p>}
              </div>
               <div>
                <Label htmlFor="invoice">Commercial Invoice</Label>
                <Controller
                    name="invoice"
                    control={control}
                    render={({ field: { onChange, value, ...rest } }) => (
                        <Input
                            id="invoice"
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    onChange(file);
                                }
                            }}
                            {...rest}
                        />
                    )}
                />
                {errors.invoice && <p className="text-sm text-destructive">{typeof errors.invoice.message === 'string' ? errors.invoice.message : "Invalid file"}</p>}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Documents
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Generated Documents</CardTitle>
                <CardDescription>
                Review the generated customs form and warehouse ticket.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 {generatedDocs ? (
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-lg">Jamaica Customs Form</h3>
                             <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Tracking #</TableCell>
                                        <TableCell>{generatedDocs.customsForm.trackingNumber}</TableCell>
                                    </TableRow>
                                     <TableRow>
                                        <TableCell className="font-medium">Sender</TableCell>
                                        <TableCell>{generatedDocs.customsForm.sender}</TableCell>
                                    </TableRow>
                                     <TableRow>
                                        <TableCell className="font-medium">Recipient</TableCell>
                                        <TableCell>{generatedDocs.customsForm.recipient}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Contents</TableCell>
                                        <TableCell>{generatedDocs.customsForm.contentsDescription}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Weight</TableCell>
                                        <TableCell>{generatedDocs.customsForm.weight}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg">Warehouse Intake Ticket</h3>
                             <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Ticket ID</TableCell>
                                        <TableCell><Badge variant="outline">{generatedDocs.warehouseTicket.ticketId}</Badge></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Tracking #</TableCell>
                                        <TableCell>{generatedDocs.warehouseTicket.trackingNumber}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Status</TableCell>
                                        <TableCell><Badge>{generatedDocs.warehouseTicket.status}</Badge></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-md">
                        <p className="text-sm text-muted-foreground">
                            {isLoading ? 'Generating documents...' : 'Documents will appear here after generation.'}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    