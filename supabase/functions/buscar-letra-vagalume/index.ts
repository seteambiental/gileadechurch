import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VagalumeSearchResult {
  docs?: {
    id: string;
    title: string;
    band: string;
    url: string;
  }[];
}

interface VagalumeMusicResult {
  type: string;
  art?: {
    name: string;
    url: string;
  };
  mus?: {
    id: number;
    name: string;
    text: string;
    translate?: {
      text: string;
    }[];
  }[];
  badwords?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, artist, music } = await req.json();

    // API key do Vagalume (opcional, sem key funciona com limitação)
    const API_KEY = Deno.env.get("VAGALUME_API_KEY") || "";
    const baseUrl = "https://api.vagalume.com.br";

    if (action === "search") {
      // Buscar músicas pelo nome
      const searchUrl = `${baseUrl}/search.php?q=${encodeURIComponent(query)}`;
      console.log("Buscando no Vagalume:", searchUrl);
      
      const response = await fetch(searchUrl);
      const data: VagalumeSearchResult = await response.json();

      if (!data.docs || data.docs.length === 0) {
        return new Response(
          JSON.stringify({ results: [], message: "Nenhuma música encontrada" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Retornar os 10 primeiros resultados
      const results = data.docs.slice(0, 10).map(doc => ({
        id: doc.id,
        title: doc.title,
        artist: doc.band,
        url: doc.url,
      }));

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_lyrics") {
      // Buscar letra específica
      if (!artist || !music) {
        return new Response(
          JSON.stringify({ error: "Artista e música são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const lyricsUrl = `${baseUrl}/${encodeURIComponent(artist.toLowerCase().replace(/\s+/g, "-"))}/${encodeURIComponent(music.toLowerCase().replace(/\s+/g, "-"))}.json`;
      console.log("Buscando letra:", lyricsUrl);

      const response = await fetch(lyricsUrl);
      const data: VagalumeMusicResult = await response.json();

      if (data.type === "notfound" || !data.mus || data.mus.length === 0) {
        return new Response(
          JSON.stringify({ error: "Letra não encontrada", found: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const musicData = data.mus[0];
      
      return new Response(
        JSON.stringify({
          found: true,
          title: musicData.name,
          artist: data.art?.name || artist,
          lyrics: musicData.text,
          translation: musicData.translate?.[0]?.text || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida. Use 'search' ou 'get_lyrics'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na busca Vagalume:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao buscar dados", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
