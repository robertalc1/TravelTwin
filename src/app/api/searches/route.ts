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
        const { from_city, budget, days, flight_type, results_count } = body;

        const { data, error } = await supabase
            .from("user_searches")
            .insert({
                user_id: user.id,
                from_city: from_city || "Unknown",
                budget: budget || 0,
                days: days || 0,
                flight_type: flight_type || "any",
                results_count: results_count || 0,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ search: data });
    } catch (error) {
        console.error("Save search error:", error);
        return NextResponse.json({ error: "Failed to save search" }, { status: 500 });
    }
}
