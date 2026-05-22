/**
 * Locale-aware fallback content generator shared between the flight planner
 * (`/api/ai/plan-trip`) and the road-trip planner (`/api/road-trip/plan`).
 *
 * When Anthropic Claude is unavailable or fails, this module produces the
 * SAME shape Claude would have returned (description, dayByDay,
 * topAttractions, topRestaurants, topCafes, localTips,
 * estimatedDailyExpenses) using a hardcoded city knowledge base + generic
 * templates.
 *
 * Mode-aware:
 *  - 'flight' (default): Day 1 starts with airport arrival & hotel check-in
 *  - 'car': Day 1 is the outbound drive; with stopovers, Day 2+ continue
 *  - 'bus': same as car but no driving — passenger experience
 */

export type AttractionCategory = 'museum' | 'landmark' | 'park' | 'other';

export interface FallbackAttraction {
  name: string;
  description: string;
  category: AttractionCategory;
}

export interface FallbackRestaurant {
  name: string;
  cuisine: string;
  priceRange: '€' | '€€' | '€€€';
  description: string;
}

export interface FallbackCafe {
  name: string;
  specialty: string;
  description: string;
}

export interface FallbackAiContent {
  description: string;
  whyThisTrip: string;
  dayByDay: Array<{
    day: number;
    title: string;
    morning: { activity: string; description: string; type: string };
    afternoon: { activity: string; description: string; type: string };
    evening: { activity: string; description: string; type: string };
  }>;
  topAttractions: FallbackAttraction[];
  topRestaurants: FallbackRestaurant[];
  topCafes: FallbackCafe[];
  localTips: string[];
  estimatedDailyExpenses: { food: number; transport: number; activities: number };
}

export interface FallbackInput {
  destination: { city: string; country: string; iata?: string };
  nights: number;
  styles?: string[];
  locale?: 'ro' | 'en';
  mode?: 'flight' | 'car' | 'bus';
  durationHours?: number;
  stopoverCity?: string;
  originCity?: string;
}

type CityData = {
  attractions: FallbackAttraction[];
  restaurants: FallbackRestaurant[];
  cafes: FallbackCafe[];
};

const CITY_DATA: Record<string, CityData> = {
  Paris: {
    attractions: [
      { name: 'Eiffel Tower', description: 'Iconic iron lattice tower on the Champ de Mars', category: 'landmark' },
      { name: 'Louvre Museum', description: 'Worlds largest art museum and home of the Mona Lisa', category: 'museum' },
      { name: 'Notre-Dame Cathedral', description: 'Gothic cathedral masterpiece on the Ile de la Cite', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Le Comptoir du Relais', cuisine: 'French bistro', priceRange: '€€', description: 'Classic Parisian bistro in Saint-Germain' },
      { name: "L'As du Fallafel", cuisine: 'Middle Eastern', priceRange: '€', description: 'Legendary falafel spot in the Marais district' },
      { name: 'Septime', cuisine: 'Modern French', priceRange: '€€€', description: 'Award-winning neo-bistro in Bastille' },
    ],
    cafes: [
      { name: 'Cafe de Flore', specialty: 'Historic cafe and croissants', description: 'Legendary Saint-Germain cafe since 1887' },
      { name: 'Angelina', specialty: 'Hot chocolate and pastries', description: 'Belle Epoque tearoom near the Tuileries' },
      { name: 'Telescope', specialty: 'Specialty coffee', description: 'Pioneering third-wave coffee bar in the 1st arrondissement' },
    ],
  },
  London: {
    attractions: [
      { name: 'Tower of London', description: 'Historic castle and home of the Crown Jewels', category: 'landmark' },
      { name: 'British Museum', description: 'World-class museum with artifacts from across human history', category: 'museum' },
      { name: 'Buckingham Palace', description: 'Official residence of the British monarch', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Dishoom', cuisine: 'Indian', priceRange: '€€', description: 'Beloved Bombay-style cafe with legendary black daal' },
      { name: 'Borough Market', cuisine: 'Various street food', priceRange: '€', description: 'Historic food market with the best street food in London' },
      { name: 'Sketch', cuisine: 'Modern European', priceRange: '€€€', description: 'Iconic restaurant and art gallery in Mayfair' },
    ],
    cafes: [
      { name: 'Monmouth Coffee', specialty: 'Specialty coffee', description: 'One of the finest independent coffee roasters in London' },
      { name: 'Bageriet', specialty: 'Swedish pastries', description: 'Cozy Swedish bakery in Covent Garden' },
      { name: 'Flat White', specialty: 'Flat white coffee', description: 'Soho cafe that introduced flat white to London' },
    ],
  },
  Rome: {
    attractions: [
      { name: 'Colosseum', description: 'Ancient amphitheatre and iconic symbol of Rome', category: 'landmark' },
      { name: 'Vatican Museums', description: 'Vast collection of art and the Sistine Chapel', category: 'museum' },
      { name: 'Trevi Fountain', description: 'Baroque masterpiece and the largest fountain in Rome', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Da Enzo al 29', cuisine: 'Roman', priceRange: '€€', description: 'Authentic Roman trattoria in Trastevere' },
      { name: 'Suppli Roma', cuisine: 'Street food', priceRange: '€', description: 'Famous for the best suppli in the city' },
      { name: 'La Pergola', cuisine: 'Fine dining Italian', priceRange: '€€€', description: 'Only three-Michelin-star restaurant in Rome' },
    ],
    cafes: [
      { name: "Sant'Eustachio il Caffe", specialty: 'Traditional espresso', description: 'Legendary Roman cafe serving since 1938' },
      { name: 'Bar San Calisto', specialty: 'Cheap espresso and hot chocolate', description: 'Classic Trastevere bar loved by locals' },
      { name: 'Caffe Greco', specialty: 'Historic cafe', description: 'One of the oldest cafes in the world, open since 1760' },
    ],
  },
  Barcelona: {
    attractions: [
      { name: 'Sagrada Familia', description: 'Gaudi masterpiece basilica still under construction', category: 'landmark' },
      { name: 'Park Guell', description: 'Colorful mosaic park with panoramic city views', category: 'park' },
      { name: 'Gothic Quarter', description: 'Medieval neighborhood with narrow streets and history', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Bar Central La Boqueria', cuisine: 'Spanish tapas', priceRange: '€€', description: 'Fresh seafood and tapas inside La Boqueria market' },
      { name: 'El Xampanyet', cuisine: 'Catalan', priceRange: '€', description: 'Classic cava bar in the Born neighborhood' },
      { name: 'Disfrutar', cuisine: 'Modern Catalan', priceRange: '€€€', description: 'World top-10 restaurant with avant-garde cuisine' },
    ],
    cafes: [
      { name: 'Federal Cafe', specialty: 'Brunch and specialty coffee', description: 'Australian-style cafe in Sant Antoni' },
      { name: 'Nomad Coffee', specialty: 'Single-origin espresso', description: "Barcelonas best specialty coffee roaster" },
      { name: 'El Magnifico', specialty: 'Coffee and chocolate', description: 'Historic coffee shop in El Born since 1919' },
    ],
  },
  Amsterdam: {
    attractions: [
      { name: 'Rijksmuseum', description: 'Dutch national museum with Rembrandt and Vermeer', category: 'museum' },
      { name: 'Anne Frank House', description: 'Historic house where Anne Frank hid during WWII', category: 'landmark' },
      { name: 'Van Gogh Museum', description: 'Worlds largest collection of Van Gogh works', category: 'museum' },
    ],
    restaurants: [
      { name: 'Restaurant Breda', cuisine: 'Modern European', priceRange: '€€€', description: 'Elegant dining in a historic canal house' },
      { name: 'Pllek', cuisine: 'International', priceRange: '€€', description: 'Trendy restaurant and beach bar in Amsterdam Noord' },
      { name: 'Stroopwafel and Co', cuisine: 'Dutch street food', priceRange: '€', description: 'Fresh stroopwafels made in front of you' },
    ],
    cafes: [
      { name: 'Lot Sixty One', specialty: 'Specialty coffee', description: "Amsterdams most celebrated specialty coffee bar" },
      { name: 'Cafe Papeneiland', specialty: 'Dutch brown cafe', description: 'Traditional brown cafe since 1642 in the Jordaan' },
      { name: 'Back to Black', specialty: 'Third wave coffee', description: 'Hipster coffee bar in the Utrechtsestraat area' },
    ],
  },
  Istanbul: {
    attractions: [
      { name: 'Hagia Sophia', description: 'Former cathedral and mosque, now a stunning museum', category: 'landmark' },
      { name: 'Grand Bazaar', description: 'One of the worlds oldest and largest covered markets', category: 'landmark' },
      { name: 'Topkapi Palace', description: 'Opulent palace of the Ottoman sultans', category: 'museum' },
    ],
    restaurants: [
      { name: 'Karakoy Lokantasi', cuisine: 'Modern Turkish', priceRange: '€€', description: 'Contemporary take on classic Turkish cuisine' },
      { name: 'Ciya Sofrasi', cuisine: 'Anatolian', priceRange: '€', description: 'Authentic Anatolian home cooking in Kadikoy' },
      { name: 'Mikla', cuisine: 'New Nordic-Turkish', priceRange: '€€€', description: 'Rooftop fine dining with Bosphorus views' },
    ],
    cafes: [
      { name: 'Mandabatmaz', specialty: 'Turkish coffee', description: 'Tiny legendary cafe serving the best Turkish coffee in Istanbul' },
      { name: 'Kronotrop', specialty: 'Specialty coffee', description: 'Pioneer of third-wave coffee culture in Turkey' },
      { name: 'Karabatak', specialty: 'Coffee and brunch', description: 'Trendy cafe in Cihangir neighborhood' },
    ],
  },
  Dubai: {
    attractions: [
      { name: 'Burj Khalifa', description: 'Worlds tallest building with observation deck on floor 124', category: 'landmark' },
      { name: 'Dubai Mall', description: 'One of the largest malls in the world with an aquarium', category: 'landmark' },
      { name: 'Palm Jumeirah', description: 'Iconic artificial island with luxury hotels and beaches', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Al Ustad Special Kabab', cuisine: 'Persian', priceRange: '€', description: 'Legendary kebab restaurant open since 1978' },
      { name: 'Nobu Dubai', cuisine: 'Japanese-Peruvian', priceRange: '€€€', description: "World-famous chef Nobus Dubai outpost" },
      { name: 'Bu Qtair', cuisine: 'Fresh seafood', priceRange: '€', description: 'No-frills seaside shack with the freshest fish in Dubai' },
    ],
    cafes: [
      { name: 'Nightjar Coffee', specialty: 'Specialty coffee', description: 'Dubais favorite specialty coffee roaster' },
      { name: 'Tom and Serg', specialty: 'Brunch and coffee', description: 'Popular Australian-style cafe in Al Quoz' },
      { name: 'Arrows and Sparrows', specialty: 'Artisan coffee', description: 'Hidden gem cafe in Al Serkal Avenue' },
    ],
  },
  Prague: {
    attractions: [
      { name: 'Prague Castle', description: 'Largest ancient castle complex in the world', category: 'landmark' },
      { name: 'Charles Bridge', description: 'Medieval stone bridge with Baroque statues', category: 'landmark' },
      { name: 'Old Town Square', description: 'Historic square with the famous Astronomical Clock', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Lokal', cuisine: 'Czech', priceRange: '€', description: 'Classic Czech pub with perfectly poured Pilsner Urquell' },
      { name: 'La Degustation Boheme Bourgeoise', cuisine: 'Modern Czech', priceRange: '€€€', description: 'Michelin-starred Czech tasting menu experience' },
      { name: 'Manifesto Market', cuisine: 'Street food', priceRange: '€', description: 'Container market with diverse street food options' },
    ],
    cafes: [
      { name: 'EMA Espresso Bar', specialty: 'Specialty coffee', description: 'Pragues best flat white in a minimalist setting' },
      { name: 'Cafe Louvre', specialty: 'Historic cafe', description: 'Grand cafe open since 1902 frequented by Kafka and Einstein' },
      { name: 'Kavarna Obecni Dum', specialty: 'Art Nouveau cafe', description: 'Stunning Art Nouveau cafe inside the Municipal House' },
    ],
  },
  Vienna: {
    attractions: [
      { name: 'Schonbrunn Palace', description: 'Imperial palace with 1,441 rooms and stunning gardens', category: 'landmark' },
      { name: 'Belvedere Museum', description: 'Baroque palace housing Klimts The Kiss', category: 'museum' },
      { name: "St. Stephen's Cathedral", description: 'Gothic cathedral and symbol of Vienna', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Figlmuller Wollzeile', cuisine: 'Austrian', priceRange: '€€', description: 'Famous for the biggest Wiener Schnitzel in Vienna' },
      { name: 'Zum Wohl', cuisine: 'Wine bar', priceRange: '€€', description: 'Natural wine bar with excellent Austrian small plates' },
      { name: 'Steirereck', cuisine: 'Modern Austrian', priceRange: '€€€', description: 'One of the 50 best restaurants in the world' },
    ],
    cafes: [
      { name: 'Cafe Central', specialty: 'Viennese coffeehouse', description: 'Grand historic cafe in a Gothic palace since 1876' },
      { name: 'Cafe Hawelka', specialty: 'Traditional coffee', description: 'Legendary bohemian cafe run by the same family for 80 years' },
      { name: 'Meinl am Graben', specialty: 'Luxury coffee and pastries', description: 'Vienna finest delicatessen and coffeehouse on the Graben' },
    ],
  },
  Lisbon: {
    attractions: [
      { name: 'Belem Tower', description: '16th century fortress and UNESCO World Heritage Site', category: 'landmark' },
      { name: 'Jeronimos Monastery', description: 'Magnificent example of Portuguese Late Gothic architecture', category: 'landmark' },
      { name: 'Alfama District', description: 'Oldest neighborhood with Moorish roots and Fado music', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Time Out Market', cuisine: 'Various Portuguese', priceRange: '€€', description: 'The best of Lisbon cuisine under one roof' },
      { name: 'A Cevicheria', cuisine: 'Peruvian-Portuguese', priceRange: '€€€', description: 'Creative fusion restaurant by chef Kiko Martins' },
      { name: 'Solar dos Presuntos', cuisine: 'Traditional Portuguese', priceRange: '€€', description: 'Classic Lisbon restaurant famous for cured hams' },
    ],
    cafes: [
      { name: 'Pasteis de Belem', specialty: 'Original pasteis de nata', description: 'The legendary original home of Portuguese custard tarts since 1837' },
      { name: 'Copenhagen Coffee Lab', specialty: 'Scandinavian specialty coffee', description: 'Danish-inspired specialty coffee in Principe Real' },
      { name: 'Cafe A Brasileira', specialty: 'Historic cafe', description: 'Famous Art Deco cafe in Chiado open since 1905' },
    ],
  },
  Berlin: {
    attractions: [
      { name: 'Brandenburg Gate', description: 'Neoclassical triumphal arch and symbol of German unity', category: 'landmark' },
      { name: 'Berlin Wall Memorial', description: 'Historic site commemorating the divided city', category: 'landmark' },
      { name: 'Museum Island', description: 'UNESCO World Heritage site with five world-class museums', category: 'museum' },
    ],
    restaurants: [
      { name: 'Mustafas Gemuse Kebap', cuisine: 'Turkish', priceRange: '€', description: 'The most famous kebab stand in Berlin with legendary queues' },
      { name: 'Nobelhart und Schmutzig', cuisine: 'Modern German', priceRange: '€€€', description: 'Brutally local fine dining championing regional ingredients' },
      { name: 'Markthalle Neun', cuisine: 'Street food market', priceRange: '€', description: 'Historic market hall with street food Thursdays' },
    ],
    cafes: [
      { name: 'The Barn', specialty: 'Specialty coffee', description: 'Berlins most celebrated coffee roaster with multiple locations' },
      { name: 'Cafe Einstein Stammhaus', specialty: 'Viennese coffeehouse', description: 'Classic Viennese-style grand cafe in a beautiful villa' },
      { name: 'Five Elephant', specialty: 'Coffee and cheesecake', description: 'Famous for specialty coffee and the best cheesecake in Berlin' },
    ],
  },
  Madrid: {
    attractions: [
      { name: 'Prado Museum', description: 'One of the worlds finest art museums with Velazquez and Goya', category: 'museum' },
      { name: 'Royal Palace', description: 'Official residence of the Spanish Royal Family', category: 'landmark' },
      { name: 'Retiro Park', description: 'Stunning 350-acre park in the heart of the city', category: 'park' },
    ],
    restaurants: [
      { name: 'Sobrino de Botin', cuisine: 'Traditional Spanish', priceRange: '€€', description: 'Worlds oldest restaurant, open since 1725' },
      { name: 'Mercado de San Miguel', cuisine: 'Spanish tapas', priceRange: '€€', description: 'Beautiful iron market with gourmet tapas and wine' },
      { name: 'DiverXO', cuisine: 'Avant-garde', priceRange: '€€€', description: 'Three-Michelin-star restaurant by David Munoz' },
    ],
    cafes: [
      { name: 'Cafeteria Comercial', specialty: 'Traditional Spanish cafe', description: 'Iconic historic cafe open since 1887' },
      { name: 'Toma Cafe', specialty: 'Specialty coffee', description: 'Pioneer of the specialty coffee movement in Madrid' },
      { name: 'Cafe del Circulo de Bellas Artes', specialty: 'Grand cafe', description: 'Elegant rooftop terrace cafe with city views' },
    ],
  },
  Athens: {
    attractions: [
      { name: 'Acropolis', description: 'Ancient citadel with the Parthenon, symbol of Western civilization', category: 'landmark' },
      { name: 'National Archaeological Museum', description: 'Worlds finest collection of ancient Greek artifacts', category: 'museum' },
      { name: 'Plaka District', description: 'Charming old neighborhood at the foot of the Acropolis', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Diporto Agoras', cuisine: 'Greek taverna', priceRange: '€', description: 'Hidden basement taverna in the central market, cash only' },
      { name: 'Varoulko Seaside', cuisine: 'Modern Greek seafood', priceRange: '€€€', description: 'Michelin-starred seafood with Acropolis views' },
      { name: 'Tzitzikas kai Mermigas', cuisine: 'Modern Greek', priceRange: '€€', description: 'Creative Greek cuisine in a charming setting' },
    ],
    cafes: [
      { name: 'Mokka', specialty: 'Greek coffee', description: 'Old-school Athenian coffee house serving thick Greek coffee' },
      { name: 'The Underdog', specialty: 'Specialty coffee', description: 'Athens leading specialty coffee roaster' },
      { name: 'Tailor Made', specialty: 'Coffee and cocktails', description: 'Hip cafe-bar in Monastiraki that turns into a bar at night' },
    ],
  },
  Budapest: {
    attractions: [
      { name: 'Hungarian Parliament Building', description: 'Neo-Gothic masterpiece on the Danube, one of Europes largest', category: 'landmark' },
      { name: 'Buda Castle', description: 'Historic castle complex overlooking the city from Castle Hill', category: 'landmark' },
      { name: 'Szechenyi Baths', description: 'Grand neo-baroque thermal bath complex open since 1913', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Costes', cuisine: 'Modern European', priceRange: '€€€', description: 'First Michelin-starred restaurant in Budapest' },
      { name: 'Menza', cuisine: 'Hungarian', priceRange: '€€', description: 'Modern take on Hungarian classics in a retro setting' },
      { name: 'Hungarikum Bistro', cuisine: 'Traditional Hungarian', priceRange: '€€', description: 'Authentic Hungarian flavors with a contemporary presentation' },
    ],
    cafes: [
      { name: 'Gerbeaud', specialty: 'Historic pastry cafe', description: 'Legendary pastry shop on Vorosmarty Square since 1858' },
      { name: 'New York Cafe', specialty: 'Grand historic cafe', description: 'The most beautiful cafe in the world inside the New York Palace' },
      { name: 'My Little Melbourne', specialty: 'Australian specialty coffee', description: 'Budapests best flat white in the Jewish Quarter' },
    ],
  },
  Bucharest: {
    attractions: [
      { name: 'Palace of Parliament', description: 'The second largest administrative building in the world', category: 'landmark' },
      { name: 'Romanian Athenaeum', description: 'Stunning concert hall and symbol of Romanian culture', category: 'landmark' },
      { name: 'Village Museum', description: 'Open-air museum with authentic Romanian rural architecture', category: 'museum' },
    ],
    restaurants: [
      { name: 'Lacrimi si Sfinti', cuisine: 'Modern Romanian', priceRange: '€€€', description: 'Creative Romanian fine dining by chef Joseph Hadad' },
      { name: 'Caru cu Bere', cuisine: 'Traditional Romanian', priceRange: '€€', description: 'Iconic historic restaurant in a stunning Gothic Revival building' },
      { name: 'Vatra', cuisine: 'Traditional Romanian', priceRange: '€€', description: 'Authentic Romanian home cooking in a cozy setting' },
    ],
    cafes: [
      { name: 'Origo', specialty: 'Specialty coffee', description: 'Bucharests leading specialty coffee roaster' },
      { name: 'Bob Coffee Lab', specialty: 'Third wave coffee', description: 'Excellent single-origin coffees in the Old Town area' },
      { name: 'Coffee2Go', specialty: 'Quick espresso', description: 'Popular local chain with quality espresso at fair prices' },
    ],
  },
  Bali: {
    attractions: [
      { name: 'Tanah Lot Temple', description: 'Iconic sea temple perched on a rocky outcrop at sunset', category: 'landmark' },
      { name: 'Ubud Monkey Forest', description: 'Sacred nature sanctuary home to over 700 Balinese macaques', category: 'park' },
      { name: 'Tegallalang Rice Terraces', description: 'Stunning UNESCO-listed terraced rice fields north of Ubud', category: 'landmark' },
    ],
    restaurants: [
      { name: 'Locavore', cuisine: 'Modern Indonesian', priceRange: '€€€', description: 'Balis finest restaurant using only local Indonesian ingredients' },
      { name: 'Naughty Nuris Warung', cuisine: 'Balinese BBQ', priceRange: '€', description: 'Legendary ribs and martinis, a Bali institution since 1995' },
      { name: 'Warung Babi Guling Ibu Oka', cuisine: 'Balinese', priceRange: '€', description: 'Famous suckling pig warung recommended by Anthony Bourdain' },
    ],
    cafes: [
      { name: 'Seniman Coffee Studio', specialty: 'Specialty Balinese coffee', description: 'Showcasing the best of Indonesian single-origin coffees' },
      { name: 'Revolver Espresso', specialty: 'Australian coffee culture', description: 'Tiny alley espresso bar that changed Balis coffee scene' },
      { name: 'Anomali Coffee', specialty: 'Indonesian single-origin', description: 'Local chain celebrating the diversity of Indonesian coffee' },
    ],
  },
  Sofia: {
    attractions: [
      { name: 'Alexander Nevsky Cathedral', description: 'Magnificent neo-Byzantine Orthodox cathedral and symbol of Sofia', category: 'landmark' },
      { name: 'Vitosha Mountain', description: 'Mountain on the southern edge of the city with hiking and skiing', category: 'park' },
      { name: 'National History Museum', description: 'Largest historical museum in Bulgaria with Thracian gold treasures', category: 'museum' },
    ],
    restaurants: [
      { name: 'Made in Home', cuisine: 'Modern Bulgarian', priceRange: '€€', description: 'Cozy bistro celebrating home-style Bulgarian cooking' },
      { name: "Hadjidraganov's Cellars", cuisine: 'Traditional Bulgarian', priceRange: '€€', description: 'Iconic traditional restaurant with folk music and tavern atmosphere' },
      { name: 'Cosmos', cuisine: 'Modern European', priceRange: '€€€', description: 'Refined fine dining hidden in a historic Sofia building' },
    ],
    cafes: [
      { name: 'Dabov Specialty Coffee', specialty: 'Specialty single-origin', description: "Sofia's leading third-wave coffee roaster" },
      { name: 'Fabrika Daga', specialty: 'Brunch and coffee', description: 'Industrial-chic cafe and brunch spot in a former factory' },
      { name: 'Sweet Petar', specialty: 'Pastries and coffee', description: 'Charming local bakery cafe in the city center' },
    ],
  },
};

function getFallbackCityData(city: string, country: string, locale: 'ro' | 'en'): CityData {
  const exact = CITY_DATA[city];
  if (exact) return exact;
  const isRo = locale === 'ro';
  if (isRo) {
    return {
      attractions: [
        { name: `Centrul istoric ${city}`, description: `Explorează inima istorică a ${city}`, category: 'landmark' },
        { name: `Muzeul Național ${city}`, description: `Descoperă cultura și istoria țării ${country}`, category: 'museum' },
        { name: `Parcul central ${city}`, description: 'Oază verde în mijlocul orașului', category: 'park' },
      ],
      restaurants: [
        { name: 'Local Kitchen', cuisine: `Bucătărie tradițională ${country}`, priceRange: '€€', description: 'Mâncare locală autentică, într-o atmosferă primitoare' },
        { name: 'Central Bistro', cuisine: 'Internațional', priceRange: '€€', description: 'Restaurant popular în centrul orașului' },
        { name: 'Piața Street Food', cuisine: 'Street food', priceRange: '€', description: 'Mâncare de stradă și standuri locale' },
      ],
      cafes: [
        { name: 'Morning Brew', specialty: 'Cafea și produse de patiserie', description: 'Cafenea locală populară pentru mic dejun' },
        { name: `${city} Coffee House`, specialty: 'Amestecuri locale de cafea', description: 'Loc primitor pentru cafea și conversație' },
        { name: 'The Corner Cafe', specialty: 'Cafea de specialitate', description: 'Third-wave coffee într-un decor relaxat' },
      ],
    };
  }
  return {
    attractions: [
      { name: `${city} Historic Center`, description: `Explore the historic heart of ${city}`, category: 'landmark' },
      { name: `${city} National Museum`, description: `Discover the culture and history of ${country}`, category: 'museum' },
      { name: `${city} Central Park`, description: 'Green oasis in the heart of the city', category: 'park' },
    ],
    restaurants: [
      { name: 'Local Kitchen', cuisine: `Traditional ${country}`, priceRange: '€€', description: 'Authentic local cuisine in a welcoming atmosphere' },
      { name: 'Central Bistro', cuisine: 'International', priceRange: '€€', description: 'Popular restaurant in the city center' },
      { name: 'Street Food Market', cuisine: 'Street food', priceRange: '€', description: 'Local street food and market stalls' },
    ],
    cafes: [
      { name: 'Morning Brew', specialty: 'Coffee and pastries', description: 'Popular local cafe for breakfast and coffee' },
      { name: `${city} Coffee House`, specialty: 'Local coffee blends', description: 'Cozy spot for coffee and conversation' },
      { name: 'The Corner Cafe', specialty: 'Specialty coffee', description: 'Third-wave coffee in a relaxed setting' },
    ],
  };
}

function buildDayByDay(input: FallbackInput, cityData: CityData): FallbackAiContent['dayByDay'] {
  const isRo = input.locale === 'ro';
  const { destination, mode = 'flight', nights, originCity, stopoverCity, durationHours } = input;
  const totalDays = Math.max(1, Math.min(nights + 1, 7));

  const days: FallbackAiContent['dayByDay'] = [];
  const drivingHours = durationHours ?? 0;
  const driveHourLabel = drivingHours > 0 ? `~${drivingHours.toFixed(1)}h` : '';

  for (let i = 0; i < totalDays; i++) {
    const day = i + 1;
    const isFirst = i === 0;
    const isLast = i === totalDays - 1;
    const hasStopover = !!stopoverCity;

    let title: string;
    let morning = { activity: '', description: '', type: 'sightseeing' };
    let afternoon = { activity: '', description: '', type: 'sightseeing' };
    let evening = { activity: '', description: '', type: 'dining' };

    if (mode === 'flight') {
      if (isFirst) {
        title = isRo ? `Sosire în ${destination.city}` : `Arrival in ${destination.city}`;
        morning = {
          activity: isRo ? 'Sosire la aeroport & check-in la hotel' : 'Airport arrival & hotel check-in',
          description: isRo ? `Acomodare și primii pași în ${destination.city}` : `Settle in and get oriented in ${destination.city}`,
          type: 'transport',
        };
        afternoon = {
          activity: isRo ? `Plimbare prin ${destination.city}` : `Walk around ${destination.city}`,
          description: isRo ? 'Primele impresii din oraș' : 'First impressions of the city',
          type: 'sightseeing',
        };
        evening = {
          activity: isRo ? 'Cină la un restaurant local' : 'Dinner at a local restaurant',
          description: isRo ? `Bucură-te de bucătăria ${destination.country}` : `Enjoy the cuisine of ${destination.country}`,
          type: 'dining',
        };
      } else if (isLast) {
        title = isRo ? 'Ultima zi & plecare' : 'Final day & departure';
        morning = {
          activity: isRo ? 'Mic dejun și ultimele cumpărături' : 'Breakfast and last-minute shopping',
          description: isRo ? 'Cadouri de acasă' : 'Pick up souvenirs',
          type: 'dining',
        };
        afternoon = {
          activity: isRo ? 'Check-out și drum spre aeroport' : 'Check-out and head to the airport',
          description: isRo ? 'Drum bun acasă!' : 'Safe travels home!',
          type: 'transport',
        };
        evening = {
          activity: isRo ? 'Zbor de retur' : 'Return flight',
          description: isRo ? 'Reflectă la călătorie' : 'Reflect on the trip',
          type: 'transport',
        };
      } else {
        title = isRo ? `Explorează ${destination.city} - Ziua ${day}` : `Explore ${destination.city} - Day ${day}`;
        const attractionName = cityData.attractions[(i - 1) % cityData.attractions.length]?.name || destination.city;
        morning = {
          activity: isRo ? 'Mic dejun la o cafenea locală' : 'Breakfast at a local cafe',
          description: isRo ? 'Începe ziua cu arome locale' : 'Start your day with local flavors',
          type: 'dining',
        };
        afternoon = {
          activity: isRo ? `Vizită la ${attractionName}` : `Visit ${attractionName}`,
          description: isRo ? `Una dintre cele mai apreciate atracții din ${destination.city}` : `One of the must-see attractions in ${destination.city}`,
          type: 'sightseeing',
        };
        evening = {
          activity: isRo ? 'Cină la un restaurant local' : 'Dinner at a local restaurant',
          description: isRo ? `Bucură-te de bucătăria ${destination.country}` : `Enjoy the best of ${destination.country} cuisine`,
          type: 'dining',
        };
      }
    } else {
      const modeNoun = mode === 'car' ? (isRo ? 'mașina' : 'the car') : (isRo ? 'autobuzul' : 'the bus');
      if (isFirst) {
        const dayDest = hasStopover ? stopoverCity! : destination.city;
        title = isRo
          ? `${originCity || 'Plecare'} → ${dayDest}`
          : `${originCity || 'Departure'} → ${dayDest}`;
        morning = {
          activity: isRo ? `Plecare cu ${modeNoun}` : `Depart by ${mode}`,
          description: isRo
            ? `Pornește spre ${dayDest}${driveHourLabel ? ` (${driveHourLabel} pe drum)` : ''}`
            : `Set off toward ${dayDest}${driveHourLabel ? ` (${driveHourLabel} on the road)` : ''}`,
          type: 'transport',
        };
        afternoon = {
          activity: isRo ? 'Pauză la jumătate de drum' : 'Mid-route break',
          description: mode === 'car'
            ? (isRo ? 'Oprire pentru cafea și combustibil' : 'Stop for coffee and fuel')
            : (isRo ? 'Pauză la o stație de autobuz' : 'Brief bus station stop'),
          type: 'transport',
        };
        evening = {
          activity: isRo ? `Sosire în ${dayDest} & check-in` : `Arrive in ${dayDest} & check-in`,
          description: isRo
            ? 'Cină ușoară și odihnă'
            : 'Light dinner and rest',
          type: 'dining',
        };
      } else if (hasStopover && i === 1) {
        title = isRo
          ? `${stopoverCity} → ${destination.city}`
          : `${stopoverCity} → ${destination.city}`;
        morning = {
          activity: isRo ? 'Mic dejun și plecare' : 'Breakfast and departure',
          description: isRo
            ? `Continuă drumul spre ${destination.city}`
            : `Continue the drive to ${destination.city}`,
          type: 'transport',
        };
        afternoon = {
          activity: isRo ? `Sosire în ${destination.city}` : `Arrival in ${destination.city}`,
          description: isRo ? 'Check-in la hotel' : 'Hotel check-in',
          type: 'transport',
        };
        evening = {
          activity: isRo ? 'Cină la un restaurant local' : 'Dinner at a local restaurant',
          description: isRo ? `Primele arome din ${destination.country}` : `First taste of ${destination.country}`,
          type: 'dining',
        };
      } else if (isLast) {
        title = isRo
          ? `Drum de retur spre ${originCity || 'casă'}`
          : `Return drive to ${originCity || 'home'}`;
        morning = {
          activity: isRo ? `Check-out din hotel` : 'Hotel check-out',
          description: isRo ? 'Pregătirea pentru drum' : 'Get ready for the road',
          type: 'transport',
        };
        afternoon = {
          activity: isRo ? `Drum cu ${modeNoun}` : `On the road with ${modeNoun}`,
          description: isRo ? 'Pauze regulate, hidratare, snacks' : 'Regular breaks, water, snacks',
          type: 'transport',
        };
        evening = {
          activity: isRo ? 'Sosire acasă' : 'Arrive home',
          description: isRo ? 'Călătorie încheiată cu bine' : 'Trip safely concluded',
          type: 'transport',
        };
      } else {
        title = isRo ? `Explorează ${destination.city} - Ziua ${day}` : `Explore ${destination.city} - Day ${day}`;
        const attractionName = cityData.attractions[(i - 1) % cityData.attractions.length]?.name || destination.city;
        morning = {
          activity: isRo ? 'Mic dejun la o cafenea locală' : 'Breakfast at a local cafe',
          description: isRo ? 'Începe ziua cu arome locale' : 'Start your day with local flavors',
          type: 'dining',
        };
        afternoon = {
          activity: isRo ? `Vizită la ${attractionName}` : `Visit ${attractionName}`,
          description: isRo
            ? `Una dintre cele mai apreciate atracții din ${destination.city}`
            : `One of the must-see attractions in ${destination.city}`,
          type: 'sightseeing',
        };
        evening = {
          activity: isRo ? 'Cină la un restaurant local' : 'Dinner at a local restaurant',
          description: isRo
            ? `Bucură-te de bucătăria ${destination.country}`
            : `Enjoy the cuisine of ${destination.country}`,
          type: 'dining',
        };
      }
    }

    days.push({ day, title, morning, afternoon, evening });
  }

  return days;
}

function buildLocalTips(input: FallbackInput): string[] {
  const isRo = input.locale === 'ro';
  const { mode = 'flight', destination } = input;

  if (mode === 'flight') {
    return isRo
      ? [
          'Rezervă restaurantele și atracțiile populare din timp',
          'Folosește transportul public local ca să economisești și să vezi mai mult',
          'Vizitează atracțiile populare dimineața devreme pentru a evita aglomerația',
        ]
      : [
          'Book popular restaurants and attractions in advance',
          'Use local public transport to save money and see more',
          'Visit popular attractions early morning to avoid crowds',
        ];
  }

  if (mode === 'car') {
    return isRo
      ? [
          'Verifică vinietele și taxele de drum pentru țările tranzitate (Austria, Slovenia, Ungaria, Bulgaria, etc.)',
          'Pregătește green card (carte verde / RCA internațional) și permis de conducere valid',
          'Plănuiește pauze la fiecare 2-3 ore — atenție la oboseală',
          'Combustibilul e mai ieftin în UE de est (BG, RO, HU) decât în AT/DE/IT',
          'Folosește Waze pentru radare și trafic în timp real',
          `Rezervă un hotel cu parcare în ${destination.city}`,
        ]
      : [
          'Check vignettes and tolls for transit countries (Austria, Slovenia, Hungary, Bulgaria, etc.)',
          'Carry your green card (international insurance) and valid driving license',
          'Plan breaks every 2-3 hours — watch for fatigue',
          'Fuel is cheaper in Eastern EU (BG, RO, HU) than in AT/DE/IT',
          'Use Waze for real-time speed cameras and traffic',
          `Book a hotel with parking in ${destination.city}`,
        ];
  }

  // bus
  return isRo
    ? [
        'Rezervă biletele cu cel puțin o săptămână înainte — prețurile cresc rapid',
        'Adu o pernă mică de gât și pături — autobuzele de noapte sunt răcoroase',
        'Încarcă-ți telefonul înainte de plecare, prizele USB nu sunt mereu funcționale',
        'Snacks și apă: stațiile au prețuri triple',
        `Rezervă un hotel cu check-in flexibil în ${destination.city} (autobuzele pot întârzia)`,
        'Verifică actele de călătorie — frontierele cer pașaport/buletin',
      ]
    : [
        'Book bus tickets at least a week in advance — prices climb fast',
        'Bring a small neck pillow and a blanket — overnight buses run cold',
        'Charge your phone fully before boarding; USB ports are not always working',
        'Pack snacks and water — bus stations charge 3x retail prices',
        `Book a hotel with flexible check-in in ${destination.city} (buses often arrive late)`,
        'Carry valid ID/passport — Schengen borders still check',
      ];
}

export function generateFallbackContent(input: FallbackInput): FallbackAiContent {
  const locale: 'ro' | 'en' = input.locale === 'ro' ? 'ro' : 'en';
  const isRo = locale === 'ro';
  const fullInput: FallbackInput = { ...input, locale };
  const { destination, nights, styles = [], mode = 'flight' } = fullInput;
  const styleText = styles.slice(0, 2).join(isRo ? ' și ' : ' and ') || (isRo ? 'aventură' : 'adventure');
  const cityData = getFallbackCityData(destination.city, destination.country, locale);

  const description = mode === 'flight'
    ? (isRo
        ? `Descoperă magia destinației ${destination.city} într-o călătorie de ${nights} nopți. De la repere iconice la comori locale, această ofertă combină cele mai bune experiențe din ${destination.country}.`
        : `Discover the magic of ${destination.city} on this perfectly curated ${nights}-night journey. From iconic landmarks to hidden local gems, this trip combines the best of ${destination.country} culture and beauty.`)
    : (isRo
        ? `Road trip${mode === 'car' ? ' cu mașina' : ' cu autobuzul'} către ${destination.city}, cu drum prin ${destination.country}. Combină atmosfera de drum cu experiențele autentice de la destinație.`
        : `${mode === 'car' ? 'Car' : 'Bus'} road trip to ${destination.city}, crossing ${destination.country}. Combines the spirit of the road with authentic experiences at the destination.`);

  const whyThisTrip = isRo
    ? `Această călătorie este potrivită pentru cei care caută o experiență de neuitat în ${destination.city}${styles.length ? `, axată pe ${styleText}` : ''}.`
    : `This trip is perfect for ${styleText} lovers looking for an unforgettable experience in ${destination.city}.`;

  return {
    description,
    whyThisTrip,
    dayByDay: buildDayByDay(fullInput, cityData),
    topAttractions: cityData.attractions,
    topRestaurants: cityData.restaurants,
    topCafes: cityData.cafes,
    localTips: buildLocalTips(fullInput),
    estimatedDailyExpenses: {
      food: mode === 'flight' ? 35 : 30,
      transport: mode === 'flight' ? 15 : 5,
      activities: 25,
    },
  };
}
