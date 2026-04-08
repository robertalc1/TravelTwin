import { NextRequest, NextResponse } from 'next/server';
import { matchDestinations, DestinationProfile } from '@/lib/destinations';
import { searchFlights, searchHotelsByCity, searchHotelOffers } from '@/lib/amadeus-client';

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

      if (totalPrice > budget * 1.15) continue; // Skip if >15% over budget

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

type CityData = {
  attractions: Array<{ name: string; description: string; category: 'museum' | 'landmark' | 'park' | 'other' }>;
  restaurants: Array<{ name: string; cuisine: string; priceRange: '€' | '€€' | '€€€'; description: string }>;
  cafes: Array<{ name: string; specialty: string; description: string }>;
  tips: string[];
  expenses: { food: number; transport: number; activities: number };
};

const CITY_FALLBACK_DATA: Record<string, CityData> = {
  Paris: {
    attractions: [
      { name: 'Eiffel Tower', description: 'The iconic iron lattice tower on the Champ de Mars, symbol of Paris and France', category: 'landmark' },
      { name: 'Louvre Museum', description: "World's largest art museum housing the Mona Lisa and thousands of priceless works", category: 'museum' },
      { name: 'Notre-Dame Cathedral', description: 'Magnificent Gothic cathedral under restoration, a masterpiece of medieval architecture', category: 'landmark' },
      { name: 'Sacré-Cœur Basilica', description: 'Stunning white dome basilica atop Montmartre hill with panoramic city views', category: 'landmark' },
      { name: 'Musée d\'Orsay', description: 'Impressionist masterpieces by Monet, Renoir, and Van Gogh in a converted railway station', category: 'museum' },
    ],
    restaurants: [
      { name: 'Le Jules Verne', cuisine: 'French haute cuisine', priceRange: '€€€', description: 'Michelin-starred dining inside the Eiffel Tower with breathtaking panoramic views' },
      { name: 'Bouillon Chartier', cuisine: 'Traditional French brasserie', priceRange: '€', description: 'Historic 1896 brasserie beloved by locals for authentic French classics at honest prices' },
      { name: 'Septime', cuisine: 'Modern French', priceRange: '€€€', description: 'Award-winning bistro in the 11th with inventive seasonal menus and natural wines' },
    ],
    cafes: [
      { name: 'Café de Flore', specialty: 'Café crème & croissants', description: 'Legendary Saint-Germain-des-Prés café once frequented by Sartre, de Beauvoir, and Picasso' },
      { name: 'Angelina', specialty: 'African hot chocolate & Mont-Blanc', description: 'Belle Époque tearoom famous for its impossibly thick hot chocolate since 1903' },
      { name: 'Café Procope', specialty: 'French coffee & pastries', description: 'Paris\'s oldest café, opened in 1686, with a rich history linked to the French Revolution' },
    ],
    tips: ['Buy a carnet of 10 metro tickets to save money on transport', 'Book Eiffel Tower tickets online weeks in advance to skip the queues', 'Visit the Louvre on Friday evenings — open until 9:45pm with smaller crowds', 'Most museums are free the first Sunday of each month'],
    expenses: { food: 45, transport: 20, activities: 30 },
  },
  London: {
    attractions: [
      { name: 'Tower of London', description: 'Historic royal fortress housing the Crown Jewels and nearly 1,000 years of British history', category: 'landmark' },
      { name: 'British Museum', description: 'World-class museum with 8 million works spanning human history, art, and culture — and it\'s free', category: 'museum' },
      { name: 'Buckingham Palace', description: 'Official London residence of the monarch; watch the Changing of the Guard ceremony', category: 'landmark' },
      { name: 'Tate Modern', description: 'Iconic former power station turned contemporary art gallery on the South Bank', category: 'museum' },
      { name: 'Borough Market', description: 'London\'s oldest food market with world-class street food, artisan produce, and buzzing atmosphere', category: 'other' },
    ],
    restaurants: [
      { name: 'Dishoom', cuisine: 'Indian Bombay café', priceRange: '€€', description: 'Hugely popular Bombay-style café beloved for its black daal, bacon naan, and all-day dining' },
      { name: 'The Ledbury', cuisine: 'Modern British', priceRange: '€€€', description: 'Two Michelin-starred restaurant in Notting Hill with exceptional seasonal British produce' },
      { name: 'Padella', cuisine: 'Fresh pasta', priceRange: '€', description: 'Borough Market pasta bar with hand-rolled fresh pasta and always a queue worth joining' },
    ],
    cafes: [
      { name: 'Monmouth Coffee', specialty: 'Single-origin filter coffee', description: 'Pioneering specialty coffee roaster in Borough Market, a pilgrimage for coffee lovers since 1978' },
      { name: 'Bageriet', specialty: 'Swedish cinnamon buns & cardamom knots', description: 'Tiny Swedish bakery in Covent Garden with legendary Scandinavian pastries' },
      { name: 'Flat White', specialty: 'Flat white & avocado toast', description: 'Iconic Soho café credited with bringing the flat white to London\'s coffee scene' },
    ],
    tips: ['Get an Oyster card or use contactless for all tube and bus travel', 'National museums and galleries are free — including the British Museum and Tate Modern', 'Book afternoon tea at least a week in advance at top hotels', 'Walk along the South Bank from Tower Bridge to the Tate for free panoramic views'],
    expenses: { food: 50, transport: 25, activities: 30 },
  },
  Rome: {
    attractions: [
      { name: 'Colosseum', description: 'The world\'s most iconic amphitheatre, once hosting gladiatorial battles for 80,000 spectators', category: 'landmark' },
      { name: 'Vatican Museums & Sistine Chapel', description: 'One of the world\'s greatest art collections culminating in Michelangelo\'s breathtaking ceiling', category: 'museum' },
      { name: 'Trevi Fountain', description: 'Rome\'s most famous Baroque fountain — toss a coin to ensure your return to the Eternal City', category: 'landmark' },
      { name: 'Pantheon', description: 'Extraordinarily preserved 2,000-year-old Roman temple with a perfect unreinforced concrete dome', category: 'landmark' },
      { name: 'Borghese Gallery', description: 'Intimate museum with masterpieces by Bernini, Caravaggio, and Raphael in a stunning villa setting', category: 'museum' },
    ],
    restaurants: [
      { name: 'Da Enzo al 29', cuisine: 'Roman trattoria', priceRange: '€€', description: 'Family-run Trastevere trattoria serving authentic cacio e pepe and carbonara as Romans make them' },
      { name: 'Roscioli', cuisine: 'Italian deli & wine bar', priceRange: '€€', description: 'Historic salumeria turned acclaimed restaurant with an extraordinary wine list near Campo de\' Fiori' },
      { name: 'Il Pagliaccio', cuisine: 'Creative Italian', priceRange: '€€€', description: 'Two Michelin-star restaurant blending Japanese precision with Italian ingredients in the historic centre' },
    ],
    cafes: [
      { name: 'Sant\'Eustachio il Caffè', specialty: 'Gran caffè Romano', description: 'Rome\'s most celebrated coffee bar near the Pantheon, roasting beans since 1938 with a secret recipe' },
      { name: 'Barnum Café', specialty: 'Specialty coffee & brunch', description: 'Trendy specialty coffee shop in the historic centre with excellent third-wave espresso' },
      { name: 'Pasticceria Regoli', specialty: 'Maritozzo & Roman pastries', description: 'Beloved 1916 bakery in Esquilino famous for the best maritozzi con la panna in the city' },
    ],
    tips: ['Book Colosseum and Vatican tickets online to avoid hours-long queues', 'Visit the Trevi Fountain early morning (6-7am) for photos without the crowds', 'Sunday mornings, many museums are free', 'Carry a refillable water bottle — Rome\'s nasoni public fountains offer excellent free water'],
    expenses: { food: 40, transport: 10, activities: 25 },
  },
  Barcelona: {
    attractions: [
      { name: 'Sagrada Família', description: 'Gaudí\'s extraordinary unfinished basilica, a UNESCO World Heritage Site and Barcelona\'s defining icon', category: 'landmark' },
      { name: 'Park Güell', description: 'Gaudí\'s fantastical hillside park with colourful mosaics and sweeping views of the city and sea', category: 'park' },
      { name: 'Gothic Quarter', description: 'Barcelona\'s medieval heart with narrow winding streets, Roman ruins, and the magnificent cathedral', category: 'landmark' },
      { name: 'Picasso Museum', description: 'One of the most important Picasso collections in the world housed in five medieval palaces', category: 'museum' },
      { name: 'Casa Batlló', description: 'Gaudí\'s breathtaking residential masterpiece on the Passeig de Gràcia, alive with colour and fantasy', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Bar del Pla', cuisine: 'Modern Catalan tapas', priceRange: '€€', description: 'Consistently excellent tapas bar near the Picasso Museum beloved by locals and in-the-know visitors' },
      { name: 'Tickets', cuisine: 'Creative tapas', priceRange: '€€€', description: 'Albert Adrià\'s electrifying avant-garde tapas bar — book months ahead for a truly unique experience' },
      { name: 'La Cova Fumada', cuisine: 'Catalan seafood', priceRange: '€€' as const, description: 'Cash-only Barceloneta institution credited with inventing the bombas (potato croquettes) in the 1930s' },
    ],
    cafes: [
      { name: 'Satan\'s Coffee Corner', specialty: 'Specialty espresso & filter', description: 'Barcelona\'s most acclaimed specialty coffee shop in the Gothic Quarter, beloved by coffee nerds' },
      { name: 'Federal Café', specialty: 'Brunch & flat whites', description: 'Australian-inspired café in Sant Antoni with exceptional brunches and a beautiful sunny terrace' },
      { name: 'Nomad Coffee Lab', specialty: 'Single-origin pour-overs', description: 'Barcelona\'s pioneering specialty roaster with a tasting room in the Born neighbourhood' },
    ],
    tips: ['Book Sagrada Família and Park Güell tickets online well in advance — they sell out weeks ahead', 'Eat lunch (2-4pm) like locals for cheaper menú del día set menus', 'The Barcelona Card gives unlimited public transport and museum discounts', 'Beaches are quieter in the morning before 11am and after 6pm'],
    expenses: { food: 40, transport: 15, activities: 25 },
  },
  Amsterdam: {
    attractions: [
      { name: 'Rijksmuseum', description: 'The Netherlands\' premier museum with Rembrandt\'s Night Watch and Vermeer\'s Milkmaid among 8,000 masterpieces', category: 'museum' },
      { name: 'Anne Frank House', description: 'Deeply moving museum in the secret annex where Anne Frank wrote her diary during WWII', category: 'landmark' },
      { name: 'Van Gogh Museum', description: 'The world\'s largest Van Gogh collection with over 200 paintings in a purpose-built museum', category: 'museum' },
      { name: 'Jordaan District', description: 'Amsterdam\'s most charming neighbourhood with independent galleries, boutiques, and brown cafes on canal-lined streets', category: 'other' },
      { name: 'Vondelpark', description: 'Amsterdam\'s beloved urban park — perfect for a picnic, cycling, or people-watching', category: 'park' },
    ],
    restaurants: [
      { name: 'Restaurant Daalder', cuisine: 'Modern Dutch', priceRange: '€€€', description: 'Michelin-starred Jordaan restaurant showcasing the best of seasonal Dutch produce with creativity' },
      { name: "Brouwerij 't IJ", cuisine: 'Dutch pub food & craft beer', priceRange: '€', description: 'Iconic microbrewery inside a windmill serving award-winning beers and hearty Dutch bites' },
      { name: 'De Kas', cuisine: 'Farm-to-table Dutch', priceRange: '€€€', description: 'Beautiful greenhouse restaurant growing its own herbs and vegetables for a truly fresh seasonal menu' },
    ],
    cafes: [
      { name: 'Screaming Beans', specialty: 'Specialty coffee & pastries', description: 'Amsterdam\'s most renowned specialty roaster with multiple locations and exceptional single-origins' },
      { name: 'Lot Sixty One', specialty: 'Flat white & filter coffee', description: 'Beloved Jordaan specialty coffee shop with a warm neighbourhood atmosphere' },
      { name: 'Winkel 43', specialty: 'Apple pie & coffee', description: 'Famous Noordermarkt café serving what many claim is Amsterdam\'s best apple pie since 1974' },
    ],
    tips: ['Rent a bicycle to explore like a true local — it\'s the best way to see Amsterdam', 'Book Anne Frank House tickets online months ahead — they sell out very quickly', 'The I Amsterdam Card offers free museum entry and unlimited public transport', 'Friday and Saturday markets at Noordermarkt are not to be missed'],
    expenses: { food: 40, transport: 10, activities: 30 },
  },
  Istanbul: {
    attractions: [
      { name: 'Hagia Sophia', description: 'Byzantine architectural marvel turned mosque, a 1,500-year-old wonder that dominates the Istanbul skyline', category: 'landmark' },
      { name: 'Topkapi Palace', description: 'Opulent Ottoman imperial palace with priceless treasures, the Harem, and sweeping Bosphorus views', category: 'landmark' },
      { name: 'Grand Bazaar', description: 'One of the world\'s oldest and largest covered markets with over 4,000 shops across 61 covered streets', category: 'other' },
      { name: 'Blue Mosque', description: 'Sultan Ahmed Mosque, famous for its six minarets and stunning interior of 20,000 blue Iznik tiles', category: 'landmark' },
      { name: 'Basilica Cistern', description: 'Mysterious 6th-century underground water reservoir supported by 336 marble columns — eerie and beautiful', category: 'other' },
    ],
    restaurants: [
      { name: 'Mikla', cuisine: 'New Anatolian', priceRange: '€€€', description: 'Chef Mehmet Gürs\'s acclaimed rooftop restaurant celebrating Turkey\'s diverse culinary heritage with stunning views' },
      { name: 'Karaköy Lokantası', cuisine: 'Traditional Turkish meyhane', priceRange: '€€', description: 'Beloved Karaköy meyhane with outstanding meze, seafood, and the perfect Friday lunch atmosphere' },
      { name: 'Hamdi Restaurant', cuisine: 'Southeastern Turkish kebabs', priceRange: '€€', description: 'Legendary multi-storey kebab restaurant near the Egyptian Bazaar with panoramic Golden Horn views' },
    ],
    cafes: [
      { name: 'Mandabatmaz', specialty: 'Turkish filter coffee', description: 'Iconic closet-sized coffee shop off İstiklal serving the most intense traditional Turkish coffee since 1967' },
      { name: 'Karaköy Güllüoğlu', specialty: 'Baklava & Turkish tea', description: 'The finest baklava in Istanbul, freshly made daily in Karaköy by a family dynasty of sweet masters' },
      { name: 'Kronotrop', specialty: 'Specialty coffee', description: 'Istanbul\'s leading specialty coffee roaster with a hip Cihangir café beloved by the local creative crowd' },
    ],
    tips: ['Get an Istanbulkart for discounted transport on trams, buses, and the metro', 'Bargaining is expected and enjoyed in the Grand Bazaar — start at 50% of the asking price', 'Take the Üsküdar ferry across the Bosphorus for the best city views at almost no cost', 'Many mosques require modest dress — carry a scarf just in case'],
    expenses: { food: 25, transport: 10, activities: 20 },
  },
  Prague: {
    attractions: [
      { name: 'Prague Castle', description: 'The world\'s largest ancient castle complex with stunning Gothic, Romanesque, and Baroque architecture', category: 'landmark' },
      { name: 'Charles Bridge', description: 'Magnificent 14th-century stone bridge lined with 30 Baroque statues crossing the Vltava River', category: 'landmark' },
      { name: 'Old Town Square', description: 'Stunning medieval square with the Astronomical Clock, Týn Church, and vibrant street life', category: 'landmark' },
      { name: 'National Museum', description: 'Czech Republic\'s foremost museum in a spectacular Neo-Renaissance building on Wenceslas Square', category: 'museum' },
      { name: 'Josefov (Jewish Quarter)', description: 'Europe\'s best-preserved Jewish heritage quarter with six historic synagogues and the Old Jewish Cemetery', category: 'other' },
    ],
    restaurants: [
      { name: 'Field', cuisine: 'Modern Czech', priceRange: '€€€', description: 'Michelin-starred restaurant reinterpreting Czech cuisine with exceptional seasonal produce and creativity' },
      { name: 'U Fleků', cuisine: 'Traditional Czech', priceRange: '€€', description: 'Historic brewery restaurant operating since 1499, perfect for svíčková, goulash, and dark lager' },
      { name: 'Lokál Dlouhááá', cuisine: 'Czech pub food', priceRange: '€', description: 'Legendary Old Town pub with perfectly poured Pilsner Urquell and outstanding traditional Czech food' },
    ],
    cafes: [
      { name: 'Cafe Louvre', specialty: 'Viennese coffee & cake', description: 'Legendary 1902 café on Národní street once frequented by Einstein and Kafka, still serving superb coffee' },
      { name: 'EMA Espresso Bar', specialty: 'Specialty espresso', description: 'Prague\'s best specialty coffee shop in the New Town with perfectly extracted espresso and a relaxed vibe' },
      { name: 'Café Savoy', specialty: 'Viennese pastries & breakfast', description: 'Beautifully restored Neo-Renaissance café with exquisite house-made pastries and a superb breakfast menu' },
    ],
    tips: ['Prague is very walkable — the historic centre takes about 30 minutes to cross on foot', 'Avoid exchanging money at airport kiosks — use ATMs in the city for better rates', 'Book dinner at popular restaurants at least a week ahead, especially in summer', 'Cross Charles Bridge at dawn for a magical crowd-free experience'],
    expenses: { food: 25, transport: 8, activities: 20 },
  },
  Vienna: {
    attractions: [
      { name: 'Schönbrunn Palace', description: 'Habsburg imperial summer palace with 1,441 rooms, formal gardens, and a hilltop gloriette with city views', category: 'landmark' },
      { name: 'Kunsthistorisches Museum', description: 'One of the world\'s great art museums with imperial collections of Bruegel, Titian, Raphael, and Vermeer', category: 'museum' },
      { name: 'Belvedere Palace', description: 'Baroque masterpiece housing Klimt\'s The Kiss and outstanding Austrian art in stunning formal gardens', category: 'landmark' },
      { name: 'St. Stephen\'s Cathedral', description: 'Vienna\'s iconic Gothic cathedral with intricate roof tiles and a tower offering panoramic city views', category: 'landmark' },
      { name: 'Naschmarkt', description: 'Vienna\'s most famous outdoor market with 120 stalls of gourmet produce, street food, and Saturday flea market', category: 'other' },
    ],
    restaurants: [
      { name: 'Steirereck im Stadtpark', cuisine: 'Austrian nouvelle cuisine', priceRange: '€€€', description: 'Consistently ranked among Europe\'s top restaurants, celebrating Austrian ingredients with extraordinary skill' },
      { name: 'Figlmüller Wollzeile', cuisine: 'Traditional Viennese', priceRange: '€€', description: 'Legendary Schnitzel restaurant serving Vienna\'s most celebrated Wiener Schnitzel since 1905' },
      { name: 'Zum Wohl', cuisine: 'Austrian wine bar & small plates', priceRange: '€€', description: 'Outstanding Austrian wine list paired with creative small plates in a convivial inner-city setting' },
    ],
    cafes: [
      { name: 'Café Central', specialty: 'Viennese coffee & Apfelstrudel', description: 'Grand Neo-Gothic Ringstraße café where Freud, Trotsky, and Klimt once debated — still unmissable' },
      { name: 'Café Hawelka', specialty: 'Melange & Buchteln', description: 'Legendary 1939 Viennese institution beloved for its bohemian atmosphere and unmissable warm yeast pastries' },
      { name: 'Café Schwarzenberg', specialty: 'Viennese breakfast & Sachertorte', description: 'Vienna\'s oldest Ringstraße café with spectacular views of the Opera and classic Viennese grandeur' },
    ],
    tips: ['The Vienna City Card gives unlimited transport and museum discounts for 24, 48, or 72 hours', 'Standing room opera tickets at the Staatsoper cost just €3-4 — queue 80 minutes before curtain', 'Many Vienna museums are free on public holidays', 'Tipping 5-10% is customary in Viennese restaurants and cafés'],
    expenses: { food: 40, transport: 12, activities: 25 },
  },
  Athens: {
    attractions: [
      { name: 'Acropolis & Parthenon', description: 'Ancient citadel with the most perfect Doric temple ever built, overlooking the city it defined for millennia', category: 'landmark' },
      { name: 'Acropolis Museum', description: 'World-class museum housing the original Parthenon sculptures in a stunning modern building at the foot of the rock', category: 'museum' },
      { name: 'Ancient Agora', description: 'The birthplace of democracy where Socrates debated, with the beautifully preserved Temple of Hephaestus', category: 'landmark' },
      { name: 'Monastiraki', description: 'Vibrant flea market district with antiques, street food, and beautiful views of the Acropolis', category: 'other' },
      { name: 'National Archaeological Museum', description: 'The most important collection of ancient Greek antiquities in the world — an unmissable treasure house', category: 'museum' },
    ],
    restaurants: [
      { name: 'Spondi', cuisine: 'French-Mediterranean', priceRange: '€€€', description: 'Athens\' most acclaimed fine dining restaurant with two Michelin stars in a romantic garden courtyard' },
      { name: 'Diporto Agoras', cuisine: 'Traditional Greek taverna', priceRange: '€', description: 'Underground market taverna open since 1887, serving whatever\'s fresh that day to a loyal local following' },
      { name: 'Vezene', cuisine: 'Modern Greek', priceRange: '€€€', description: 'Chef Gikas Xenakis\'s celebrated modern Greek restaurant with outstanding local produce and natural wines' },
    ],
    cafes: [
      { name: 'Tailor Made', specialty: 'Specialty coffee & brunch', description: 'Kolonaki\'s most beloved specialty coffee bar with superb single-origins and exceptional brunch offerings' },
      { name: 'Taf Coffee', specialty: 'Single-origin espresso', description: 'Athens\' pioneering specialty roaster in Monastiraki, a must-visit for serious coffee enthusiasts' },
      { name: 'To Palio Tetradio', specialty: 'Greek coffee & loukoumades', description: 'Charming Plaka café serving traditional Greek frappé and honey-drenched loukoumades since the 1970s' },
    ],
    tips: ['Buy a combined ticket for the Acropolis that covers five other major archaeological sites', 'Visit the Acropolis at opening time (8am) to beat the summer heat and crowds', 'Athens\' meze culture means sharing lots of small plates — ideal for exploring the cuisine', 'The Athens Metro is fast, cheap, and even has archaeological exhibits at several stations'],
    expenses: { food: 35, transport: 8, activities: 20 },
  },
  Budapest: {
    attractions: [
      { name: 'Hungarian Parliament Building', description: 'Europe\'s most beautiful parliament building on the Danube, a Neo-Gothic masterpiece best seen from the Buda side', category: 'landmark' },
      { name: 'Széchenyi Thermal Bath', description: 'Budapest\'s most famous thermal bath complex with outdoor pools, saunas, and Neo-Baroque architecture since 1913', category: 'other' },
      { name: 'Buda Castle', description: 'Historic palace complex on Castle Hill with the National Gallery, Budapest History Museum, and stunning city views', category: 'landmark' },
      { name: 'Fisherman\'s Bastion', description: 'Fairy-tale Neo-Romanesque terrace on Buda Castle Hill with the most spectacular views of the Parliament', category: 'landmark' },
      { name: 'Hungarian National Museum', description: 'Hungary\'s most important historical museum with artefacts spanning 3,000 years of Hungarian history', category: 'museum' },
    ],
    restaurants: [
      { name: 'Costes', cuisine: 'Modern European', priceRange: '€€€', description: 'Hungary\'s first Michelin-starred restaurant, still delivering exceptional modern European cuisine with local flair' },
      { name: 'Gundel', cuisine: 'Classic Hungarian', priceRange: '€€€', description: 'Hungary\'s most historic restaurant since 1894, serving classic Hungarian cuisine including the famous Gundel pancake' },
      { name: 'Borkonyha Winekitchen', cuisine: 'Modern Hungarian', priceRange: '€€€', description: 'Michelin-starred Buda restaurant with an outstanding Hungarian wine list and creative seasonal cuisine' },
    ],
    cafes: [
      { name: 'Gerbeaud', specialty: 'Hungarian cakes & hot chocolate', description: 'Budapest\'s most iconic café on Vörösmarty Square serving exquisite Hungarian pastries since 1858' },
      { name: 'My Little Melbourne', specialty: 'Specialty coffee & brunch', description: 'The coffee shop that brought Australian specialty coffee culture to Budapest with exceptional flat whites' },
      { name: 'New York Café', specialty: 'Viennese coffee & Hungarian cake', description: 'The world\'s most beautiful café — an extraordinary 1894 palace of gilded mirrors, frescoes, and chandeliers' },
    ],
    tips: ['Budapest spa etiquette: bring flip flops, a towel, and arrive at off-peak times to enjoy the baths', 'The Budapest Card gives free public transport and museum entry for 24, 48, or 72 hours', 'Ruin bars (romkocsmák) in the Jewish Quarter are unique to Budapest — don\'t miss Szimpla Kert', 'Take the Number 2 tram along the Danube for some of the best city views for the price of a ticket'],
    expenses: { food: 30, transport: 8, activities: 20 },
  },
  Lisbon: {
    attractions: [
      { name: 'Belém Tower', description: 'Magnificent 16th-century Manueline fortress on the Tagus, a UNESCO World Heritage Site and symbol of the Age of Discovery', category: 'landmark' },
      { name: 'Jerónimos Monastery', description: 'Extraordinary Manueline monastery built to celebrate Vasco da Gama\'s voyage to India — a breathtaking UNESCO treasure', category: 'landmark' },
      { name: 'Alfama District', description: 'Lisbon\'s oldest and most atmospheric neighbourhood of winding cobbled streets, miradouros, and Fado music', category: 'other' },
      { name: 'Museu Nacional do Azulejo', description: 'Unique museum dedicated to 500 years of Portuguese azulejo tile making housed in a stunning 16th-century convent', category: 'museum' },
      { name: 'LX Factory', description: 'Creative hub in a converted 19th-century industrial complex with restaurants, shops, galleries, and weekend markets', category: 'other' },
    ],
    restaurants: [
      { name: 'Solar dos Presuntos', cuisine: 'Traditional Portuguese', priceRange: '€€', description: 'Lisbon institution since 1976 serving outstanding bacalhau, suckling pig, and the finest Portuguese wines' },
      { name: 'Belcanto', cuisine: 'Modern Portuguese', priceRange: '€€€', description: 'José Avillez\'s two-Michelin-star flagship, brilliantly reimagining classic Portuguese cuisine with precision and artistry' },
      { name: 'Taberna da Rua das Flores', cuisine: 'Petiscos (Portuguese tapas)', priceRange: '€€', description: 'Outstanding traditional taberna in Chiado serving creative petiscos with seasonal produce and natural wines' },
    ],
    cafes: [
      { name: 'Pastéis de Belém', specialty: 'Pastel de nata & bica', description: 'The original home of the Portuguese custard tart since 1837 — still made to the original secret recipe' },
      { name: 'Café A Brasileira', specialty: 'Bica & traditional pastries', description: 'Iconic 1905 Chiado café with a famous Fernando Pessoa statue outside and superb traditional coffee' },
      { name: 'Copenhagen Coffee Lab', specialty: 'Specialty filter coffee', description: 'Lisbon\'s most acclaimed specialty coffee destination with Scandinavian precision and exceptional sourcing' },
    ],
    tips: ['Tram 28 is iconic but extremely crowded — walk the same route through Alfama instead for a better experience', 'Try a bica (espresso) standing at a café counter — it\'s half the price of sitting down', 'Most major monuments are free on Sunday mornings', 'Time Out Market Lisboa in Cais do Sodré is a must for a gourmet lunch or dinner'],
    expenses: { food: 35, transport: 10, activities: 20 },
  },
  Berlin: {
    attractions: [
      { name: 'Brandenburg Gate', description: 'Berlin\'s most iconic neoclassical monument and symbol of German reunification at the heart of the city', category: 'landmark' },
      { name: 'Berlin Wall Memorial', description: 'Moving outdoor memorial on Bernauer Strasse preserving the last intact section of the Wall with watchtower', category: 'landmark' },
      { name: 'Museum Island', description: 'UNESCO World Heritage Site with five world-class museums including the Pergamon and the Neues Museum', category: 'museum' },
      { name: 'East Side Gallery', description: 'The longest preserved stretch of the Berlin Wall (1.3km) transformed into the world\'s largest open-air gallery', category: 'other' },
      { name: 'Berlinische Galerie', description: 'Outstanding museum of modern art, photography, and architecture celebrating Berlin\'s unique 20th-century story', category: 'museum' },
    ],
    restaurants: [
      { name: 'Nobelhart & Schmutzig', cuisine: 'Radical local Berlin cuisine', priceRange: '€€€', description: 'Billy Wagner\'s radical locavore restaurant using only local Brandenburg produce, earning a Michelin star' },
      { name: 'Zur Letzten Instanz', cuisine: 'Traditional Berlin', priceRange: '€€', description: 'Berlin\'s oldest restaurant (1621) serving classic Eisbein, Berliner Leber, and hearty Prussian cuisine' },
      { name: 'Markthalle Neun', cuisine: 'Berlin street food market', priceRange: '€', description: 'Kreuzberg\'s beloved 1891 market hall with street food Thursdays, weekend traders, and artisan producers' },
    ],
    cafes: [
      { name: 'The Barn', specialty: 'Specialty espresso & filter', description: 'Berlin\'s pioneering specialty roaster with multiple cafés across the city, setting the standard since 2010' },
      { name: 'Bonanza Coffee', specialty: 'Single-origin filter', description: 'Prenzlauer Berg specialty roaster beloved for its precision brewing and consistently exceptional coffees' },
      { name: 'Café Einstein Stammhaus', specialty: 'Viennese coffee & Strudel', description: 'Berlin\'s most elegant Viennese coffeehouse in a grand 1879 villa, perfect for Melange and people-watching' },
    ],
    tips: ['The Berlin Welcome Card includes unlimited transport and museum discounts', 'Many excellent art galleries, particularly in Mitte and Kreuzberg, are free to enter', 'Berlin is a city of neighbourhoods — explore Prenzlauer Berg, Neukölln, and Kreuzberg on foot', 'Currywurst from Curry 36 in Mehringdamm is the authentic Berlin street food experience'],
    expenses: { food: 35, transport: 15, activities: 20 },
  },
  Madrid: {
    attractions: [
      { name: 'Museo del Prado', description: 'One of the world\'s greatest art collections with Velázquez\'s Las Meninas, Goya\'s Black Paintings, and Bosch', category: 'museum' },
      { name: 'Retiro Park', description: 'Madrid\'s magnificent 140-hectare royal park with the Crystal Palace, rose garden, and boating lake', category: 'park' },
      { name: 'Reina Sofía Museum', description: 'Spain\'s national museum of modern art housing Picasso\'s Guernica and major works by Miró and Dalí', category: 'museum' },
      { name: 'Royal Palace of Madrid', description: 'Europe\'s largest royal palace with 3,418 rooms, the official residence of the Spanish Royal Family', category: 'landmark' },
      { name: 'Mercado de San Miguel', description: 'Beautiful 1916 cast-iron market hall with the finest Spanish produce, tapas, and a buzzing social atmosphere', category: 'other' },
    ],
    restaurants: [
      { name: 'DiverXO', cuisine: 'Avant-garde Spanish', priceRange: '€€€', description: 'David Muñoz\'s three-Michelin-star restaurant — the most creative and thrilling dining experience in Spain' },
      { name: 'Sobrino de Botín', cuisine: 'Traditional Castilian', priceRange: '€€€', description: 'The world\'s oldest restaurant (1725) according to Guinness, famous for cochinillo asado and roast lamb' },
      { name: 'Bar El Viajero', cuisine: 'Modern Spanish tapas', priceRange: '€€', description: 'La Latina favourite with rooftop terrace, perfect for Sunday vermouth and tapas after the El Rastro market' },
    ],
    cafes: [
      { name: 'Café Comercial', specialty: 'Traditional Spanish coffee & churros', description: 'Madrid\'s oldest café (1887) on Glorieta de Bilbao, recently revived and still serving perfect café con leche' },
      { name: 'HanSo Café', specialty: 'Specialty espresso & brunch', description: 'Malasaña\'s top specialty coffee shop with outstanding beans and a relaxed weekend brunch crowd' },
      { name: 'Chocolatería San Ginés', specialty: 'Hot chocolate & churros', description: 'Madrid institution since 1894, open 24 hours, serving the definitive thick chocolate and crispy churros' },
    ],
    tips: ['Madrid\'s Prado and Reina Sofía are free in the last 2 hours before closing — check exact times', 'Madrileños eat lunch at 2-3pm and dinner at 10pm — eating earlier marks you as a tourist', 'El Rastro flea market on Sunday mornings in La Latina is unmissable', 'The Barajas airport metro is cheap and takes 25 minutes to the centre'],
    expenses: { food: 40, transport: 12, activities: 22 },
  },
  Dubai: {
    attractions: [
      { name: 'Burj Khalifa', description: 'The world\'s tallest building at 828m — visit the observation deck at sunset for incomparable views', category: 'landmark' },
      { name: 'Dubai Museum & Al Fahidi Fort', description: 'Dubai\'s oldest surviving building (1787) with fascinating exhibits tracing the city\'s transformation from fishing village to megacity', category: 'museum' },
      { name: 'Gold Souk', description: 'The most dazzling gold market in the world with over 380 retailers in a traditional covered arcade in Deira', category: 'other' },
      { name: 'Dubai Creek', description: 'The historic waterway dividing Old Dubai, best explored by traditional wooden abra ferry for just 1 dirham', category: 'other' },
      { name: 'Jumeirah Mosque', description: 'Dubai\'s most beautiful mosque, open to non-Muslim visitors for guided tours on five mornings a week', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Zuma Dubai', cuisine: 'Contemporary Japanese izakaya', priceRange: '€€€', description: 'Dubai\'s most glamorous Japanese izakaya in DIFC — exceptional robata grills and sashimi in a stunning space' },
      { name: 'Al Fanar Restaurant', cuisine: 'Emirati cuisine', priceRange: '€€', description: 'The best place to experience traditional Emirati cooking including lamb ouzi and camel milk desserts' },
      { name: 'Bu Qtair', cuisine: 'Dubai seafood', priceRange: '€', description: 'Legendary no-frills fishermen\'s shack near Jumeirah serving some of Dubai\'s best grilled fish and shrimp curry' },
    ],
    cafes: [
      { name: 'Café Rider', specialty: 'Specialty coffee & toasties', description: 'Al Quoz art district\'s most beloved specialty coffee shop with an outstanding single-origin rotating menu' },
      { name: 'Nightjar', specialty: 'Specialty coffee & Arabic pastries', description: 'Tucked away in Al Serkal Avenue with exceptional specialty coffee and a creative menu of pastries' },
      { name: 'Common Grounds', specialty: 'Brunch & specialty espresso', description: 'One of Dubai\'s top specialty coffee destinations with exceptional beans and consistently perfect extraction' },
    ],
    tips: ['Download the RTA Dubai app for buses and metro — buy a Nol card for cheaper fares', 'Cover your shoulders and knees when visiting mosques and traditional areas', 'Most malls and souks are air-conditioned — useful refuge from the heat between 12-4pm', 'Haggling is acceptable and expected in the souks — start at 50% of the first quoted price'],
    expenses: { food: 45, transport: 15, activities: 30 },
  },
  Bucharest: {
    attractions: [
      { name: 'Palace of Parliament', description: 'The world\'s heaviest and second-largest building — a colossal and controversial testament to Ceaușescu\'s megalomaniac vision', category: 'landmark' },
      { name: 'Old Town (Lipscani)', description: 'Bucharest\'s vibrant historic centre with medieval cellars turned cocktail bars, excellent restaurants, and buzzing nightlife', category: 'other' },
      { name: 'Romanian Athenaeum', description: 'Romania\'s most magnificent concert hall — a stunning 1888 Neo-Classical rotunda adorned with spectacular frescoes', category: 'landmark' },
      { name: 'National Museum of Art', description: 'Housed in the former Royal Palace with Romania\'s finest art collections and an exceptional gallery of European masters', category: 'museum' },
      { name: 'Herăstrău Park', description: 'Bucharest\'s largest park surrounding a lake — perfect for cycling, rowing, and relaxing away from the city', category: 'park' },
    ],
    restaurants: [
      { name: 'Lacrimi și Sfinți', cuisine: 'Creative Romanian', priceRange: '€€€', description: 'Joseph Hadad\'s most celebrated Bucharest restaurant, brilliantly reinventing Romanian cuisine with modern technique' },
      { name: 'Vatra', cuisine: 'Traditional Romanian', priceRange: '€€', description: 'Beloved Old Town restaurant serving outstanding traditional mămăligă, sarmale, and other Romanian classics' },
      { name: 'Caru\' cu Bere', cuisine: 'Romanian brasserie', priceRange: '€€', description: 'Bucharest\'s most beautiful restaurant (1879) in an extraordinary Neo-Gothic building with stained glass and painted ceilings' },
    ],
    cafes: [
      { name: 'Ground Zero', specialty: 'Specialty espresso & brunch', description: 'Bucharest\'s finest specialty coffee destination with obsessive attention to extraction and rotating single-origins' },
      { name: 'Bob Coffee Lab', specialty: 'Filter coffee & pastries', description: 'Beloved Floreasca specialty café with some of Bucharest\'s best coffees and a warm, neighbourhood atmosphere' },
      { name: 'Tucano Coffee', specialty: 'Romanian coffee chain & coworking', description: 'Romania\'s homegrown specialty coffee chain with locations across the city and consistently excellent espresso' },
    ],
    tips: ['Grab a day pass on the STB app for unlimited bus, tram, metro, and trolleybus travel for just 8 RON', 'The Palace of Parliament tour must be booked in advance — only guided tours are permitted', 'Old Town bars are legendary but expensive — locals drink in Floreasca and Dorobanți neighbourhoods', 'Bucharest\'s coffee scene is world-class and remarkably affordable compared to Western Europe'],
    expenses: { food: 20, transport: 5, activities: 15 },
  },
  Bali: {
    attractions: [
      { name: 'Tanah Lot Temple', description: 'Bali\'s most iconic sea temple dramatically perched on a rocky outcrop, best visited at sunset', category: 'landmark' },
      { name: 'Ubud Sacred Monkey Forest', description: 'Ancient Hindu temple complex and nature reserve inhabited by hundreds of grey long-tailed macaques', category: 'park' },
      { name: 'Tegallalang Rice Terraces', description: 'Breathtaking UNESCO-listed cascading rice paddies north of Ubud, a masterpiece of traditional Balinese subak irrigation', category: 'other' },
      { name: 'Tirta Empul Temple', description: 'Sacred Hindu water temple where Balinese Hindus purify themselves in the holy spring pools — deeply moving', category: 'landmark' },
      { name: 'Seminyak Beach', description: 'Bali\'s most stylish beach with world-class sunset beach clubs, surf breaks, and beautiful golden sunsets', category: 'other' },
    ],
    restaurants: [
      { name: 'Locavore', cuisine: 'Progressive Indonesian', priceRange: '€€€', description: 'Indonesia\'s most celebrated fine dining restaurant in Ubud, sourcing exclusively from local Balinese farms' },
      { name: 'Warung Babi Guling Ibu Oka', cuisine: 'Balinese suckling pig', priceRange: '€', description: 'Legendary Ubud warung made famous by Anthony Bourdain serving Bali\'s finest babi guling since the 1980s' },
      { name: 'Mozaic Restaurant', cuisine: 'French-Indonesian fusion', priceRange: '€€€', description: 'Award-winning Ubud restaurant blending classical French technique with extraordinary Indonesian ingredients' },
    ],
    cafes: [
      { name: 'Seniman Coffee Studio', specialty: 'Indonesian single-origin', description: 'Ubud\'s leading specialty coffee destination showcasing outstanding Indonesian single-origin coffees from across the archipelago' },
      { name: 'Expat. Roasters', specialty: 'Specialty pour-over & espresso', description: 'Seminyak\'s top specialty roaster with meticulously sourced Indonesian beans and a relaxed surf-town atmosphere' },
      { name: 'Revolver', specialty: 'Espresso & avocado toast', description: 'Seminyak institution beloved by surfers and expats for its excellent espresso and excellent all-day brunch menu' },
    ],
    tips: ['Rent a scooter (IDR 70-100k per day) to explore like a local — essential outside of Ubud and Seminyak', 'Temple dress code is strict — always carry a sarong and sash (can be rented at the entrance)', 'Book a traditional Balinese massage every day — it costs less than €10 and is extraordinary', 'Avoid plastic bottles: bring a filter bottle and refill at Bali\'s many refill stations for 2000 IDR'],
    expenses: { food: 20, transport: 10, activities: 25 },
  },
  Santorini: {
    attractions: [
      { name: 'Oia Village', description: 'The most photographed village in the Aegean with iconic blue-domed churches, winding alleyways, and the world\'s best sunsets', category: 'landmark' },
      { name: 'Ancient Akrotiri', description: 'Remarkably preserved Minoan Bronze Age city buried by volcanic ash 3,600 years ago — the Pompeii of the Aegean', category: 'other' },
      { name: 'Fira', description: 'Santorini\'s capital clinging to the caldera rim with spectacular views, vibrant café culture, and excellent shopping', category: 'other' },
      { name: 'Red Beach', description: 'Dramatic volcanic beach with towering red and black lava cliffs framing unique terracotta-coloured sands', category: 'other' },
      { name: 'Santo Wines Winery', description: 'Santorini\'s most celebrated winery with exceptional Assyrtiko tastings overlooking the volcanic caldera', category: 'other' },
    ],
    restaurants: [
      { name: 'Metaxy Mas', cuisine: 'Modern Greek', priceRange: '€€€', description: 'Santorini\'s most acclaimed restaurant in Exo Gonia with extraordinary local ingredients and a stunning private terrace' },
      { name: 'Selene', cuisine: 'Contemporary Greek', priceRange: '€€€', description: 'Pioneer of Cycladic cuisine, celebrating Santorini\'s unique volcanic produce in an iconic cliffside setting in Pyrgos' },
      { name: 'Argo Restaurant', cuisine: 'Seafood & Greek', priceRange: '€€', description: 'Fira\'s most popular seafood restaurant with authentic fish fresh from the port and outstanding caldera views' },
    ],
    cafes: [
      { name: 'Oia Café', specialty: 'Greek coffee & breakfast', description: 'Iconic caldera-view café at the edge of Oia, perfect for a slow morning coffee watching the Aegean come alive' },
      { name: '1800 Restaurant & Bar', specialty: 'Cocktails & Greek coffee', description: 'Oia\'s most beautiful neoclassical mansion turned atmospheric cocktail bar — don\'t miss the sunset drinks' },
      { name: 'Fira Coffee Roasters', specialty: 'Specialty espresso', description: 'Santorini\'s best specialty coffee shop in Fira, with locally roasted beans and breathtaking caldera views' },
    ],
    tips: ['Book sunset viewing spots in Oia at restaurants 2-3 days ahead — it gets extremely crowded', 'Rent an ATV (€30-50/day) to explore the island at your own pace', 'Visit Akrotiri and the beaches in the morning to beat the cruise ship crowds', 'The island bus service is cheap but slow — taxis and ATVs are faster for longer distances'],
    expenses: { food: 50, transport: 20, activities: 30 },
  },
};

function generateFallbackContent(dest: DestinationProfile, nights: number, styles: string[]) {
  const styleText = styles.slice(0, 2).join(' and ') || 'adventure';
  const cityData = CITY_FALLBACK_DATA[dest.city];

  if (cityData) {
    return {
      description: `Discover the magic of ${dest.city} on this perfectly curated ${nights}-night journey. From iconic landmarks to hidden local gems, this trip combines the best of ${dest.country}'s culture, history, and gastronomy.`,
      whyThisTrip: `This trip is perfect for ${styleText} lovers seeking an unforgettable experience in one of ${dest.country}'s most captivating destinations.`,
      dayByDay: Array.from({ length: Math.min(nights, 5) }, (_, i) => ({
        day: i + 1,
        title: i === 0 ? `Arrival in ${dest.city}` : i === nights - 1 ? 'Final Day & Departure' : `Explore ${dest.city} — Day ${i + 1}`,
        morning: { activity: i === 0 ? 'Airport arrival & hotel check-in' : `Visit ${cityData.attractions[Math.min(i, cityData.attractions.length - 1)].name}`, description: i === 0 ? 'Get settled in and freshen up for the adventure ahead' : cityData.attractions[Math.min(i, cityData.attractions.length - 1)].description, type: i === 0 ? 'transport' : 'sightseeing' },
        afternoon: { activity: `Explore ${dest.city} neighbourhoods`, description: `Wander through local streets, markets, and hidden corners of ${dest.city}`, type: 'sightseeing' },
        evening: { activity: `Dinner at ${cityData.restaurants[i % cityData.restaurants.length].name}`, description: cityData.restaurants[i % cityData.restaurants.length].description, type: 'dining' },
      })),
      topAttractions: cityData.attractions,
      topRestaurants: cityData.restaurants,
      topCafes: cityData.cafes,
      localTips: cityData.tips,
      estimatedDailyExpenses: cityData.expenses,
    };
  }

  // Generic fallback for unknown cities
  return {
    description: `Discover the magic of ${dest.city} on this perfectly curated ${nights}-night journey. From iconic landmarks to hidden local gems, this trip combines the best of ${dest.country}'s culture and beauty.`,
    whyThisTrip: `This trip is perfect for ${styleText} lovers looking for an unforgettable experience in ${dest.city}.`,
    dayByDay: Array.from({ length: Math.min(nights, 5) }, (_, i) => ({
      day: i + 1,
      title: i === 0 ? `Arrival in ${dest.city}` : i === nights - 1 ? 'Final Day & Departure' : `Explore ${dest.city} - Day ${i + 1}`,
      morning: { activity: i === 0 ? 'Airport arrival & hotel check-in' : 'Breakfast at local café', description: 'Start your day fresh', type: i === 0 ? 'transport' : 'dining' },
      afternoon: { activity: `Explore ${dest.city} highlights`, description: 'Visit the top sights and local neighbourhoods', type: 'sightseeing' },
      evening: { activity: 'Dinner at a local restaurant', description: `Enjoy the best of ${dest.country} cuisine`, type: 'dining' },
    })),
    topAttractions: [
      { name: `${dest.city} Historic Centre`, description: `The vibrant heart of ${dest.city} with centuries of history and culture`, category: 'landmark' as const },
      { name: `National Museum of ${dest.country}`, description: `Discover ${dest.country}'s rich cultural heritage through fascinating exhibits`, category: 'museum' as const },
      { name: `${dest.city} Central Market`, description: 'Browse local crafts, fresh produce, and authentic street food', category: 'other' as const },
      { name: `${dest.city} Panorama Viewpoint`, description: 'Panoramic views of the city skyline and surrounding landscape', category: 'park' as const },
      { name: `${dest.city} Old Quarter`, description: 'Wander through centuries of history in the atmospheric old town streets', category: 'landmark' as const },
    ],
    topRestaurants: [
      { name: `${dest.city} Gastronomy`, cuisine: 'Local cuisine', priceRange: '€€' as const, description: `Classic ${dest.country} dishes showcasing the finest local ingredients` },
      { name: 'Grand Brasserie', cuisine: 'European', priceRange: '€€€' as const, description: 'Refined dining with seasonal menus and an outstanding wine selection' },
      { name: 'Street Food Market', cuisine: 'Local street food', priceRange: '€' as const, description: 'Authentic local flavours and quick bites beloved by residents and travellers alike' },
    ],
    topCafes: [
      { name: 'The Morning Ritual', specialty: 'Specialty coffee & pastries', description: `The perfect spot to start a slow morning with excellent coffee in ${dest.city}` },
      { name: `${dest.city} Coffee House`, specialty: 'Local blends & light lunches', description: 'A beloved local institution with a warm, relaxed atmosphere' },
      { name: 'Artisan Roastery', specialty: 'Single-origin pour-overs', description: 'For the true coffee enthusiast seeking the finest locally roasted beans' },
    ],
    localTips: [`Book popular restaurants in advance, especially on weekends`, `Use local public transport to save money and travel like a local`, `Visit popular attractions early morning to beat the crowds and the heat`],
    estimatedDailyExpenses: { food: 35, transport: 15, activities: 25 },
  };
}
