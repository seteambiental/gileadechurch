// Edge function para gerar mensagem de WhatsApp para novos convertidos / reconciliados usando Lovable AI

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fallbackMensagem(nome: string, tipo: string) {
  const primeiro = (nome || "").split(" ")[0] || "";
  if (tipo === "reconciliacao") {
    return `Olá ${primeiro}! 🙏\n\nQue alegria imensa ter você de volta à casa do Pai! Sua reconciliação é uma grande festa no céu.\n\nEstamos aqui para caminhar com você nessa nova fase. Conte conosco sempre!\n\nCom carinho,\nIgreja Gileade 💙`;
  }
  return `Olá ${primeiro}! 🙏\n\nQue alegria ter você na família de Deus! Sua decisão de entregar a vida a Jesus é o início de uma linda caminhada.\n\nEstamos aqui para te acompanhar de perto. Conte conosco sempre!\n\nCom carinho,\nIgreja Gileade 💙`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome, tipo } = await req.json();
    const tipoConv = tipo === "reconciliacao" ? "reconciliacao" : "conversao";

    if (!nome) {
      return new Response(
        JSON.stringify({ error: "Nome é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const primeiroNome = (nome as string).split(" ")[0];
    const contexto =
      tipoConv === "reconciliacao"
        ? "pessoa que se reconciliou com Deus (voltou para a igreja após um tempo afastada)"
        : "pessoa que acabou de aceitar Jesus / se converteu";

    const prompt = `Gere uma mensagem curta e calorosa de WhatsApp para acolher uma ${contexto}, chamada ${primeiroNome}.
A mensagem deve:
- Ser acolhedora, pessoal e genuína
- Celebrar a decisão dela
- Colocar a igreja à disposição para acompanhá-la
- Usar emojis de forma moderada (1-3 emojis)
- Ter no máximo 5 linhas
- Assinar como "Igreja Gileade"
- Ser em português brasileiro

Retorne apenas a mensagem, sem explicações adicionais.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ mensagem: fallbackMensagem(nome, tipoConv) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("Lovable AI error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ mensagem: fallbackMensagem(nome, tipoConv) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const mensagem = data.choices?.[0]?.message?.content?.trim() || fallbackMensagem(nome, tipoConv);

    return new Response(
      JSON.stringify({ mensagem }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao gerar mensagem:", error);
    return new Response(
      JSON.stringify({ mensagem: fallbackMensagem("", "conversao") }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});