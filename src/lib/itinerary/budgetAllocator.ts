/* ── Budget Allocation Algorithm ── */

import type { ParsedFlightOffer, ParsedHotelOffer, TripPackage, DayPlan, PointOfInterest } from '@/types/itinerary';

function calculateSavings(flight: ParsedFlightOffer, hotel: ParsedHotelOffer): number {
    // Estimate savings: ~15% off combined retail
    const flightRetail = flight.price.total * 1.15;
    const hotelRetail = (hotel.offers[0]?.price.total || 0) * 1.12;
    const packagePrice = flight.price.total + (hotel.offers[0]?.price.total || 0);
    return Math.max(0, Math.round((flightRetail + hotelRetail - packagePrice) * 100) / 100);
}

function generateDayByDayPlan(
    flight: ParsedFlightOffer,
    hotel: ParsedHotelOffer,
    activities: PointOfInterest[],
    departureDate: string,
    returnDate: string
): DayPlan[] {
    const start = new Date(departureDate);
    const end = new Date(returnDate);
    const days: DayPlan[] = [];
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;

    for (let i = 0; i < totalDays; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayActivities: DayPlan['activities'] = [];

        if (i === 0) {
            // Departure day
            const outbound = flight.itineraries[0]?.segments[0];
            dayActivities.push({
                time: outbound?.departure.time?.split('T')[1]?.substring(0, 5) || '08:00',
                title: 'Departure Flight',
                description: `Flight from ${outbound?.departure.airport || 'Origin'} to ${outbound?.arrival.airport || 'Destination'}`,
                type: 'flight',
            });
            dayActivities.push({
                time: '15:00',
                title: `Check-in at ${hotel.name}`,
                description: `${hotel.rating}★ hotel`,
                type: 'hotel',
            });
        } else if (i === totalDays - 1) {
            // Return day
            const returnFlight = flight.itineraries[1]?.segments[0];
            dayActivities.push({
                time: '11:00',
                title: 'Hotel Check-out',
                description: `Check out from ${hotel.name}`,
                type: 'hotel',
            });
            dayActivities.push({
                time: returnFlight?.departure.time?.split('T')[1]?.substring(0, 5) || '16:00',
                title: 'Return Flight',
                description: `Flight back to ${returnFlight?.departure.airport || 'Origin'}`,
                type: 'flight',
            });
        } else {
            // Activity days
            const dayIndex = i - 1;
            const startIdx = dayIndex * 2;
            const dayPOIs = activities.slice(startIdx, startIdx + 2);

            dayActivities.push({
                time: '09:00',
                title: dayPOIs[0]?.name || 'Explore the city',
                description: dayPOIs[0]?.category || 'Sightseeing and exploration',
                type: 'activity',
            });
            dayActivities.push({
                time: '14:00',
                title: dayPOIs[1]?.name || 'Afternoon activity',
                description: dayPOIs[1]?.category || 'Local experience',
                type: 'activity',
            });
        }

        days.push({ day: i + 1, date: dateStr, activities: dayActivities });
    }

    return days;
}

export const generatePackagesWithinBudget = (
    flights: ParsedFlightOffer[],
    hotels: ParsedHotelOffer[],
    activities: PointOfInterest[],
    budget: number,
    travelers: number,
    departureDate: string,
    returnDate: string
): TripPackage[] => {
    const packages: TripPackage[] = [];

    for (const flight of flights.slice(0, 10)) {
        const flightPrice = flight.price.total * travelers;
        const remainingBudget = budget - flightPrice;

        if (remainingBudget <= 0) continue;

        const hotelBudget = remainingBudget * 0.5;
        const suitableHotels = hotels.filter((h) => {
            const hotelTotal = h.offers[0]?.price.total || 0;
            return hotelTotal <= hotelBudget;
        });

        for (const hotel of suitableHotels.slice(0, 3)) {
            const hotelPrice = hotel.offers[0]?.price.total || 0;
            const activitiesBudget = remainingBudget - hotelPrice;
            const totalPrice = flightPrice + hotelPrice;
            const savings = calculateSavings(flight, hotel);

            const itinerary = generateDayByDayPlan(
                flight,
                hotel,
                activities,
                departureDate,
                returnDate
            );

            packages.push({
                id: `${flight.id}-${hotel.hotelId}`,
                flight,
                hotel,
                activities,
                activitiesBudget: Math.max(0, activitiesBudget),
                totalPrice,
                priceBreakdown: {
                    flights: flightPrice,
                    hotel: hotelPrice,
                    activities: Math.min(activitiesBudget * 0.3, 200),
                },
                savings,
                withinBudget: totalPrice <= budget,
                itinerary,
            });
        }
    }

    return packages.sort((a, b) => {
        if (a.withinBudget && !b.withinBudget) return -1;
        if (!a.withinBudget && b.withinBudget) return 1;
        return b.savings - a.savings;
    });
};
