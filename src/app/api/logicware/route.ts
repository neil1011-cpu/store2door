
import { NextResponse } from 'next/server';
import { fetchLogicwareShippers } from '@/lib/logicware';

/**
 * @fileOverview Logicware API bridge using the Connect SDK.
 */

export async function GET() {
  try {
    const shippers = await fetchLogicwareShippers();

    return NextResponse.json({
      success: true,
      shippers,
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
