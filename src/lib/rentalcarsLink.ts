/* Rentalcars.com deep-link builder. Used as the partner flow while the
   Tripadvisor16 cars API is unavailable upstream (returns
   "Something went wrong" for any query/placeId combination). Single source
   of truth for the URL format so the trip flow + standalone /transfers page
   stay in lockstep. */

export interface RentalcarsLinkInput {
  /** IATA airport code (BUD, OTP, BER, ...). */
  iata: string;
  /** ISO date YYYY-MM-DD. */
  pickUpDate: string;
  /** ISO date YYYY-MM-DD. */
  dropOffDate: string;
  /** HH:MM, defaults to 10:00. */
  pickUpTime?: string;
  /** HH:MM, defaults to 10:00. */
  dropOffTime?: string;
}

export function buildRentalcarsUrl(input: RentalcarsLinkInput): string {
  const iata = input.iata.toUpperCase();
  const [puY, puM, puD] = input.pickUpDate.split('-');
  const [doY, doM, doD] = input.dropOffDate.split('-');
  const [puH, puMin] = (input.pickUpTime || '10:00').split(':');
  const [doH, doMin] = (input.dropOffTime || '10:00').split(':');

  const params = new URLSearchParams({
    puIATA: iata,
    doIATA: iata,
    puYear: puY,
    puMonth: String(parseInt(puM, 10)),
    puDay: String(parseInt(puD, 10)),
    puHour: puH,
    puMinute: puMin,
    doYear: doY,
    doMonth: String(parseInt(doM, 10)),
    doDay: String(parseInt(doD, 10)),
    doHour: doH,
    doMinute: doMin,
  });
  return `https://www.rentalcars.com/SearchResults.do?${params.toString()}`;
}
