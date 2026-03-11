import { NextResponse } from 'next/server';
import amadeus from '@/lib/amadeus';
import { amadeusGet } from '@/lib/amadeus-rest';
import { canMakeAmadeusCall, recordAmadeusCall } from '@/lib/rateLimiter';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const latitude = searchParams.get('latitude');
        const longitude = searchParams.get('longitude');
        const radius = searchParams.get('radius') || '5';

        if (!latitude || !longitude) {
            return NextResponse.json(
                { error: 'Missing required params: latitude, longitude' },
                { status: 400 }
            );
        }

        if (!canMakeAmadeusCall()) {
            return NextResponse.json({
                pois: [],
                warning: 'Rate limited. Please try again shortly.',
            });
        }

        try {
            recordAmadeusCall();
            // Use amadeus.client.get for endpoints not covered by TypeScript SDK types
            const response = await (amadeus as unknown as {
                client: { get: (path: string, params?: Record<string, unknown>) => Promise<{ data: unknown }> };
            }).client.get('/v1/reference-data/locations/pois', {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                radius: parseInt(radius),
            });

            const pois = ((response.data || []) as Record<string, unknown>[]).map(
                (poi) => {
                    const geoCode = poi.geoCode as Record<string, number> | undefined;
                    return {
                        id: (poi.id as string) || '',
                        name: (poi.name as string) || '',
                        category: (poi.category as string) || 'SIGHTSEEING',
                        rank: (poi.rank as number) || 0,
                        tags: (poi.tags as string[]) || [],
                        geoCode: {
                            latitude: geoCode?.latitude || 0,
                            longitude: geoCode?.longitude || 0,
                        },
                    };
                }
            );

            return NextResponse.json({ pois, count: pois.length });
        } catch (sdkError: unknown) {
            console.warn('[POI] SDK failed, trying REST:', (sdkError as Error)?.message);
            try {
                const data = await amadeusGet('/v1/reference-data/locations/pois', {
                    latitude,
                    longitude,
                    radius,
                });
                const pois = (((data as Record<string, unknown>).data as Record<string, unknown>[]) || []).map(
                    (poi) => {
                        const geoCode = poi.geoCode as Record<string, number> | undefined;
                        return {
                            id: (poi.id as string) || '',
                            name: (poi.name as string) || '',
                            category: (poi.category as string) || 'SIGHTSEEING',
                            rank: (poi.rank as number) || 0,
                            tags: (poi.tags as string[]) || [],
                            geoCode: {
                                latitude: geoCode?.latitude || 0,
                                longitude: geoCode?.longitude || 0,
                            },
                        };
                    }
                );
                return NextResponse.json({ pois, count: pois.length });
            } catch (restError) {
                console.error('[POI] Both SDK and REST failed:', (restError as Error)?.message);
            }
            return NextResponse.json({
                pois: [],
                count: 0,
                warning: 'Unable to fetch points of interest.',
            });
        }
    } catch (error) {
        console.error('[POI] Unexpected error:', error);
        return NextResponse.json({ pois: [], count: 0 }, { status: 200 });
    }
}
