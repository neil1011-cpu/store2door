import { NextResponse } from 'next/server';
import { fetchLogicwareShipments } from '@/lib/logicware';

export async function GET() {
  try {
    const data =
      await fetchLogicwareShipments();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(
      '[LOGICWARE API ERROR]',
      error
    );

    return NextResponse.json(
      {
        message:
          error?.message ||
          'Failed to fetch Logicware data',
      },
      { status: 500 }
    );
  }
}
