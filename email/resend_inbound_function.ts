// ==============================================================================
// Supabase Edge Function: Resend Inbound Email Webhook Receiver
// Domain: @mail.corporatelawgroup.org (e.g. inquiries@, support@, pecker@)
// Project: https://xsnfafxcbdkyinytjhci.supabase.co
// Deploy to Supabase: supabase functions deploy resend-inbound --no-verify-jwt
// Webhook URL to enter in Resend: https://xsnfafxcbdkyinytjhci.supabase.co/functions/v1/resend-inbound
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();

    // Resend sends webhooks with type "email.delivered", "email.received", etc.
    // Or standard inbound webhook payload
    const eventType = payload.type || "email.received";
    const emailData = payload.data || payload;

    // Normalize sender info
    const fromRaw = emailData.from || "";
    let fromAddress = fromRaw;
    let fromName = "";
    
    // Parse "Name <email@domain.com>" format
    const nameMatch = fromRaw.match(/^(.*?)\s*<(.+?)>$/);
    if (nameMatch) {
      fromName = nameMatch[1].replace(/["']/g, "").trim();
      fromAddress = nameMatch[2].trim();
    } else {
      fromAddress = fromRaw.trim();
      fromName = fromAddress.split("@")[0];
    }

    const toAddresses = Array.isArray(emailData.to) ? emailData.to.join(", ") : (emailData.to || "");
    const subject = emailData.subject || "(no subject)";
    const bodyHtml = emailData.html || emailData.body || "";
    const bodyText = emailData.text || "";
    
    // Generate preview snippet (first 140 chars)
    const rawSnippet = bodyText || bodyHtml.replace(/<[^>]*>/g, " ");
    const snippet = rawSnippet.replace(/\s+/g, " ").trim().slice(0, 160);

    const hasAttachment = Boolean(emailData.attachments && emailData.attachments.length > 0);
    const attachments = emailData.attachments || [];

    // Insert into public.emails table
    const { data, error } = await supabase.from("emails").insert([
      {
        message_id: emailData.email_id || emailData.id || crypto.randomUUID(),
        from_address: fromAddress,
        from_name: fromName || fromAddress,
        to_address: toAddresses,
        subject: subject,
        snippet: snippet,
        body_html: bodyHtml || `<pre style="font-family: inherit; white-space: pre-wrap;">${bodyText}</pre>`,
        body_text: bodyText,
        folder: "inbox",
        is_read: false,
        is_starred: false,
        has_attachment: hasAttachment,
        attachments: attachments,
        labels: ["Inbox"],
        raw_headers: emailData.headers || {},
        created_at: new Date().toISOString(),
      },
    ]).select();

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email recorded successfully", record: data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Webhook processing exception:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
