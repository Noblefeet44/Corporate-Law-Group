// ==============================================================================
// Vercel Serverless Function: Resend Inbound Email Webhook Receiver
// URL on Vercel: https://<your-domain>/api/resend-webhook
// ==============================================================================

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://xsnfafxcbdkyinytjhci.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is missing.');
      return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
    }

    const payload = req.body || {};
    const emailData = payload.data || payload;

    // Normalize sender info
    const fromRaw = emailData.from || '';
    let fromAddress = fromRaw;
    let fromName = '';

    const nameMatch = fromRaw.match(/^(.*?)\s*<(.+?)>$/);
    if (nameMatch) {
      fromName = nameMatch[1].replace(/["']/g, '').trim();
      fromAddress = nameMatch[2].trim();
    } else {
      fromAddress = fromRaw.trim();
      fromName = fromAddress.split('@')[0] || fromAddress;
    }

    const toAddresses = Array.isArray(emailData.to) ? emailData.to.join(', ') : (emailData.to || '');
    const subject = emailData.subject || '(no subject)';
    const bodyHtml = emailData.html || emailData.body || '';
    const bodyText = emailData.text || '';

    // Snippet preview (first 160 characters)
    const rawSnippet = bodyText || bodyHtml.replace(/<[^>]*>/g, ' ');
    const snippet = rawSnippet.replace(/\s+/g, ' ').trim().slice(0, 160);

    const hasAttachment = Boolean(emailData.attachments && emailData.attachments.length > 0);
    const attachments = emailData.attachments || [];

    // Insert record directly into Supabase via REST API
    const insertPayload = [
      {
        message_id: emailData.email_id || emailData.id || `resend-${Date.now()}`,
        from_address: fromAddress,
        from_name: fromName || fromAddress,
        to_address: toAddresses,
        subject: subject,
        snippet: snippet,
        body_html: bodyHtml || `<pre style="font-family: inherit; white-space: pre-wrap;">${bodyText}</pre>`,
        body_text: bodyText,
        folder: 'inbox',
        is_read: false,
        is_starred: false,
        has_attachment: hasAttachment,
        attachments: attachments,
        labels: ['Inbox'],
        raw_headers: emailData.headers || {},
        created_at: new Date().toISOString()
      }
    ];

    const supabaseRes = await fetch(`${supabaseUrl}/rest/v1/emails`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(insertPayload)
    });

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text();
      console.error('Supabase REST error:', errText);
      return res.status(500).json({ error: 'Failed to insert email into Supabase', details: errText });
    }

    const insertedData = await supabaseRes.json();
    return res.status(200).json({ success: true, message: 'Email recorded successfully', record: insertedData });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
