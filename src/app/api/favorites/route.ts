import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_ITEM_TYPES = ["city", "attraction", "hotel"] as const;
type ItemType = (typeof ALLOWED_ITEM_TYPES)[number];

function isItemType(v: unknown): v is ItemType {
    return typeof v === "string" && (ALLOWED_ITEM_TYPES as readonly string[]).includes(v);
}

/**
 * GET — list all favorites for the signed-in user, newest first.
 */
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ favorites: data ?? [] });
}

/**
 * POST — add a favorite for the signed-in user.
 *
 * Body: { item_type?: 'city' | 'attraction' | 'hotel', item_id: string, item_name?: string, item_data?: object }
 * `item_type` defaults to 'city'; `item_name` defaults to `item_id`.
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json().catch(() => ({}));
        const itemType: ItemType = isItemType(body?.item_type) ? body.item_type : "city";
        const itemId: string = String(body?.item_id ?? "").trim();
        const itemName: string = String(body?.item_name ?? itemId).trim();
        const itemData = (body?.item_data ?? null) as Record<string, unknown> | null;

        if (!itemId) {
            return NextResponse.json({ error: "Missing item_id" }, { status: 400 });
        }

        // Dedupe — a user can only favorite each (type, id) once.
        const { data: existing } = await supabase
            .from("favorites")
            .select("id")
            .eq("user_id", user.id)
            .eq("item_type", itemType)
            .eq("item_id", itemId)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ favorite: existing, message: "Already favorited" });
        }

        const { data, error } = await supabase
            .from("favorites")
            .insert({
                user_id: user.id,
                item_type: itemType,
                item_id: itemId,
                item_name: itemName,
                item_data: itemData,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ favorite: data });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save favorite";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE — remove a favorite for the signed-in user.
 *
 * Query: `?id=<row-id>` OR `?item_type=<type>&item_id=<id>` (item_type defaults to 'city').
 */
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const itemId = searchParams.get("item_id");
        const itemTypeParam = searchParams.get("item_type") ?? "city";
        const itemType: ItemType = isItemType(itemTypeParam) ? itemTypeParam : "city";

        if (!id && !itemId) {
            return NextResponse.json({ error: "Missing id or item_id" }, { status: 400 });
        }

        const query = supabase.from("favorites").delete().eq("user_id", user.id);
        const { error } = id
            ? await query.eq("id", id)
            : await query.eq("item_type", itemType).eq("item_id", itemId!);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ message: "Removed from favorites" });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to remove favorite";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
