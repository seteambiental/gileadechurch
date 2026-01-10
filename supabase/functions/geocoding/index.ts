import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para buscar coordenadas usando Nominatim (OpenStreetMap)
async function geocodeAddress(address: string, city: string, state: string, cep?: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Montar query de busca
    const searchParts = [address, city, state, "Brasil"].filter(Boolean);
    const query = encodeURIComponent(searchParts.join(", "));
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=br`,
      {
        headers: {
          "User-Agent": "IgrejaApp/1.0",
        },
      }
    );

    if (!response.ok) {
      console.error("Nominatim error:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }

    // Tentar busca alternativa só com CEP
    if (cep) {
      const cepQuery = encodeURIComponent(`${cep}, Brasil`);
      const cepResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${cepQuery}&format=json&limit=1&countrycodes=br`,
        {
          headers: {
            "User-Agent": "IgrejaApp/1.0",
          },
        }
      );

      if (cepResponse.ok) {
        const cepData = await cepResponse.json();
        if (cepData && cepData.length > 0) {
          return {
            lat: parseFloat(cepData[0].lat),
            lng: parseFloat(cepData[0].lon),
          };
        }
      }
    }

    // Tentar busca só com bairro e cidade
    const simplifiedQuery = encodeURIComponent(`${city}, ${state}, Brasil`);
    const simplifiedResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${simplifiedQuery}&format=json&limit=1&countrycodes=br`,
      {
        headers: {
          "User-Agent": "IgrejaApp/1.0",
        },
      }
    );

    if (simplifiedResponse.ok) {
      const simplifiedData = await simplifiedResponse.json();
      if (simplifiedData && simplifiedData.length > 0) {
        return {
          lat: parseFloat(simplifiedData[0].lat),
          lng: parseFloat(simplifiedData[0].lon),
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
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
        casa.cep
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
          casa.cep
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
