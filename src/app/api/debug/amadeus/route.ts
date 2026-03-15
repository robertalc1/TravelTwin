import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      status: 'ERROR',
      message: 'Missing AMADEUS_CLIENT_ID or AMADEUS_CLIENT_SECRET',
      clientIdExists: !!clientId,
      clientSecretExists: !!clientSecret,
    });
  }

  try {
    const tokenRes = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return NextResponse.json({
        status: 'AUTH_FAILED',
        message: 'Amadeus authentication failed — credentials may be invalid or expired',
        httpStatus: tokenRes.status,
        error: tokenData,
        hint: 'Go to https://developers.amadeus.com/my-apps, click on your app, and regenerate API Key + Secret. Then update .env.local AND Vercel env vars.',
        clientIdPreview: clientId.substring(0, 8) + '...',
        clientSecretPreview: clientSecret.substring(0, 4) + '...',
      });
    }

    // Test a simple API call
    const testRes = await fetch(
      'https://test.api.amadeus.com/v1/reference-data/locations?keyword=London&subType=CITY&page%5Blimit%5D=3',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    const testData = await testRes.json();

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Amadeus API is working correctly!',
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      testSearchResults: testData.data?.length || 0,
      sampleResult: testData.data?.[0],
      clientIdPreview: clientId.substring(0, 8) + '...',
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'NETWORK_ERROR',
      message: 'Failed to reach Amadeus servers',
      error: error.message,
    });
  }
}
