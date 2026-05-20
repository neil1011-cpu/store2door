import { NextResponse } from 'next/server';

const LOGICWARE_API_URL = process.env.LOGICWARE_API_URL;
const LOGICWARE_API_KEY = process.env.LOGICWARE_API_KEY;

export async function GET() {
  try {
    // Validate env vars
    if (!LOGICWARE_API_URL || !LOGICWARE_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Logicware environment variables',
        },
        { status: 500 }
      );
    }

    console.log('[LOGICWARE] Fetching data...');

    // Example endpoint
    const response = await fetch(`${LOGICWARE_API_URL}/orders`, {
      method: 'GET',

      headers: {
        Authorization: `Bearer ${LOGICWARE_API_KEY}`,
        'Content-Type': 'application/json',
      },

      cache: 'no-store',
    });

    // Handle non-200 responses
    if (!response.ok) {
      let errorText = 'Unknown API Error';

      try {
        errorText = await response.text();
      } catch {}

      console.error('[LOGICWARE API ERROR]', response.status, errorText);

      return NextResponse.json(
        {
          success: false,
          error: `Logicware API Error (${response.status})`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    // Safe JSON parsing
    let data: any = {};

    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('[JSON PARSE ERROR]', jsonError);

      data = {};
    }

    // Prevent null payload crashes
    if (!data) {
      data = {};
    }

    console.log('[LOGICWARE SUCCESS]', data);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[LOGICWARE FATAL ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown server error',
      },
      { status: 500 }
    );
  }
}
