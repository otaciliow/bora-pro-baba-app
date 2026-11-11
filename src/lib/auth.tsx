import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AuthStatus = "anonymous" | "pending" | "approved";

export interface UserProfile {
    id: string;
    name: string | null;
    phone: string | null;
    primary_position: string | null;
    rating: number | null;
}

export interface GroupMembership {
    group_id: string;
    role: "admin" | "player";
    status: "pending" | "approved";
}

interface AuthCtx {
    ready: boolean;
    status: AuthStatus;
    user: User | null;
    profile: UserProfile | null;
    membership: GroupMembership | null;
    signInWithPassword: (email: string, pass: string) => Promise<void>;
    signInWithGroup: (params: {
        email: string;
        pass: string;
        name: string;
        position: string;
        mode: "create" | "join";
        groupName?: string;
        inviteCode?: string;
    }) => Promise<void>;
    signOut: () => Promise<void>;
    refreshAuth: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [ready, setReady] = useState(false);
    const [status, setStatus] = useState<AuthStatus>("anonymous");
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [membership, setMembership] = useState<GroupMembership | null>(null);

    async function loadUserData(userId: string) {
        try {
            const { data: prof } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            setProfile(prof ?? null);

            const { data: memb } = await supabase
                .from("group_members")
                .select("group_id, role, status")
                .eq("user_id", userId)
                .maybeSingle();

            setMembership(memb ?? null);

            if (memb?.status === "approved") {
                setStatus("approved");
            } else if (memb?.status === "pending") {
                setStatus("pending");
            } else {
                setStatus("pending");
            }
        } catch (err) {
            console.log("Erro ao carregar perfil do usuário", err)
            setStatus("anonymous");
        }
    }

    async function refreshAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            await loadUserData(session.user.id)
        } else {
            setUser(null);
            setProfile(null);
            setMembership(null);
            setStatus("anonymous");
        }
        setReady(true);
    }

    useEffect(() => {
        refreshAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user);
                await loadUserData(session.user.id);
            } else {
                setUser(null);
                setProfile(null);
                setMembership(null);
                setStatus("anonymous");
            }
            setReady(true);
        });

        return () => subscription.unsubscribe();
    }, [])

    const signInWithPassword = async (email: string, pass: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        });

        if (error) throw error;

        await refreshAuth();
    };

    const signInWithGroup = async ({
        email,
        pass,
        name,
        position,
        mode,
        groupName,
        inviteCode,
    }: {
        email: string;
        pass: string;
        name: string;
        position: string;
        mode: "create" | "join";
        groupName?: string;
        inviteCode?: string;
    }) => {
        const { data, error: signUpError } = await supabase.auth.signUp({
            email, 
            password: pass,
            options: {
                data: {
                    name,
                    onboarding: mode,
                    group_name: groupName || "",
                    invite_code: inviteCode || "",
                }
            }
        });

        if (signUpError || !data.user) throw signUpError || new Error("Erro ao criar conta de usuário.");

        const { error: profileError } = await supabase
            .from("profiles")
            .update({
                primary_position: position as "goalkeeper" | "defender" | "midfielder" | "forward",
            })
            .eq("id", data.user.id);

        if (profileError) throw profileError;

        const { error: rpcError } = await (supabase.rpc as any)("complete_onboarding");
        if (rpcError) throw rpcError;

        await refreshAuth();
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setMembership(null);
        setStatus("anonymous");
    };

    return (
        <Ctx.Provider
            value={{
                ready,
                status,
                user,
                profile,
                membership,
                signInWithPassword,
                signInWithGroup,
                signOut,
                refreshAuth
            }}
        >
            { children }
        </Ctx.Provider>
    )
}

export function useAuth() {
    const c = useContext(Ctx);
    if (!c) throw new Error("useAuth must be used inside AuthProvider");
    return c;
}