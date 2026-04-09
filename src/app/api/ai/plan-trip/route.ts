import { NextRequest, NextResponse } from 'next/server';
import { matchDestinations, DestinationProfile } from '@/lib/destinations';
import { searchFlights, searchHotelsByCity, searchHotelOffers } from '@/lib/amadeus-client';
import { CITY_FALLBACK_DATA } from '@/lib/cityFallbackData';

export interface TripPackage {
  id: string;
  destination: DestinationProfile;
  flight: {
    outbound: any;
    inbound?: any;
    price: number;
    currency: string;
    airline: string;
    airlineCode: string;
    duration: string;
    stops: number;
    departureTime: string;
    arrivalTime: string;
  } | null;
  hotel: {
    id: string;
    name: string;
    stars: number;
    price: number;
    pricePerNight: number;
    currency: string;
    checkIn: string;
    checkOut: string;
    amenities: string[];
  } | null;
  totalPrice: number;
  currency: string;
  nights: number;
  aiContent: {
    description: string;
    whyThisTrip: string;
    dayByDay: Array<{
      day: number;
      title: string;
      morning: { activity: string; description: string; type: string };
      afternoon: { activity: string; description: string; type: string };
      evening: { activity: string; description: string; type: string };
    }>;
    topAttractions: Array<{
      name: string;
      description: string;
      category: 'museum' | 'landmark' | 'park' | 'other';
    }>;
    topRestaurants: Array<{
      name: string;
      cuisine: string;
      priceRange: '€' | '€€' | '€€€';
      description: string;
    }>;
    topCafes: Array<{
      name: string;
      specialty: string;
      description: string;
    }>;
    localTips: string[];
    estimatedDailyExpenses: { food: number; transport: number; activities: number };
  } | null;
  score: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      origin,
      budget,
      currency = 'EUR',
      departureDate,
      returnDate,
      adults = 2,
      children = 0,
      travelStyles = [],
      climate = 'no-preference',
      priorities = [],
    } = body;

    if (!origin || !budget || !departureDate || !returnDate) {
      return NextResponse.json({ error: 'Missing required fields: origin, budget, departureDate, returnDate' }, { status: 400 });
    }

    const depDate = new Date(departureDate);
    const retDate = new Date(returnDate);
    const nights = Math.round((retDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24));
    const month = depDate.getMonth() + 1;
    const totalAdults = adults + children;

    // 1. Match candidate destinations
    const candidates = matchDestinations(travelStyles, climate, budget, month, 8);
    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No destinations matched your preferences' }, { status: 400 });
    }

    // Budget allocation: 40% flights, 45% hotel, 15% activities
    const flightBudget = budget * 0.40;
    const hotelBudget = budget * 0.45;

    // 2. Search flights + hotels for each candidate in parallel (limit to 5)
    const searchPromises = candidates.slice(0, 5).map(async (dest) => {
      try {
        // Search flights
        const flightParams: Record<string, string> = {
          originLocationCode: origin,
          destinationLocationCode: dest.iata,
          departureDate,
          returnDate,
          adults: String(totalAdults),
          travelClass: 'ECONOMY',
          currencyCode: currency,
          max: '5',
        };

        const [flightResults, hotelList] = await Promise.allSettled([
          searchFlights(flightParams),
          searchHotelsByCity(dest.iata),
        ]);

        let flightData: any[] = flightResults.status === 'fulfilled' ? flightResults.value : [];
        let hotelListData: any[] = hotelList.status === 'fulfilled' ? hotelList.value : [];

        // Filter affordable flights
        const affordableFlight = flightData.find(f => {
          const price = parseFloat(f.price?.total || f.price?.grandTotal || '999999');
          return price <= flightBudget * totalAdults;
        }) || flightData[0];

        // Get hotel offers if we have hotel IDs
        let hotelOffer: any = null;
        if (hotelListData.length > 0) {
          const hotelIds = hotelListData.slice(0, 10).map((h: any) => h.hotelId).filter(Boolean);
          if (hotelIds.length > 0) {
            try {
              const offers = await searchHotelOffers(hotelIds, departureDate, returnDate, String(adults));
              hotelOffer = offers.find((o: any) => {
                const price = parseFloat(o.offers?.[0]?.price?.total || '999999');
                return price <= hotelBudget;
              }) || offers[0];
            } catch {
              // hotel offers failed, continue without
            }
          }
        }

        return { dest, flightData: affordableFlight, hotelOffer };
      } catch (e) {
        console.warn(`[plan-trip] Failed searching ${dest.iata}:`, e);
        return { dest, flightData: null, hotelOffer: null };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    // 3. Score and build packages
    const packages: TripPackage[] = [];

    for (const { dest, flightData, hotelOffer } of searchResults) {
      const flightPrice = flightData
        ? parseFloat(flightData.price?.total || flightData.price?.grandTotal || '0')
        : 0;
      const hotelPrice = hotelOffer
        ? parseFloat(hotelOffer.offers?.[0]?.price?.total || '0')
        : 0;
      const totalPrice = flightPrice + hotelPrice;

      // Skip pachete fără prețuri reale de la API
      if (totalPrice === 0) continue;
      // Skip pachete care depășesc bugetul cu 15%
      if (totalPrice > budget * 1.15) continue;

      // Build normalized flight info
      const flight = flightData ? buildFlightInfo(flightData) : null;
      const hotel = hotelOffer ? buildHotelInfo(hotelOffer, nights) : null;

      // Score package
      let score = 0;
      if (totalPrice > 0 && totalPrice <= budget) score += 30;
      if (flight?.stops === 0 && priorities.includes('direct-flights')) score += 25;
      if (hotel && hotel.stars >= 4) score += 20;
      if (priorities.includes('cheapest') && totalPrice < budget * 0.8) score += 15;
      score += (dest.tags.filter((t: string) => travelStyles.includes(t)).length * 10);

      packages.push({
        id: `${dest.iata}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        destination: dest,
        flight,
        hotel,
        totalPrice: Math.round(totalPrice),
        currency,
        nights,
        aiContent: null, // filled below
        score,
      });
    }

    // Sort by score and take top 3
    packages.sort((a, b) => b.score - a.score);
    const topPackages = packages.slice(0, 3);

    // 4. Generate AI content for top packages
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && topPackages.length > 0) {
      await Promise.all(topPackages.map(async (pkg) => {
        try {
          const activityBudget = Math.round(budget - pkg.totalPrice);
          const prompt = `You are a travel expert. Generate a trip itinerary for this trip:

Destination: ${pkg.destination.city}, ${pkg.destination.country}
Dates: ${departureDate} to ${returnDate} (${nights} nights)
Budget remaining for activities: €${activityBudget}
Travel styles: ${travelStyles.join(', ')}
Group: ${adults} adults, ${children} children

IMPORTANT: Use REAL, specific place names that actually exist in ${pkg.destination.city}. Do NOT use generic names like "Local Museum", "City Center Restaurant", or "Artisan Café". Use actual well-known restaurants, cafes, and attractions that a local or travel guide would recommend.

Return ONLY valid JSON (no markdown, no backticks):
{
  "description": "2-3 sentence compelling trip description",
  "whyThisTrip": "1 sentence explaining why this matches their preferences",
  "dayByDay": [
    {
      "day": 1,
      "title": "Arrival & First Impressions",
      "morning": { "activity": "specific activity name", "description": "details", "type": "transport" },
      "afternoon": { "activity": "specific attraction name", "description": "details", "type": "sightseeing" },
      "evening": { "activity": "specific restaurant or bar name", "description": "details", "type": "dining" }
    }
  ],
  "topAttractions": [
    { "name": "Specific real attraction name", "description": "One sentence about this attraction", "category": "museum|landmark|park|other" },
    { "name": "...", "description": "...", "category": "..." },
    { "name": "...", "description": "...", "category": "..." },
    { "name": "...", "description": "...", "category": "..." },
    { "name": "...", "description": "...", "category": "..." }
  ],
  "topRestaurants": [
    { "name": "Real restaurant name", "cuisine": "...", "priceRange": "€|€€|€€€", "description": "One sentence recommendation" },
    { "name": "...", "cuisine": "...", "priceRange": "€€", "description": "..." },
    { "name": "...", "cuisine": "...", "priceRange": "€€€", "description": "..." }
  ],
  "topCafes": [
    { "name": "Real cafe name", "specialty": "...", "description": "One sentence about the vibe" },
    { "name": "...", "specialty": "...", "description": "..." },
    { "name": "...", "specialty": "...", "description": "..." }
  ],
  "localTips": ["Specific actionable tip 1", "Tip 2", "Tip 3"],
  "estimatedDailyExpenses": { "food": 40, "transport": 15, "activities": 25 }
}`;

          const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2500,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const text = aiData.content?.[0]?.text || '';
            pkg.aiContent = JSON.parse(text);
          }
        } catch (e) {
          console.warn('[plan-trip] AI generation failed for', pkg.destination.iata, e);
          pkg.aiContent = generateFallbackContent(pkg.destination, nights, travelStyles);
        }
      }));
    } else {
      // No API key — use fallback content for all
      topPackages.forEach(pkg => {
        pkg.aiContent = generateFallbackContent(pkg.destination, nights, travelStyles);
      });
    }

    return NextResponse.json({ packages: topPackages, total: topPackages.length });
  } catch (e: any) {
    console.error('[plan-trip] Error:', e);
    return NextResponse.json({ error: e.message || 'Failed to plan trip' }, { status: 500 });
  }
}

function buildFlightInfo(f: any) {
  const itinerary = f.itineraries?.[0];
  const segment = itinerary?.segments?.[0];
  const lastSeg = itinerary?.segments?.[itinerary.segments.length - 1];
  const price = parseFloat(f.price?.total || f.price?.grandTotal || '0');
  return {
    outbound: f,
    price,
    currency: f.price?.currency || 'EUR',
    airline: segment?.carrierCode || '',
    airlineCode: segment?.carrierCode || '',
    duration: itinerary?.duration || '',
    stops: (itinerary?.segments?.length || 1) - 1,
    departureTime: segment?.departure?.at || '',
    arrivalTime: lastSeg?.arrival?.at || '',
  };
}

function buildHotelInfo(offer: any, nights: number) {
  const o = offer.offers?.[0];
  const total = parseFloat(o?.price?.total || '0');
  const pricePerNight = nights > 0 ? Math.round(total / nights) : total;
  return {
    id: offer.hotel?.hotelId || '',
    name: offer.hotel?.name || 'Hotel',
    stars: offer.hotel?.rating ? parseInt(offer.hotel.rating) : 3,
    price: Math.round(total),
    pricePerNight,
    currency: o?.price?.currency || 'EUR',
    checkIn: o?.checkInDate || '',
    checkOut: o?.checkOutDate || '',
    amenities: offer.hotel?.amenities?.slice(0, 5) || [],
  };
}


function generateFallbackContent(dest: DestinationProfile, nights: number, styles: string[]) {
  const styleText = styles.slice(0, 2).join(" and ") || "adventure";
  const city = dest.city;
  const country = dest.country;

  type CityData = {
    attractions: Array<{ name: string; description: string; category: "museum" | "landmark" | "park" | "other" }>;
    restaurants: Array<{ name: string; cuisine: string; priceRange: "€" | "€€" | "€€€"; description: string }>;
    cafes: Array<{ name: string; specialty: string; description: string }>;
  };

  const CITY_DATA: Record<string, CityData> = {
    "Paris": {
      attractions: [
        { name: "Eiffel Tower", description: "Iconic iron lattice tower on the Champ de Mars", category: "landmark" },
        { name: "Louvre Museum", description: "Worlds largest art museum and home of the Mona Lisa", category: "museum" },
        { name: "Notre-Dame Cathedral", description: "Gothic cathedral masterpiece on the Ile de la Cite", category: "landmark" }
      ],
      restaurants: [
        { name: "Le Comptoir du Relais", cuisine: "French bistro", priceRange: "€€", description: "Classic Parisian bistro in Saint-Germain" },
        { name: "LAs du Fallafel", cuisine: "Middle Eastern", priceRange: "€", description: "Legendary falafel spot in the Marais district" },
        { name: "Septime", cuisine: "Modern French", priceRange: "€€€", description: "Award-winning neo-bistro in Bastille" }
      ],
      cafes: [
        { name: "Cafe de Flore", specialty: "Historic cafe and croissants", description: "Legendary Saint-Germain cafe since 1887" },
        { name: "Angelina", specialty: "Hot chocolate and pastries", description: "Belle Epoque tearoom near the Tuileries" },
        { name: "Telescope", specialty: "Specialty coffee", description: "Pioneering third-wave coffee bar in the 1st arrondissement" }
      ]
    },
    "London": {
      attractions: [
        { name: "Tower of London", description: "Historic castle and home of the Crown Jewels", category: "landmark" },
        { name: "British Museum", description: "World-class museum with artifacts from across human history", category: "museum" },
        { name: "Buckingham Palace", description: "Official residence of the British monarch", category: "landmark" }
      ],
      restaurants: [
        { name: "Dishoom", cuisine: "Indian", priceRange: "€€", description: "Beloved Bombay-style cafe with legendary black daal" },
        { name: "Borough Market", cuisine: "Various street food", priceRange: "€", description: "Historic food market with the best street food in London" },
        { name: "Sketch", cuisine: "Modern European", priceRange: "€€€", description: "Iconic restaurant and art gallery in Mayfair" }
      ],
      cafes: [
        { name: "Monmouth Coffee", specialty: "Specialty coffee", description: "One of the finest independent coffee roasters in London" },
        { name: "Bageriet", specialty: "Swedish pastries", description: "Cozy Swedish bakery in Covent Garden" },
        { name: "Flat White", specialty: "Flat white coffee", description: "Soho cafe that introduced flat white to London" }
      ]
    },
    "Rome": {
      attractions: [
        { name: "Colosseum", description: "Ancient amphitheatre and iconic symbol of Rome", category: "landmark" },
        { name: "Vatican Museums", description: "Vast collection of art and the Sistine Chapel", category: "museum" },
        { name: "Trevi Fountain", description: "Baroque masterpiece and the largest fountain in Rome", category: "landmark" }
      ],
      restaurants: [
        { name: "Da Enzo al 29", cuisine: "Roman", priceRange: "€€", description: "Authentic Roman trattoria in Trastevere" },
        { name: "Suppli Roma", cuisine: "Street food", priceRange: "€", description: "Famous for the best suppli in the city" },
        { name: "La Pergola", cuisine: "Fine dining Italian", priceRange: "€€€", description: "Only three-Michelin-star restaurant in Rome" }
      ],
      cafes: [
        { name: "Sant Eustachio il Caffe", specialty: "Traditional espresso", description: "Legendary Roman cafe serving since 1938" },
        { name: "Bar San Calisto", specialty: "Cheap espresso and hot chocolate", description: "Classic Trastevere bar loved by locals" },
        { name: "Caffe Greco", specialty: "Historic cafe", description: "One of the oldest cafes in the world, open since 1760" }
      ]
    },
    "Barcelona": {
      attractions: [
        { name: "Sagrada Familia", description: "Gaudi masterpiece basilica still under construction", category: "landmark" },
        { name: "Park Guell", description: "Colorful mosaic park with panoramic city views", category: "park" },
        { name: "Gothic Quarter", description: "Medieval neighborhood with narrow streets and history", category: "landmark" }
      ],
      restaurants: [
        { name: "Bar Central La Boqueria", cuisine: "Spanish tapas", priceRange: "€€", description: "Fresh seafood and tapas inside La Boqueria market" },
        { name: "El Xampanyet", cuisine: "Catalan", priceRange: "€", description: "Classic cava bar in the Born neighborhood" },
        { name: "Disfrutar", cuisine: "Modern Catalan", priceRange: "€€€", description: "World top-10 restaurant with avant-garde cuisine" }
      ],
      cafes: [
        { name: "Federal Cafe", specialty: "Brunch and specialty coffee", description: "Australian-style cafe in Sant Antoni" },
        { name: "Nomad Coffee", specialty: "Single-origin espresso", description: "Barcelonas best specialty coffee roaster" },
        { name: "El Magnifico", specialty: "Coffee and chocolate", description: "Historic coffee shop in El Born since 1919" }
      ]
    },
    "Amsterdam": {
      attractions: [
        { name: "Rijksmuseum", description: "Dutch national museum with Rembrandt and Vermeer", category: "museum" },
        { name: "Anne Frank House", description: "Historic house where Anne Frank hid during WWII", category: "landmark" },
        { name: "Van Gogh Museum", description: "Worlds largest collection of Van Gogh works", category: "museum" }
      ],
      restaurants: [
        { name: "Restaurant Breda", cuisine: "Modern European", priceRange: "€€€", description: "Elegant dining in a historic canal house" },
        { name: "Pllek", cuisine: "International", priceRange: "€€", description: "Trendy restaurant and beach bar in Amsterdam Noord" },
        { name: "Stroopwafel and Co", cuisine: "Dutch street food", priceRange: "€", description: "Fresh stroopwafels made in front of you" }
      ],
      cafes: [
        { name: "Lot Sixty One", specialty: "Specialty coffee", description: "Amsterdams most celebrated specialty coffee bar" },
        { name: "Cafe Papeneiland", specialty: "Dutch brown cafe", description: "Traditional brown cafe since 1642 in the Jordaan" },
        { name: "Back to Black", specialty: "Third wave coffee", description: "Hipster coffee bar in the Utrechtsestraat area" }
      ]
    },
    "Istanbul": {
      attractions: [
        { name: "Hagia Sophia", description: "Former cathedral and mosque, now a stunning museum", category: "landmark" },
        { name: "Grand Bazaar", description: "One of the worlds oldest and largest covered markets", category: "landmark" },
        { name: "Topkapi Palace", description: "Opulent palace of the Ottoman sultans", category: "museum" }
      ],
      restaurants: [
        { name: "Karakoy Lokantasi", cuisine: "Modern Turkish", priceRange: "€€", description: "Contemporary take on classic Turkish cuisine" },
        { name: "Ciya Sofrasi", cuisine: "Anatolian", priceRange: "€", description: "Authentic Anatolian home cooking in Kadikoy" },
        { name: "Mikla", cuisine: "New Nordic-Turkish", priceRange: "€€€", description: "Rooftop fine dining with Bosphorus views" }
      ],
      cafes: [
        { name: "Mandabatmaz", specialty: "Turkish coffee", description: "Tiny legendary cafe serving the best Turkish coffee in Istanbul" },
        { name: "Kronotrop", specialty: "Specialty coffee", description: "Pioneer of third-wave coffee culture in Turkey" },
        { name: "Karabatak", specialty: "Coffee and brunch", description: "Trendy cafe in Cihangir neighborhood" }
      ]
    },
    "Dubai": {
      attractions: [
        { name: "Burj Khalifa", description: "Worlds tallest building with observation deck on floor 124", category: "landmark" },
        { name: "Dubai Mall", description: "One of the largest malls in the world with an aquarium", category: "landmark" },
        { name: "Palm Jumeirah", description: "Iconic artificial island with luxury hotels and beaches", category: "landmark" }
      ],
      restaurants: [
        { name: "Al Ustad Special Kabab", cuisine: "Persian", priceRange: "€", description: "Legendary kebab restaurant open since 1978" },
        { name: "Nobu Dubai", cuisine: "Japanese-Peruvian", priceRange: "€€€", description: "World-famous chef Nobus Dubai outpost" },
        { name: "Bu Qtair", cuisine: "Fresh seafood", priceRange: "€", description: "No-frills seaside shack with the freshest fish in Dubai" }
      ],
      cafes: [
        { name: "Nightjar Coffee", specialty: "Specialty coffee", description: "Dubais favorite specialty coffee roaster" },
        { name: "Tom and Serg", specialty: "Brunch and coffee", description: "Popular Australian-style cafe in Al Quoz" },
        { name: "Arrows and Sparrows", specialty: "Artisan coffee", description: "Hidden gem cafe in Al Serkal Avenue" }
      ]
    },
    "Prague": {
      attractions: [
        { name: "Prague Castle", description: "Largest ancient castle complex in the world", category: "landmark" },
        { name: "Charles Bridge", description: "Medieval stone bridge with Baroque statues", category: "landmark" },
        { name: "Old Town Square", description: "Historic square with the famous Astronomical Clock", category: "landmark" }
      ],
      restaurants: [
        { name: "Lokal", cuisine: "Czech", priceRange: "€", description: "Classic Czech pub with perfectly poured Pilsner Urquell" },
        { name: "La Degustation Boheme Bourgeoise", cuisine: "Modern Czech", priceRange: "€€€", description: "Michelin-starred Czech tasting menu experience" },
        { name: "Manifesto Market", cuisine: "Street food", priceRange: "€", description: "Container market with diverse street food options" }
      ],
      cafes: [
        { name: "EMA Espresso Bar", specialty: "Specialty coffee", description: "Pragues best flat white in a minimalist setting" },
        { name: "Cafe Louvre", specialty: "Historic cafe", description: "Grand cafe open since 1902 frequented by Kafka and Einstein" },
        { name: "Kavarna Obecni Dum", specialty: "Art Nouveau cafe", description: "Stunning Art Nouveau cafe inside the Municipal House" }
      ]
    },
    "Vienna": {
      attractions: [
        { name: "Schonbrunn Palace", description: "Imperial palace with 1,441 rooms and stunning gardens", category: "landmark" },
        { name: "Belvedere Museum", description: "Baroque palace housing Klimts The Kiss", category: "museum" },
        { name: "St. Stephens Cathedral", description: "Gothic cathedral and symbol of Vienna", category: "landmark" }
      ],
      restaurants: [
        { name: "Figlmuller Wollzeile", cuisine: "Austrian", priceRange: "€€", description: "Famous for the biggest Wiener Schnitzel in Vienna" },
        { name: "Zum Wohl", cuisine: "Wine bar", priceRange: "€€", description: "Natural wine bar with excellent Austrian small plates" },
        { name: "Steirereck", cuisine: "Modern Austrian", priceRange: "€€€", description: "One of the 50 best restaurants in the world" }
      ],
      cafes: [
        { name: "Cafe Central", specialty: "Viennese coffeehouse", description: "Grand historic cafe in a Gothic palace since 1876" },
        { name: "Cafe Hawelka", specialty: "Traditional coffee", description: "Legendary bohemian cafe run by the same family for 80 years" },
        { name: "Meinl am Graben", specialty: "Luxury coffee and pastries", description: "Vienna finest delicatessen and coffeehouse on the Graben" }
      ]
    },
    "Lisbon": {
      attractions: [
        { name: "Belem Tower", description: "16th century fortress and UNESCO World Heritage Site", category: "landmark" },
        { name: "Jeronimos Monastery", description: "Magnificent example of Portuguese Late Gothic architecture", category: "landmark" },
        { name: "Alfama District", description: "Oldest neighborhood with Moorish roots and Fado music", category: "landmark" }
      ],
      restaurants: [
        { name: "Time Out Market", cuisine: "Various Portuguese", priceRange: "€€", description: "The best of Lisbon cuisine under one roof" },
        { name: "A Cevicheria", cuisine: "Peruvian-Portuguese", priceRange: "€€€", description: "Creative fusion restaurant by chef Kiko Martins" },
        { name: "Solar dos Presuntos", cuisine: "Traditional Portuguese", priceRange: "€€", description: "Classic Lisbon restaurant famous for cured hams" }
      ],
      cafes: [
        { name: "Pasteis de Belem", specialty: "Original pasteis de nata", description: "The legendary original home of Portuguese custard tarts since 1837" },
        { name: "Copenhagen Coffee Lab", specialty: "Scandinavian specialty coffee", description: "Danish-inspired specialty coffee in Principe Real" },
        { name: "Cafe A Brasileira", specialty: "Historic cafe", description: "Famous Art Deco cafe in Chiado open since 1905" }
      ]
    },
    "Berlin": {
      attractions: [
        { name: "Brandenburg Gate", description: "Neoclassical triumphal arch and symbol of German unity", category: "landmark" },
        { name: "Berlin Wall Memorial", description: "Historic site commemorating the divided city", category: "landmark" },
        { name: "Museum Island", description: "UNESCO World Heritage site with five world-class museums", category: "museum" }
      ],
      restaurants: [
        { name: "Mustafas Gemuse Kebap", cuisine: "Turkish", priceRange: "€", description: "The most famous kebab stand in Berlin with legendary queues" },
        { name: "Nobelhart und Schmutzig", cuisine: "Modern German", priceRange: "€€€", description: "Brutally local fine dining championing regional ingredients" },
        { name: "Markthalle Neun", cuisine: "Street food market", priceRange: "€", description: "Historic market hall with street food Thursdays" }
      ],
      cafes: [
        { name: "The Barn", specialty: "Specialty coffee", description: "Berlins most celebrated coffee roaster with multiple locations" },
        { name: "Cafe Einstein Stammhaus", specialty: "Viennese coffeehouse", description: "Classic Viennese-style grand cafe in a beautiful villa" },
        { name: "Five Elephant", specialty: "Coffee and cheesecake", description: "Famous for specialty coffee and the best cheesecake in Berlin" }
      ]
    },
    "Madrid": {
      attractions: [
        { name: "Prado Museum", description: "One of the worlds finest art museums with Velazquez and Goya", category: "museum" },
        { name: "Royal Palace", description: "Official residence of the Spanish Royal Family", category: "landmark" },
        { name: "Retiro Park", description: "Stunning 350-acre park in the heart of the city", category: "park" }
      ],
      restaurants: [
        { name: "Sobrino de Botin", cuisine: "Traditional Spanish", priceRange: "€€", description: "Worlds oldest restaurant, open since 1725" },
        { name: "Mercado de San Miguel", cuisine: "Spanish tapas", priceRange: "€€", description: "Beautiful iron market with gourmet tapas and wine" },
        { name: "DiverXO", cuisine: "Avant-garde", priceRange: "€€€", description: "Three-Michelin-star restaurant by David Munoz" }
      ],
      cafes: [
        { name: "Cafeteria Comercial", specialty: "Traditional Spanish cafe", description: "Iconic historic cafe open since 1887" },
        { name: "Toma Cafe", specialty: "Specialty coffee", description: "Pioneer of the specialty coffee movement in Madrid" },
        { name: "Cafe del Circulo de Bellas Artes", specialty: "Grand cafe", description: "Elegant rooftop terrace cafe with city views" }
      ]
    },
    "Athens": {
      attractions: [
        { name: "Acropolis", description: "Ancient citadel with the Parthenon, symbol of Western civilization", category: "landmark" },
        { name: "National Archaeological Museum", description: "Worlds finest collection of ancient Greek artifacts", category: "museum" },
        { name: "Plaka District", description: "Charming old neighborhood at the foot of the Acropolis", category: "landmark" }
      ],
      restaurants: [
        { name: "Diporto Agoras", cuisine: "Greek taverna", priceRange: "€", description: "Hidden basement taverna in the central market, cash only" },
        { name: "Varoulko Seaside", cuisine: "Modern Greek seafood", priceRange: "€€€", description: "Michelin-starred seafood with Acropolis views" },
        { name: "Tzitzikas kai Mermigas", cuisine: "Modern Greek", priceRange: "€€", description: "Creative Greek cuisine in a charming setting" }
      ],
      cafes: [
        { name: "Mokka", specialty: "Greek coffee", description: "Old-school Athenian coffee house serving thick Greek coffee" },
        { name: "The Underdog", specialty: "Specialty coffee", description: "Athens leading specialty coffee roaster" },
        { name: "Tailor Made", specialty: "Coffee and cocktails", description: "Hip cafe-bar in Monastiraki that turns into a bar at night" }
      ]
    },
    "Budapest": {
      attractions: [
        { name: "Hungarian Parliament Building", description: "Neo-Gothic masterpiece on the Danube, one of Europes largest", category: "landmark" },
        { name: "Buda Castle", description: "Historic castle complex overlooking the city from Castle Hill", category: "landmark" },
        { name: "Szechenyi Baths", description: "Grand neo-baroque thermal bath complex open since 1913", category: "landmark" }
      ],
      restaurants: [
        { name: "Costes", cuisine: "Modern European", priceRange: "€€€", description: "First Michelin-starred restaurant in Budapest" },
        { name: "Menza", cuisine: "Hungarian", priceRange: "€€", description: "Modern take on Hungarian classics in a retro setting" },
        { name: "Hungarikum Bistro", cuisine: "Traditional Hungarian", priceRange: "€€", description: "Authentic Hungarian flavors with a contemporary presentation" }
      ],
      cafes: [
        { name: "Gerbeaud", specialty: "Historic pastry cafe", description: "Legendary pastry shop on Vorosmarty Square since 1858" },
        { name: "New York Cafe", specialty: "Grand historic cafe", description: "The most beautiful cafe in the world inside the New York Palace" },
        { name: "My Little Melbourne", specialty: "Australian specialty coffee", description: "Budapests best flat white in the Jewish Quarter" }
      ]
    },
    "Bucharest": {
      attractions: [
        { name: "Palace of Parliament", description: "The second largest administrative building in the world", category: "landmark" },
        { name: "Romanian Athenaeum", description: "Stunning concert hall and symbol of Romanian culture", category: "landmark" },
        { name: "Village Museum", description: "Open-air museum with authentic Romanian rural architecture", category: "museum" }
      ],
      restaurants: [
        { name: "Lacrimi si Sfinti", cuisine: "Modern Romanian", priceRange: "€€€", description: "Creative Romanian fine dining by chef Joseph Hadad" },
        { name: "Caru cu Bere", cuisine: "Traditional Romanian", priceRange: "€€", description: "Iconic historic restaurant in a stunning Gothic Revival building" },
        { name: "Vatra", cuisine: "Traditional Romanian", priceRange: "€€", description: "Authentic Romanian home cooking in a cozy setting" }
      ],
      cafes: [
        { name: "Origo", specialty: "Specialty coffee", description: "Bucharests leading specialty coffee roaster" },
        { name: "Bob Coffee Lab", specialty: "Third wave coffee", description: "Excellent single-origin coffees in the Old Town area" },
        { name: "Coffee2Go", specialty: "Quick espresso", description: "Popular local chain with quality espresso at fair prices" }
      ]
    },
    "Bali": {
      attractions: [
        { name: "Tanah Lot Temple", description: "Iconic sea temple perched on a rocky outcrop at sunset", category: "landmark" },
        { name: "Ubud Monkey Forest", description: "Sacred nature sanctuary home to over 700 Balinese macaques", category: "park" },
        { name: "Tegallalang Rice Terraces", description: "Stunning UNESCO-listed terraced rice fields north of Ubud", category: "landmark" }
      ],
      restaurants: [
        { name: "Locavore", cuisine: "Modern Indonesian", priceRange: "€€€", description: "Balis finest restaurant using only local Indonesian ingredients" },
        { name: "Naughty Nuris Warung", cuisine: "Balinese BBQ", priceRange: "€", description: "Legendary ribs and martinis, a Bali institution since 1995" },
        { name: "Warung Babi Guling Ibu Oka", cuisine: "Balinese", priceRange: "€", description: "Famous suckling pig warung recommended by Anthony Bourdain" }
      ],
      cafes: [
        { name: "Seniman Coffee Studio", specialty: "Specialty Balinese coffee", description: "Showcasing the best of Indonesian single-origin coffees" },
        { name: "Revolver Espresso", specialty: "Australian coffee culture", description: "Tiny alley espresso bar that changed Balis coffee scene" },
        { name: "Anomali Coffee", specialty: "Indonesian single-origin", description: "Local chain celebrating the diversity of Indonesian coffee" }
      ]
    }
  };

  const cityData: CityData = CITY_DATA[city] || {
    attractions: [
      { name: city + " Historic Center", description: "Explore the historic heart of " + city, category: "landmark" },
      { name: city + " National Museum", description: "Discover the culture and history of " + country, category: "museum" },
      { name: city + " Central Park", description: "Green oasis in the heart of the city", category: "park" }
    ],
    restaurants: [
      { name: "Local Kitchen", cuisine: "Traditional " + country, priceRange: "€€", description: "Authentic local cuisine in a welcoming atmosphere" },
      { name: "Central Bistro", cuisine: "International", priceRange: "€€", description: "Popular restaurant in the city center" },
      { name: "Street Food Market", cuisine: "Street food", priceRange: "€", description: "Local street food and market stalls" }
    ],
    cafes: [
      { name: "Morning Brew", specialty: "Coffee and pastries", description: "Popular local cafe for breakfast and coffee" },
      { name: city + " Coffee House", specialty: "Local coffee blends", description: "Cozy spot for coffee and conversation" },
      { name: "The Corner Cafe", specialty: "Specialty coffee", description: "Third-wave coffee in a relaxed setting" }
    ]
  };

  return {
    description: "Discover the magic of " + city + " on this perfectly curated " + nights + "-night journey. From iconic landmarks to hidden local gems, this trip combines the best of " + country + " culture and beauty.",
    whyThisTrip: "This trip is perfect for " + styleText + " lovers looking for an unforgettable experience in " + city + ".",
    dayByDay: Array.from({ length: Math.min(nights, 5) }, (_, i) => ({
      day: i + 1,
      title: i === 0 ? "Arrival in " + city : i === nights - 1 ? "Final Day & Departure" : "Explore " + city + " - Day " + (i + 1),
      morning: {
        activity: i === 0 ? "Airport arrival & hotel check-in" : "Breakfast at a local cafe",
        description: i === 0 ? "Settle in and get oriented in " + city : "Start your day with local flavors",
        type: i === 0 ? "transport" : "dining"
      },
      afternoon: {
        activity: "Explore " + city + " highlights",
        description: "Visit the top sights and local neighborhoods",
        type: "sightseeing"
      },
      evening: {
        activity: "Dinner at a local restaurant",
        description: "Enjoy the best of " + country + " cuisine",
        type: "dining"
      }
    })),
    topAttractions: cityData.attractions,
    topRestaurants: cityData.restaurants,
    topCafes: cityData.cafes,
    localTips: [
      "Book popular restaurants and attractions in advance",
      "Use local public transport to save money and see more",
      "Visit popular attractions early morning to avoid crowds"
    ],
    estimatedDailyExpenses: { food: 35, transport: 15, activities: 25 }
  };
}
