declare module 'amadeus' {
  interface AmadeusParams {
    clientId: string;
    clientSecret: string;
    hostname?: string;
  }

  interface AmadeusResponse {
    data: unknown[];
    result: unknown;
  }

  class Amadeus {
    constructor(params: AmadeusParams);
    shopping: {
      flightOffersSearch: {
        get(params: Record<string, string>): Promise<AmadeusResponse>;
      };
      flightDestinations: {
        get(params: Record<string, string>): Promise<AmadeusResponse>;
      };
      hotelOffersSearch: {
        get(params: Record<string, string>): Promise<AmadeusResponse>;
      };
    };
    referenceData: {
      locations: {
        get(params: Record<string, string>): Promise<AmadeusResponse>;
        hotels: {
          byCity: {
            get(params: Record<string, string | number>): Promise<AmadeusResponse>;
          };
        };
      };
    };
  }

  export default Amadeus;
}
