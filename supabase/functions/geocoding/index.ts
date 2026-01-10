import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para buscar coordenadas usando Nominatim (OpenStreetMap)
async function geocodeAddress(
  address: string, 
  city: string, 
  state: string, 
  cep?: string,
  neighborhood?: string
): Promise<{ lat: number; lng: number } | null> {
  const headers = {
    "User-Agent": "IgrejaGileadeApp/1.0 (contact@igreja.com)",
    "Accept-Language": "pt-BR,pt;q=0.9",
  };

  // Lista de tentativas de busca em ordem de especificidade
  const searchQueries = [
    // 1. Endereço completo com bairro
    [address, neighborhood, city, state, "Brasil"].filter(Boolean).join(", "),
    // 2. Endereço com cidade e estado
    [address, city, state, "Brasil"].filter(Boolean).join(", "),
    // 3. CEP direto
    cep ? `${cep}, Brasil` : null,
    // 4. Bairro + cidade + estado
    [neighborhood, city, state, "Brasil"].filter(Boolean).join(", "),
    // 5. Cidade + estado
    [city, state, "Brasil"].filter(Boolean).join(", "),
  ].filter(Boolean) as string[];

  console.log("Tentando geocodificar com as seguintes queries:", searchQueries);

  for (const query of searchQueries) {
    try {
      console.log(`Buscando: ${query}`);
      
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&countrycodes=br&addressdetails=1`,
        { headers }
      );

      if (!response.ok) {
        console.error("Nominatim error:", response.status);
        continue;
      }

      const data = await response.json();
      console.log(`Resultado para "${query}":`, data.length > 0 ? "Encontrado" : "Não encontrado");
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }

      // Rate limiting - Nominatim pede 1 request por segundo
      await new Promise((resolve) => setTimeout(resolve, 1100));
    } catch (error) {
      console.error(`Erro na busca "${query}":`, error);
    }
  }

  // Fallback: usar API do ViaCEP para obter mais dados do CEP e tentar novamente
  if (cep) {
    try {
      console.log("Tentando via CEP API...");
      const cepClean = cep.replace(/\D/g, "");
      const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      
      if (viaCepResponse.ok) {
        const viaCepData = await viaCepResponse.json();
        if (!viaCepData.erro) {
          const viaCepQuery = `${viaCepData.logradouro}, ${viaCepData.bairro}, ${viaCepData.localidade}, ${viaCepData.uf}, Brasil`;
          console.log(`Buscando via ViaCEP: ${viaCepQuery}`);
          
          await new Promise((resolve) => setTimeout(resolve, 1100));
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(viaCepQuery)}&format=json&limit=1&countrycodes=br`,
            { headers }
          );

          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
              };
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro no fallback ViaCEP:", error);
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, casaId } = await req.json();

    if (action === "geocode_single") {
      // Geocodificar uma casa específica
      const { data: casa, error } = await supabase
        .from("casas_refugio")
        .select("*")
        .eq("id", casaId)
        .single();

      if (error || !casa) {
        return new Response(
          JSON.stringify({ success: false, error: "Casa não encontrada" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fullAddress = [casa.address, casa.numero].filter(Boolean).join(", ");
      const coords = await geocodeAddress(
        fullAddress,
        casa.city || "",
        casa.state || "",
        casa.cep,
        casa.neighborhood
      );

      if (coords) {
        await supabase
          .from("casas_refugio")
          .update({ latitude: coords.lat, longitude: coords.lng })
          .eq("id", casaId);

        return new Response(
          JSON.stringify({ success: true, coordinates: coords }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível encontrar coordenadas" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "geocode_igreja") {
      // Geocodificar endereço da igreja
      const { address, number, neighborhood, city, state, cep } = await req.json();
      
      const fullAddress = [address, number].filter(Boolean).join(", ");
      const coords = await geocodeAddress(
        fullAddress,
        city || "",
        state || "",
        cep,
        neighborhood
      );

      if (coords) {
        return new Response(
          JSON.stringify({ success: true, coordinates: coords }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível encontrar coordenadas para este endereço" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "geocode_all") {
      // Geocodificar todas as casas sem coordenadas
      const { data: casas, error } = await supabase
        .from("casas_refugio")
        .select("*")
        .or("latitude.is.null,longitude.is.null");

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let successCount = 0;
      let failCount = 0;
      const results: { id: string; name: string; success: boolean }[] = [];

      for (const casa of casas || []) {
        // Rate limiting - Nominatim pede 1 request por segundo
        await new Promise((resolve) => setTimeout(resolve, 1100));

        const fullAddress = [casa.address, casa.numero].filter(Boolean).join(", ");
        const coords = await geocodeAddress(
          fullAddress,
          casa.city || "",
          casa.state || "",
          casa.cep,
          casa.neighborhood
        );

        if (coords) {
          await supabase
            .from("casas_refugio")
            .update({ latitude: coords.lat, longitude: coords.lng })
            .eq("id", casa.id);
          successCount++;
          results.push({ id: casa.id, name: casa.name, success: true });
        } else {
          failCount++;
          results.push({ id: casa.id, name: casa.name, success: false });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          total: casas?.length || 0,
          successCount,
          failCount,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Ação inválida" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
