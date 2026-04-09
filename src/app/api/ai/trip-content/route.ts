import { NextRequest, NextResponse } from 'next/server';
import { CITY_FALLBACK_DATA } from '@/lib/cityFallbackData';

/**
 * POST /api/ai/trip-content
 * Generates AI content (itinerary, attractions, restaurants, etc.) for a given city.
 * This is used by the trip detail page to generate content for homepage offer cards
 * that don't already have AI content from the plan-trip flow.
 */
export async function POST(req: NextRequest) {
    try {
        const { city, country, nights = 5, travelStyles = [] } = await req.json();
        if (!city) {
            return NextResponse.json({ error: 'city is required' }, { status: 400 });
        }

        const styleText = travelStyles.slice(0, 2).join(' and ') || 'adventure';
        const cityData = CITY_FALLBACK_DATA[city];
        const countryName = country || 'the destination';
        const n = Math.min(nights, 5);

        if (cityData) {
            return NextResponse.json({
                itinerary: {
                    description: `Discover the magic of ${city} on this perfectly curated ${nights}-night journey. From iconic landmarks to hidden local gems, this trip combines the best of ${countryName}'s culture, history, and gastronomy.`,
                    whyThisTrip: `This trip is perfect for ${styleText} lovers seeking an unforgettable experience in one of ${countryName}'s most captivating destinations.`,
                    dayByDay: Array.from({ length: n }, (_, i) => ({
                        day: i + 1,
                        title: i === 0 ? `Arrival in ${city}` : i === n - 1 ? 'Final Day & Departure' : `Explore ${city} — Day ${i + 1}`,
                        morning: {
                            activity: i === 0 ? 'Airport arrival & hotel check-in' : `Visit ${cityData.attractions[Math.min(i, cityData.attractions.length - 1)].name}`,
                            description: i === 0 ? 'Get settled in and freshen up for the adventure ahead' : cityData.attractions[Math.min(i, cityData.attractions.length - 1)].description,
                            type: i === 0 ? 'transport' : 'sightseeing',
                        },
                        afternoon: { activity: `Explore ${city} neighbourhoods`, description: `Wander through local streets, markets, and hidden corners of ${city}`, type: 'sightseeing' },
                        evening: { activity: `Dinner at ${cityData.restaurants[i % cityData.restaurants.length].name}`, description: cityData.restaurants[i % cityData.restaurants.length].description, type: 'dining' },
                    })),
                    topAttractions: cityData.attractions,
                    topRestaurants: cityData.restaurants,
                    topCafes: cityData.cafes,
                    localTips: cityData.tips,
                    estimatedDailyExpenses: cityData.expenses,
                },
            });
        }

        // Generic fallback
        return NextResponse.json({
            itinerary: {
                description: `Discover the magic of ${city} on this perfectly curated ${nights}-night journey. From iconic landmarks to hidden local gems, this trip combines the best of ${countryName}'s culture and beauty.`,
                whyThisTrip: `This trip is perfect for ${styleText} lovers looking for an unforgettable experience in ${city}.`,
                dayByDay: Array.from({ length: n }, (_, i) => ({
                    day: i + 1,
                    title: i === 0 ? `Arrival in ${city}` : i === n - 1 ? 'Final Day & Departure' : `Explore ${city} - Day ${i + 1}`,
                    morning: { activity: i === 0 ? 'Airport arrival & hotel check-in' : 'Breakfast at local café', description: 'Start your day fresh', type: i === 0 ? 'transport' : 'dining' },
                    afternoon: { activity: `Explore ${city} highlights`, description: 'Visit the top sights and local neighbourhoods', type: 'sightseeing' },
                    evening: { activity: 'Dinner at a local restaurant', description: `Enjoy the best of ${countryName} cuisine`, type: 'dining' },
                })),
                topAttractions: [
                    { name: `${city} Historic Centre`, description: `The vibrant heart of ${city} with centuries of history and culture`, category: 'landmark' },
                    { name: `National Museum of ${countryName}`, description: `Discover ${countryName}'s rich cultural heritage through fascinating exhibits`, category: 'museum' },
                    { name: `${city} Central Market`, description: 'Browse local crafts, fresh produce, and authentic street food', category: 'other' },
                    { name: `${city} Panorama Viewpoint`, description: 'Panoramic views of the city skyline and surrounding landscape', category: 'park' },
                    { name: `${city} Old Quarter`, description: 'Wander through centuries of history in the atmospheric old town streets', category: 'landmark' },
                ],
                topRestaurants: [
                    { name: `${city} Gastronomy`, cuisine: 'Local cuisine', priceRange: '€€', description: `Classic ${countryName} dishes showcasing the finest local ingredients` },
                    { name: 'Grand Brasserie', cuisine: 'European', priceRange: '€€€', description: 'Refined dining with seasonal menus and an outstanding wine selection' },
                    { name: 'Street Food Market', cuisine: 'Local street food', priceRange: '€', description: 'Authentic local flavours and quick bites' },
                ],
                topCafes: [
                    { name: 'The Morning Ritual', specialty: 'Specialty coffee & pastries', description: `The perfect spot to start a slow morning with excellent coffee in ${city}` },
                    { name: `${city} Coffee House`, specialty: 'Local blends & light lunches', description: 'A beloved local institution with a warm, relaxed atmosphere' },
                    { name: 'Artisan Roastery', specialty: 'Single-origin pour-overs', description: 'For the true coffee enthusiast seeking the finest locally roasted beans' },
                ],
                localTips: [`Book popular restaurants in advance, especially on weekends`, `Use local public transport to save money and travel like a local`, `Visit popular attractions early morning to beat the crowds`],
                estimatedDailyExpenses: { food: 35, transport: 15, activities: 25 },
            },
        });
    } catch (error) {
        console.error('[trip-content] Error:', error);
        return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
    }
}
