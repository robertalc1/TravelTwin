import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Flight, Hotel, TripRecommendation } from "@/lib/supabase/types";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { from, budget, days, flightType } = body as {
            from: string;
            budget: number;
            days: number;
            flightType: string;
        };

        if (!from || !budget || !days || !flightType) {
            return NextResponse.json(
                { error: "Missing required fields: from, budget, days, flightType" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // 1. Find outbound flights within 40% of total budget
        const maxFlightPrice = budget * 0.4;
        const { data: outboundFlights, error: flightsError } = await supabase
            .from("flights")
            .select("*")
            .eq("from", from)
            .eq("flightType", flightType)
            .lte("price", maxFlightPrice)
            .order("price", { ascending: true })
            .limit(200);

        if (flightsError) {
            return NextResponse.json(
                { error: "Failed to search flights: " + flightsError.message },
                { status: 500 }
            );
        }

        if (!outboundFlights || outboundFlights.length === 0) {
            return NextResponse.json({ recommendations: [], message: "No flights found within budget. Try increasing your budget or changing the flight type." });
        }

        // 2. Get unique destinations
        const destinations = [...new Set(outboundFlights.map((f: Flight) => f.to))];

        // 3. For each destination, find best package
        const recommendations: TripRecommendation[] = [];

        for (const destination of destinations) {
            // Cheapest outbound flight to this destination
            const outbound = outboundFlights.find((f: Flight) => f.to === destination);
            if (!outbound) continue;

            // Find cheapest return flight
            const { data: returnFlights } = await supabase
                .from("flights")
                .select("*")
                .eq("from", destination)
                .eq("to", from)
                .eq("flightType", flightType)
                .order("price", { ascending: true })
                .limit(1);

            if (!returnFlights || returnFlights.length === 0) continue;
            const returnFlight = returnFlights[0] as Flight;

            const flightsCost = outbound.price + returnFlight.price;
            const remainingBudget = budget - flightsCost;

            if (remainingBudget <= 0) continue;

            // Find hotel with matching days within remaining budget
            const { data: hotels } = await supabase
                .from("hotels")
                .select("*")
                .eq("place", destination)
                .eq("days", days)
                .lte("total", remainingBudget)
                .order("total", { ascending: true })
                .limit(1);

            if (!hotels || hotels.length === 0) continue;
            const hotel = hotels[0] as Hotel;

            const totalCost = flightsCost + hotel.total;
            const savings = budget - totalCost;

            recommendations.push({
                destination,
                outboundFlight: outbound as Flight,
                returnFlight,
                hotel,
                totalCost,
                savings,
                savingsPercent: Math.round((savings / budget) * 100),
            });
        }

        // Sort by savings (highest first)
        recommendations.sort((a, b) => b.savings - a.savings);
        const top10 = recommendations.slice(0, 10);

        // Save search to user_searches if authenticated
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                await supabase.from("user_searches").insert({
                    user_id: user.id,
                    from_city: from,
                    budget,
                    days,
                    flight_type: flightType,
                    results_count: top10.length,
                });
            }
        } catch {
            // Non-critical, ignore
        }

        return NextResponse.json({
            recommendations: top10,
            message:
                top10.length === 0
                    ? "No complete trip packages found within your budget. Try a higher budget or fewer days."
                    : undefined,
        });
    } catch (error) {
        console.error("Recommendations error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred while searching for recommendations." },
            { status: 500 }
        );
    }
}
