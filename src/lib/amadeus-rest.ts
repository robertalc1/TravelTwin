let cachedToken: { token: string; expires: number } | null = null;

export async function getAmadeusToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expires) {
        return cachedToken.token;
    }

    const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.AMADEUS_CLIENT_ID!,
            client_secret: process.env.AMADEUS_CLIENT_SECRET!,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Amadeus auth failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    cachedToken = {
        token: data.access_token,
        expires: Date.now() + (data.expires_in - 60) * 1000,
    };
    return cachedToken.token;
}

export async function amadeusGet(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
    const token = await getAmadeusToken();
    const url = new URL(`https://test.api.amadeus.com${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Amadeus API error: ${res.status} ${err}`);
    }

    return res.json();
}
