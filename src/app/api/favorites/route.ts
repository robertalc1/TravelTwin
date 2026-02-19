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
        const { city_name, city_data } = body;

        if (!city_name) {
            return NextResponse.json({ error: "Missing city_name" }, { status: 400 });
        }

        // Check if already favorited
        const { data: existing } = await supabase
            .from("favorites")
            .select("id")
            .eq("user_id", user.id)
            .eq("city_name", city_name)
            .single();

        if (existing) {
            return NextResponse.json({ message: "Already favorited", id: existing.id });
        }

        const { data, error } = await supabase
            .from("favorites")
            .insert({
                user_id: user.id,
                city_name,
                city_data: city_data || null,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ favorite: data });
    } catch (error) {
        console.error("Favorite error:", error);
        return NextResponse.json({ error: "Failed to save favorite" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const cityName = searchParams.get("city_name");

        if (!cityName) {
            return NextResponse.json({ error: "Missing city_name" }, { status: 400 });
        }

        const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("city_name", cityName);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Removed from favorites" });
    } catch (error) {
        console.error("Unfavorite error:", error);
        return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
    }
}
