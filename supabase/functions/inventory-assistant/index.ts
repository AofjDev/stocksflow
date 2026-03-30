import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch real inventory data for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [inventoryRes, productsRes, locationsRes, movementsRes, ncRes] = await Promise.all([
      supabase.from("inventory").select("*, products(*), locations(*)"),
      supabase.from("products").select("*").eq("active", true),
      supabase.from("locations").select("*").eq("active", true),
      supabase.from("movements").select("*, products(*)").order("created_at", { ascending: false }).limit(100),
      supabase.from("nonconformities").select("*"),
    ]);

    const inventory = inventoryRes.data || [];
    const products = productsRes.data || [];
    const locations = locationsRes.data || [];
    const movements = movementsRes.data || [];
    const ncs = ncRes.data || [];

    const totalItems = inventory.reduce((s, i) => s + i.quantity, 0);
    const occupiedLocs = new Set(inventory.filter(i => i.quantity > 0).map(i => i.location_id));
    const occupancyRate = locations.length > 0 ? Math.round((occupiedLocs.size / locations.length) * 100) : 0;

    const today = new Date().toISOString().split("T")[0];
    const expiringSoon = inventory.filter(i => i.expiry_date && i.expiry_date > today && i.expiry_date <= new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
    const expired = inventory.filter(i => i.expiry_date && i.expiry_date <= today);
    const openNCs = ncs.filter(nc => nc.status === "aberta" || nc.status === "em_analise");

    // Build stock summary by product
    const stockByProduct: Record<string, { name: string; sku: string; total: number; locations: string[] }> = {};
    for (const item of inventory) {
      const pid = item.product_id;
      if (!stockByProduct[pid]) {
        stockByProduct[pid] = { name: item.products?.name || "?", sku: item.products?.sku || "?", total: 0, locations: [] };
      }
      stockByProduct[pid].total += item.quantity;
      if (item.locations?.full_address) stockByProduct[pid].locations.push(`${item.locations.full_address} (${item.quantity}un)`);
    }

    const stockSummary = Object.values(stockByProduct)
      .sort((a, b) => b.total - a.total)
      .slice(0, 30)
      .map(s => `• ${s.sku} - ${s.name}: ${s.total}un [${s.locations.slice(0, 5).join(", ")}]`)
      .join("\n");

    const recentMovements = movements.slice(0, 20).map(m =>
      `• ${m.created_at?.slice(0, 10)} | ${m.movement_type} | ${m.products?.name || "?"} | Qtd: ${m.quantity}`
    ).join("\n");

    const ncSummary = openNCs.map(nc => `• ${nc.type}: ${nc.description} (${nc.status})`).join("\n") || "Nenhuma NC aberta.";

    const systemPrompt = `Você é um assistente especialista em gestão de estoque, inventário e logística de armazém. Seu nome é StockFlow IA.

Você tem acesso aos dados reais do armazém do usuário. Use esses dados para dar respostas precisas, gerar análises e sugerir melhorias.

## DADOS ATUAIS DO ARMAZÉM

**Resumo Geral:**
- Total de itens em estoque: ${totalItems}
- Total de endereços ativos: ${locations.length}
- Endereços ocupados: ${occupiedLocs.size}
- Taxa de ocupação: ${occupancyRate}%
- Vagas livres: ${locations.length - occupiedLocs.size}
- Produtos cadastrados: ${products.length}
- Itens vencendo em 30 dias: ${expiringSoon.length}
- Itens vencidos: ${expired.length}
- NCs abertas: ${openNCs.length}

**Estoque por Produto (Top 30):**
${stockSummary || "Nenhum item em estoque."}

**Últimas 20 Movimentações:**
${recentMovements || "Nenhuma movimentação registrada."}

**Não Conformidades Abertas:**
${ncSummary}

## SUAS RESPONSABILIDADES

1. **Análise de Estoque:** Responda perguntas sobre quantidades, localizações, tendências
2. **Alertas:** Avise sobre produtos vencendo, estoque baixo, ocupação alta
3. **Estratégias:** Sugira melhorias como FIFO, reorganização de endereços, otimização de espaço
4. **Relatórios:** Gere resumos e análises quando solicitado
5. **Gestão de Inventário:** Ajude com contagem, acuracidade, divergências

Sempre responda em português brasileiro. Use formatação markdown com tabelas quando apropriado. Seja proativo em alertar sobre problemas.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
