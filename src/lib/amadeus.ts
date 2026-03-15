import Amadeus from 'amadeus';

let amadeus: InstanceType<typeof Amadeus> | null = null;
try {
  if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
    amadeus = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET,
      hostname: 'test',
    });
  }
} catch (e) {
  console.warn('[Amadeus] SDK init failed:', e);
}

export default amadeus as InstanceType<typeof Amadeus>;
