'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { generateCustomsForm, type GenerateCustomsFormOutput } from '@/ai/flows/generate-customs-form';
import Image from 'next/image';
import { Upload, Loader2, Wand2, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function PreAlertsPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateCustomsFormOutput | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');


  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setResult(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !trackingNumber || !description || !weight) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out all fields and upload an invoice.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const invoiceDataUri = reader.result as string;
        const response = await generateCustomsForm({ 
          invoiceDataUri,
          trackingNumber,
          contentsDescription: description,
          weight,
        });
        setResult(response);
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        toast({
          title: 'File Read Error',
          description: 'Could not read the selected file.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'An error occurred',
        description: (error as Error)?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pre-Alerts</h1>
        <p className="text-muted-foreground">
          Shippers in Florida can submit their package details here.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Submit Package Information</CardTitle>
            <CardDescription>Fill in the details and upload the commercial invoice.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
               <div className="space-y-2">
                <Label htmlFor="trackingNumber">Tracking Number (e.g., JM123)</Label>
                <Input id="trackingNumber" placeholder="JMXXX" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="description">Contents Description</Label>
                <Textarea id="description" placeholder="e.g., Electronics, clothes" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input id="weight" type="number" placeholder="e.g., 5.5" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Commercial Invoice</Label>
                <div className="flex flex-col items-center justify-center w-full">
                  <label
                    htmlFor="dropzone-file"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors"
                  >
                    {preview ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={preview}
                          alt="Invoice preview"
                          layout="fill"
                          objectFit="contain"
                          className="rounded-lg p-2"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, or PDF</p>
                      </div>
                    )}
                    <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, application/pdf" />
                  </label>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Documents...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Submit Pre-Alert
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Generated Documents</CardTitle>
            <CardDescription>Customs forms and warehouse tickets will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[500px]">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Processing information...</p>
              </div>
            ) : result ? (
              <div className="w-full space-y-4 text-sm">
                <div className="space-y-2 rounded-lg border bg-muted p-4">
                    <h3 className="font-semibold text-base">Jamaica Customs Form</h3>
                    <p>
                      <span className="font-medium text-muted-foreground">Tracking #:</span> {result.customsForm.trackingNumber}
                    </p>
                     <p>
                      <span className="font-medium text-muted-foreground">Contents:</span> {result.customsForm.contentsDescription}
                    </p>
                     <p>
                      <span className="font-medium text-muted-foreground">Weight:</span> {result.customsForm.weight} lbs
                    </p>
                     <p>
                      <span className="font-medium text-muted-foreground">Sender:</span> {result.customsForm.sender}
                    </p>
                     <p>
                      <span className="font-medium text-muted-foreground">Recipient:</span> {result.customsForm.recipient}
                    </p>
                </div>
                 <div className="space-y-2 rounded-lg border bg-muted p-4">
                    <h3 className="font-semibold text-base">Warehouse Intake Ticket</h3>
                    <p><span className="font-medium text-muted-foreground">Ticket ID:</span> {result.warehouseTicket.ticketId}</p>
                    <p><span className="font-medium text-muted-foreground">Tracking #:</span> {result.warehouseTicket.trackingNumber}</p>
                    <p><span className="font-medium text-muted-foreground">Status:</span> <span className="font-mono bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">{result.warehouseTicket.status}</span></p>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground flex flex-col items-center gap-4">
                <FileText className="w-12 h-12" />
                <p>Submit a pre-alert to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
