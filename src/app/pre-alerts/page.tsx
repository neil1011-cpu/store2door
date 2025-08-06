'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { generateDeliveryAddress, type GenerateDeliveryAddressOutput } from '@/ai/flows/generate-delivery-address-from-receipt';
import Image from 'next/image';
import { Upload, Loader2, Wand2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PreAlertsPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateDeliveryAddressOutput | null>(null);

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
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select an image of a receipt to continue.',
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
        const photoDataUri = reader.result as string;
        const response = await generateDeliveryAddress({ photoDataUri });
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
        <h1 className="text-3xl font-bold tracking-tight">AI Pre-Alerts</h1>
        <p className="text-muted-foreground">
          Upload a receipt or delivery slip to automatically extract the delivery address.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Upload Receipt</CardTitle>
            <CardDescription>Select an image file (PNG, JPG) of the receipt.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center justify-center w-full">
                <label
                  htmlFor="dropzone-file"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors"
                >
                  {preview ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={preview}
                        alt="Receipt preview"
                        layout="fill"
                        objectFit="contain"
                        className="rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, or GIF</p>
                    </div>
                  )}
                  <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" />
                </label>
              </div>

              <Button type="submit" disabled={loading || !file} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Address
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Suggested Address</CardTitle>
            <CardDescription>The AI-suggested delivery address will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[356px]">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Extracting address from image...</p>
              </div>
            ) : result ? (
              <div className="w-full space-y-4">
                 <Badge variant="outline" className="text-sm">
                  <Wand2 className="mr-2 h-4 w-4 text-accent" />
                  AI Generated
                </Badge>
                <p className="p-4 border rounded-md bg-muted text-lg font-mono">
                  {result.suggestedDeliveryAddress}
                </p>
                 <Button variant="default" className="w-full">
                    Confirm and Use Address <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>Upload a receipt to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
