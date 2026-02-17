import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { destination, origin, outbound_flight, return_flight, hotel, total_cost, budget, days, status } = body;

        if (!destination || !origin) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("saved_trips")
            .insert({
                user_id: user.id,
                destination,
                origin,
                outbound_flight,
                return_flight,
                hotel,
                total_cost: total_cost || 0,
                budget: budget || 0,
                days: days || 0,
                status: status || "planning",
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ trip: data });
    } catch (error) {
        console.error("Save trip error:", error);
        return NextResponse.json({ error: "Failed to save trip" }, { status: 500 });
    }
}
