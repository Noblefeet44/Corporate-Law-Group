// ==============================================================================
// Vercel Serverless Function: Send Outbound Email via Resend
// URL on Vercel: https://<your-domain>/api/send-email
// ==============================================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY environment variable is not configured in Vercel.');
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured in Vercel environment variables.' });
  }

  try {
    const { from, to, subject, html, text, cc, bcc, reply_to } = req.body || {};

    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: to or subject' });
    }

    const payload = {
      from: from || 'Corporate Law Group <inquiries@mail.corporatelawgroup.org>',
      to: Array.isArray(to) ? to : to.split(',').map(s => s.trim()),
      subject: subject,
      html: html || (text ? `<p>${text}</p>` : '<p>(empty message)</p>'),
      text: text || undefined
    };

    if (cc) {
      payload.cc = Array.isArray(cc) ? cc : cc.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (bcc) {
      payload.bcc = Array.isArray(bcc) ? bcc : bcc.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (reply_to) {
      payload.reply_to = reply_to;
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', data);
      return res.status(resendResponse.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Send email error:', error);
    return res.status(500).json({ error: error.message });
  }
}
