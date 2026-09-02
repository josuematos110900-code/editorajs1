// Publicada no Supabase em: Edge Functions > welcome-email
// Requer o secret RESEND_API_KEY definido em Edge Functions > welcome-email > Secrets.
// Chamada pelo cliente (AuthContext.tsx) logo após um registo bem-sucedido.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "FinancasPro <onboarding@resend.dev>";

// Necessário porque esta função é chamada diretamente do browser (via
// supabase.functions.invoke no AuthContext.tsx) — sem isto, o navegador
// bloqueia o pedido antes sequer de ele chegar ao código abaixo.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function welcomeEmailHtml(name: string) {
  const firstName = name?.trim().split(" ")[0] || "olá";
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
    <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg,#17A48C,#0A5548); margin-bottom: 24px;"></div>
    <h1 style="font-size: 22px; color: #111A2E; margin-bottom: 8px;">Bem-vindo(a), ${firstName}! 👋</h1>
    <p style="font-size: 15px; color: #334467; line-height: 1.6;">
      A tua conta no <strong>FinançasPro</strong> já está pronta, e ativámos
      <strong>14 dias de Premium grátis</strong> para experimentares tudo sem limites:
      contas, metas, dívidas, orçamento e pagamentos recorrentes ilimitados.
    </p>
    <p style="font-size: 15px; color: #334467; line-height: 1.6;">
      Sugestão para começares bem: define o teu rendimento mensal e cria a tua
      primeira meta financeira — leva menos de 2 minutos.
    </p>
    <p style="font-size: 13px; color: #7688AA; margin-top: 32px;">
      Se não foste tu que criaste esta conta, podes ignorar este email.
    </p>
  </div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY não está configurada nos secrets desta função.");
    return new Response("Email não configurado", { status: 500, headers: corsHeaders });
  }

  let body: { email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const { email, name } = body;
  if (!email) {
    return new Response("Email em falta", { status: 400, headers: corsHeaders });
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "Bem-vindo ao FinançasPro — 14 dias de Premium grátis",
      html: welcomeEmailHtml(name ?? ""),
    }),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    console.error("Erro do Resend:", errorText);
    return new Response("Erro ao enviar email", { status: 502, headers: corsHeaders });
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
});
