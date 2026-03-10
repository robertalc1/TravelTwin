/* ── Data Transformation Helpers for Amadeus API ── */

import type { ParsedFlightOffer, ParsedHotelOffer } from '@/types/itinerary';

export const parseFlightOffer = (offer: Record<string, unknown>): ParsedFlightOffer => {
    const price = offer.price as Record<string, unknown>;
    const itineraries = (offer.itineraries as Record<string, unknown>[]) || [];

    return {
        id: offer.id as string,
        price: {
            total: parseFloat(price?.total as string) || 0,
            currency: (price?.currency as string) || 'EUR',
            base: parseFloat(price?.base as string) || 0,
        },
        itineraries: itineraries.map((itinerary) => ({
            duration: (itinerary.duration as string) || '',
            segments: ((itinerary.segments as Record<string, unknown>[]) || []).map(
                (segment) => {
                    const dep = segment.departure as Record<string, string>;
                    const arr = segment.arrival as Record<string, string>;
                    const aircraft = segment.aircraft as Record<string, string> | undefined;
                    return {
                        departure: {
                            airport: dep?.iataCode || '',
                            terminal: dep?.terminal,
                            time: dep?.at || '',
                        },
                        arrival: {
                            airport: arr?.iataCode || '',
                            terminal: arr?.terminal,
                            time: arr?.at || '',
                        },
                        carrier: (segment.carrierCode as string) || '',
                        flightNumber: (segment.number as string) || '',
                        aircraft: aircraft?.code,
                        duration: (segment.duration as string) || '',
                    };
                }
            ),
        })),
        validatingAirlineCodes: (offer.validatingAirlineCodes as string[]) || [],
    };
};

export const parseHotelOffer = (offer: Record<string, unknown>): ParsedHotelOffer => {
    const hotel = offer.hotel as Record<string, unknown>;
    const offers = (offer.offers as Record<string, unknown>[]) || [];
    const address = hotel?.address as Record<string, unknown> | undefined;

    return {
        hotelId: (hotel?.hotelId as string) || '',
        name: (hotel?.name as string) || 'Unknown Hotel',
        rating: parseInt(hotel?.rating as string) || 3,
        address: address || {},
        location: {
            lat: parseFloat(hotel?.latitude as string) || 0,
            lon: parseFloat(hotel?.longitude as string) || 0,
        },
        offers: offers.map((room) => {
            const roomPrice = room.price as Record<string, unknown>;
            const roomInfo = room.room as Record<string, unknown> | undefined;
            const description = roomInfo?.description as Record<string, string> | undefined;
            const guests = room.guests as Record<string, number> | undefined;

            return {
                id: (room.id as string) || '',
                checkIn: (room.checkInDate as string) || '',
                checkOut: (room.checkOutDate as string) || '',
                price: {
                    total: parseFloat(roomPrice?.total as string) || 0,
                    currency: (roomPrice?.currency as string) || 'EUR',
                },
                roomType: (roomInfo?.type as string) || undefined,
                description: description?.text,
                guests: guests?.adults,
            };
        }),
        amenities: (hotel?.amenities as string[]) || [],
    };
};

export const handleAmadeusError = (error: Record<string, unknown>) => {
    const code = error?.code as number;
    const response = error?.response as Record<string, unknown> | undefined;
    const status = response?.status as number | undefined;

    if (code === 38191) return { error: 'Invalid IATA code', status: 400 };
    if (code === 38192) return { error: 'Date is in the past', status: 400 };
    if (status === 429) return { error: 'Rate limit exceeded', status: 429 };
    if (status && status >= 500) return { error: 'Amadeus service unavailable', status: 503 };
    return { error: 'Unknown error', status: 500 };
};
