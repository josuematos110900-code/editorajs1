// Publicada no Supabase em: Edge Functions > trial-reminder-cron
// Requer o secret CRON_SECRET definido em Edge Functions >
// trial-reminder-cron > Secrets — tem de ser IGUAL ao segredo guardado no
// Supabase Vault (nome 'cron_secret_trial_reminder'), que é o que o
// pg_cron usa para chamar esta função todos os dias.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "FinancasPro <onboarding@resend.dev>";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function reminderEmailHtml(name: string, daysLeft: number) {
  const firstName = name?.trim().split(" ")[0] || "olá";
  const dayWord = daysLeft === 1 ? "amanhã" : daysLeft === 0 ? "hoje" : `em ${daysLeft} dias`;
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
    <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg,#D4A017,#B8860B); margin-bottom: 24px;"></div>
    <h1 style="font-size: 22px; color: #111A2E; margin-bottom: 8px;">O teu trial termina ${dayWord}, ${firstName}</h1>
    <p style="font-size: 15px; color: #334467; line-height: 1.6;">
      Depois disso, a tua conta volta automaticamente para o plano Free
      (2 contas, 2 metas, 2 dívidas, 5 orçamentos, 3 pagamentos recorrentes).
    </p>
    <p style="font-size: 15px; color: #334467; line-height: 1.6;">
      Se estás a gostar do FinançasPro, faz upgrade agora para não perderes
      o acesso ilimitado — entra na app e vai a Configurações → Plano.
    </p>
  </div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!CRON_SECRET) {
    console.error("CRON_SECRET não está configurado nos secrets desta função.");
    return new Response("Não configurado", { status: 500 });
  }

  let body: { secret?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.secret !== CRON_SECRET) {
    console.error("trial-reminder-cron: segredo inválido, pedido ignorado.");
    return new Response("Unauthorized", { status: 401 });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY não está configurada nos secrets desta função.");
    return new Response("Email não configurado", { status: 500 });
  }

  const { data: users, error } = await supabaseAdmin.rpc("get_trialing_users_to_remind", {
    days_before: 3,
  });

  if (error) {
    console.error("Erro ao procurar utilizadores em trial:", error);
    return new Response("Erro interno", { status: 500 });
  }

  const sentUserIds: string[] = [];

  for (const u of users ?? []) {
    try {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: u.email,
          subject: `O teu trial Premium termina em ${u.days_left} dia(s)`,
          html: reminderEmailHtml(u.full_name ?? "", u.days_left),
        }),
      });
      if (resendResponse.ok) {
        sentUserIds.push(u.user_id);
      } else {
        console.error(`Falha ao enviar para ${u.email}:`, await resendResponse.text());
      }
    } catch (err) {
      console.error(`Erro ao enviar para ${u.email}:`, err);
    }
  }

  if (sentUserIds.length > 0) {
    const { error: markError } = await supabaseAdmin.rpc("mark_trial_reminders_sent", {
      user_ids: sentUserIds,
    });
    if (markError) console.error("Erro ao marcar lembretes como enviados:", markError);
  }

  return new Response(JSON.stringify({ processed: users?.length ?? 0, sent: sentUserIds.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
