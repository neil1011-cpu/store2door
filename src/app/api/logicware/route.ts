import { NextResponse } from 'next/server';
import { fetchLogicwareShipments } from '@/lib/logicware';

/**
 * @fileOverview Logicware API bridge using the Connect SDK.
 */

export async function GET() {
  try {
    const data = await fetchLogicwareShipments();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[LOGICWARE API ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Logicware fetch failed',
      },
      { status: 500 }
    );
  }
}
