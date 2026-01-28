import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VagalumeMusicResult {
  type: string;
  art?: {
    name: string;
    url: string;
    id: string;
  };
  mus?: {
    id: number;
    name: string;
    text: string;
    url: string;
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

    // API key do Vagalume (obrigatória para buscas)
    const API_KEY = Deno.env.get("VAGALUME_API_KEY");
    
    if (!API_KEY) {
      console.error("VAGALUME_API_KEY não configurada");
      return new Response(
        JSON.stringify({ 
          error: "API key do Vagalume não configurada. Configure a secret VAGALUME_API_KEY.", 
          results: [] 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = "https://api.vagalume.com.br";

    if (action === "search") {
      // Busca por trecho de letra ou nome da música
      // Formato: https://api.vagalume.com.br/search.artmus?q=QUERY&limit=10&apikey=KEY
      const searchUrl = `${baseUrl}/search.artmus?q=${encodeURIComponent(query)}&limit=10&apikey=${API_KEY}`;
      console.log("Buscando no Vagalume (artmus):", searchUrl.replace(API_KEY, "***"));
      
      const response = await fetch(searchUrl);
      const responseText = await response.text();
      
      console.log("Status:", response.status);
      console.log("Response preview:", responseText.substring(0, 500));
      
      // Verificar se é HTML (erro) ou JSON
      if (responseText.startsWith("<")) {
        console.error("Vagalume retornou HTML, endpoint pode estar errado ou bloqueado");
        
        // Tentar endpoint alternativo de busca direta
        const altUrl = `${baseUrl}/search.php?musart=${encodeURIComponent(query)}&apikey=${API_KEY}`;
        console.log("Tentando endpoint alternativo:", altUrl.replace(API_KEY, "***"));
        
        const altResponse = await fetch(altUrl);
        const altText = await altResponse.text();
        
        if (altText.startsWith("<")) {
          return new Response(
            JSON.stringify({ 
              results: [], 
              message: "Serviço Vagalume temporariamente indisponível" 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        try {
          const altData = JSON.parse(altText);
          console.log("Dados alternativos:", JSON.stringify(altData).substring(0, 500));
          
          // Processar resposta alternativa
          const results: any[] = [];
          if (altData.response?.docs) {
            altData.response.docs.slice(0, 10).forEach((doc: any) => {
              results.push({
                id: doc.id,
                title: doc.title || doc.name,
                artist: doc.band || doc.art?.name,
                url: doc.url,
              });
            });
          }
          
          return new Response(
            JSON.stringify({ results }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (parseErr) {
          console.error("Erro ao parsear resposta alternativa:", parseErr);
        }
        
        return new Response(
          JSON.stringify({ results: [], message: "Nenhuma música encontrada" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      try {
        const data = JSON.parse(responseText);
        console.log("Dados recebidos:", JSON.stringify(data).substring(0, 500));
        
        const results: any[] = [];
        
        // Formato esperado: { response: { docs: [...] } }
        if (data.response?.docs) {
          data.response.docs.slice(0, 10).forEach((doc: any) => {
            results.push({
              id: doc.id,
              title: doc.title || doc.name,
              artist: doc.band,
              url: doc.url,
            });
          });
        }
        
        // Formato alternativo: { art: {...}, mus: [...] }
        if (data.mus && Array.isArray(data.mus)) {
          data.mus.slice(0, 10).forEach((m: any) => {
            results.push({
              id: m.id,
              title: m.name,
              artist: data.art?.name,
              url: m.url,
            });
          });
        }
        
        if (results.length === 0) {
          return new Response(
            JSON.stringify({ results: [], message: "Nenhuma música encontrada" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ results }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseErr) {
        console.error("Erro ao parsear JSON:", parseErr);
        return new Response(
          JSON.stringify({ results: [], message: "Erro ao processar resposta" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "get_lyrics") {
      // Buscar letra específica
      if (!artist || !music) {
        return new Response(
          JSON.stringify({ error: "Artista e música são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Normalizar nomes para URL do Vagalume
      const normalizedArtist = artist
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      
      const normalizedMusic = music
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      const lyricsUrl = `${baseUrl}/${normalizedArtist}/${normalizedMusic}.json?apikey=${API_KEY}`;
      console.log("Buscando letra:", lyricsUrl.replace(API_KEY, "***"));

      const response = await fetch(lyricsUrl);
      const responseText = await response.text();
      
      if (responseText.startsWith("<")) {
        return new Response(
          JSON.stringify({ error: "Letra não encontrada", found: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data: VagalumeMusicResult = JSON.parse(responseText);
      console.log("Resposta letra tipo:", data.type);

      if (data.type === "notfound" || data.type === "song_notfound" || !data.mus || data.mus.length === 0) {
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
