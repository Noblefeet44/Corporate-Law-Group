// ==============================================================================
// Vercel Serverless Function: Sync Inbound Emails from Resend to Supabase
// URL on Vercel: https://<your-domain>/api/sync-emails
// ==============================================================================

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://xsnfafxcbdkyinytjhci.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseServiceKey || !resendApiKey) {
      return res.status(500).json({ error: 'Missing environment variables on Vercel.' });
    }

    // 1. Fetch received emails list from Resend
    const resendRes = await fetch('https://api.resend.com/emails/receiving', {
      headers: { 'Authorization': `Bearer ${resendApiKey}` }
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      return res.status(resendRes.status).json({ error: 'Failed to fetch from Resend', details: errText });
    }

    const resendData = await resendRes.json();
    const receivedList = resendData.data || [];

    if (receivedList.length === 0) {
      return res.status(200).json({ success: true, count: 0, message: 'No inbound emails found in Resend.' });
    }

    // 2. Fetch existing message_ids from Supabase
    const supabaseCheck = await fetch(`${supabaseUrl}/rest/v1/emails?select=message_id`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    const existing = await supabaseCheck.json();
    const existingIds = new Set((existing || []).map(e => e.message_id).filter(Boolean));

    // 3. For any missing emails, fetch full body and insert
    let newInserts = [];
    for (const item of receivedList) {
      if (!existingIds.has(item.id)) {
        try {
          const detailRes = await fetch(`https://api.resend.com/emails/receiving/${item.id}`, {
            headers: { 'Authorization': `Bearer ${resendApiKey}` }
          });
          const fullEmail = detailRes.ok ? await detailRes.json() : item;

          const fromRaw = fullEmail.from || '';
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

          const toAddresses = Array.isArray(fullEmail.to) ? fullEmail.to.join(', ') : (fullEmail.to || '');
          const bodyHtml = fullEmail.html || '';
          const bodyText = fullEmail.text || '';
          const rawSnippet = bodyText || bodyHtml.replace(/<[^>]*>/g, ' ');
          const snippet = rawSnippet.replace(/\s+/g, ' ').trim().slice(0, 160);

          newInserts.push({
            message_id: item.id,
            from_address: fromAddress,
            from_name: fromName || fromAddress,
            to_address: toAddresses,
            subject: fullEmail.subject || '(no subject)',
            snippet: snippet,
            body_html: bodyHtml || `<pre style="font-family: inherit; white-space: pre-wrap;">${bodyText}</pre>`,
            body_text: bodyText,
            folder: 'inbox',
            is_read: false,
            is_starred: false,
            has_attachment: Boolean(fullEmail.attachments && fullEmail.attachments.length > 0),
            attachments: fullEmail.attachments || [],
            labels: ['Inbox'],
            created_at: fullEmail.created_at || new Date().toISOString()
          });
        } catch (itemErr) {
          console.warn('Error processing received email item:', itemErr);
        }
      }
    }

    if (newInserts.length > 0) {
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/emails`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newInserts)
      });
      const inserted = await insertRes.json();
      return res.status(200).json({ success: true, count: newInserts.length, inserted });
    }

    return res.status(200).json({ success: true, count: 0, message: 'All emails are already up to date.' });
  } catch (err) {
    console.error('Sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
