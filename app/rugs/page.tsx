import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function RugsPage() {
    const { data, error } = await supabase.from("rugs").select("*");

    if (error) {
        return <p style={{ padding: 40 }}>Error: {error.message}</p>;
    }

    return (
        <main style={{ padding: 40, fontFamily: "sans-serif" }}>
            <h1>Rugs</h1>
            <ul>
                {data?.map((rug) => (
                    <li key={rug.id}>{rug.name}</li>
                ))}
            </ul>
        </main>
    );
}