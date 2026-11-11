import { supabase } from "@/integrations/supabase/client";

export async function fetchNextMatch() {
    const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("is_open", true)
        .order("match_date", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) throw new Error;
    return data;
}

export async function fetchMatchParticipants(matchId: string) {
    const { data: presences, error: presError } = await supabase
        .from("match_presences")
        .select(`
            *,
            profiles (
                id,
                name,
                primary_position,
                rating
            )
        `)
        .eq("match_id", matchId);

    if (presError) throw presError;

    const { data: guests, error: guestError } = await supabase
        .from("match_guests")
        .select(`
            *,
            profiles:invited_by (
                name
            )
        `)
        .eq("match_id", matchId);

    if (guestError) throw guestError;

    return {
        presences: presences || [],
        guests: guests || [],
    };
}

export async function confirmPresence(matchId: string, userId: string) {
    const { error } = await supabase
        .from("match_presences")
        .insert({match_id: matchId, user_id: userId});
    
    if (error) throw error;
}

export async function cancelPresence(matchId: string, userId: string) {
    const { error } = await supabase
        .from("match_presences")
        .delete()
        .eq("match_id", matchId)
        .eq("user_id", userId);

    if (error) throw error;
}