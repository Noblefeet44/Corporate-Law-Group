// ==============================================================================
// Vercel Serverless Function: Send Outbound Email via Resend with Branded Template
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

    // Extract sender name and email
    const fromRaw = from || 'Corporate Law Group <inquiries@mail.corporatelawgroup.org>';
    let fromName = 'Corporate Law Group';
    let fromEmail = 'inquiries@mail.corporatelawgroup.org';
    const nameMatch = fromRaw.match(/^(.*?)\s*<(.+?)>$/);
    if (nameMatch) {
      fromName = nameMatch[1].replace(/["']/g, '').trim();
      fromEmail = nameMatch[2].trim();
    } else {
      fromEmail = fromRaw.trim();
      fromName = fromEmail.split('@')[0];
    }

    const rawMessageHtml = html || (text ? `<p style="white-space: pre-wrap;">${escapeHtml(text)}</p>` : '<p>(empty message)</p>');
    
    // Wrap with executive Corporate Law Group branded layout and partner signature if not already wrapped
    const finalHtml = rawMessageHtml.includes('<!-- CLG-BRANDED-TEMPLATE -->')
      ? rawMessageHtml
      : wrapWithBrandedTemplate({ content: rawMessageHtml, fromName, fromEmail, subject });

    const payload = {
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(to) ? to : to.split(',').map(s => s.trim()),
      subject: subject,
      html: finalHtml,
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapWithBrandedTemplate({ content, fromName, fromEmail, subject }) {
  const lower = (fromEmail || '').toLowerCase();

  // Signature customization according to attorney office / practice
  let attorney = {
    name: fromName || 'Corporate Law Group Counsel',
    title: 'Legal Counsel',
    practice: 'Corporate & Business Law • Banking & Finance • Tax Law',
    education: 'Juris Doctor | Corporate Law Group Practice',
    avatar: 'https://corporatelawgroup.org/assets/logo.png',
    phone: '+1 (800) 592-2529',
    office: '1000 Louisiana Street, Suite 4800, Houston, TX 77002'
  };

  if (lower.includes('johnathan') || lower.includes('vance')) {
    attorney = {
      name: 'Johnathan Vance',
      title: 'Managing Partner',
      practice: 'Corporate & Business Law • Banking & Finance • Tax',
      education: 'J.D., Columbia Law School | 26+ Years BigLaw & Boutique',
      avatar: 'https://corporatelawgroup.org/assets/johnathan-vance.jpg',
      phone: '+1 (800) 592-2529',
      office: '1000 Louisiana Street, Suite 4800, Houston, TX 77002'
    };
  } else if (lower.includes('eleanor') || lower.includes('sterling')) {
    attorney = {
      name: 'Eleanor Sterling',
      title: 'Partner & Head of Banking & Finance',
      practice: 'Commercial Lending • Credit Facilities • FinTech',
      education: 'J.D., Harvard Law School | 18+ Years Experience',
      avatar: 'https://corporatelawgroup.org/assets/eleanor-sterling.jpg',
      phone: '+1 (800) 592-2529',
      office: '1000 Louisiana Street, Suite 4800, Houston, TX 77002'
    };
  } else if (lower.includes('marcus') || lower.includes('chen')) {
    attorney = {
      name: 'Marcus Chen',
      title: 'Partner & Head of Tax Practice',
      practice: 'Corporate Taxation • M&A Tax Strategy • IRS Disputes',
      education: 'LL.M. in Taxation, NYU School of Law | 19+ Years Advisory',
      avatar: 'https://corporatelawgroup.org/assets/marcus-chen.jpg',
      phone: '+1 (800) 592-2529',
      office: '1000 Louisiana Street, Suite 4800, Houston, TX 77002'
    };
  } else if (lower.includes('sofia') || lower.includes('ramirez')) {
    attorney = {
      name: 'Sofia Ramirez',
      title: 'Senior Counsel',
      practice: 'Startup Formation • Corporate Governance • Commercial Contracts',
      education: 'J.D., Stanford Law School | 12+ Years Corporate Practice',
      avatar: 'https://corporatelawgroup.org/assets/sofia-ramirez.jpg',
      phone: '+1 (800) 592-2529',
      office: '1000 Louisiana Street, Suite 4800, Houston, TX 77002'
    };
  } else if (lower.includes('support')) {
    attorney = {
      name: 'Corporate Law Group Support',
      title: 'Legal Operations & Client Billing',
      practice: 'Client Services & Practice Administration',
      education: 'Corporate Operations Management',
      avatar: 'https://corporatelawgroup.org/assets/logo.png',
      phone: '+1 (800) 592-2529',
      office: '1000 Louisiana Street, Suite 4800, Houston, TX 77002'
    };
  } else if (lower.includes('inquiries')) {
    attorney = {
      name: 'Corporate Law Group Inquiries',
      title: 'General Legal Intake & Advisory Panel',
      practice: 'Corporate Law & Commercial Intake',
      education: 'Legal Intake Board',
      avatar: 'https://corporatelawgroup.org/assets/logo.png',
      phone: '+1 (800) 592-2529',
      office: '1000 Louisiana Street, Suite 4800, Houston, TX 77002'
    };
  }

  return `<!-- CLG-BRANDED-TEMPLATE -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject || 'Corporate Law Group Communication')}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 28px 12px;">
    <tr>
      <td align="center">
        <!-- Main Executive Card Container -->
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Executive Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0a192f 0%, #0d274d 100%); padding: 26px 32px; border-bottom: 3px solid #c2a176;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 19px; font-weight: 800; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; font-family: 'Open Sans', Arial, sans-serif;">
                      CORPORATE LAW GROUP
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #c2a176; letter-spacing: 0.8px; margin-top: 4px; text-transform: uppercase;">
                      Houston &bull; Dallas &bull; Austin &bull; Nationwide Practice
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: rgba(194,161,118,0.18); color: #c2a176; border: 1px solid rgba(194,161,118,0.4); font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 5px 11px; border-radius: 4px; letter-spacing: 0.6px;">
                      Privileged &amp; Confidential
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Body Content -->
          <tr>
            <td style="padding: 34px 32px 28px; font-size: 15px; line-height: 1.7; color: #1e293b;">
              ${content}
            </td>
          </tr>

          <!-- Executive Attorney Signature Block -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
                <tr>
                  <td width="72" valign="top" style="padding-right: 18px;">
                    <img src="${attorney.avatar}" alt="${attorney.name}" width="68" height="68" style="width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2px solid #0b57d0; display: block;" />
                  </td>
                  <td valign="top" style="line-height: 1.45;">
                    <div style="font-size: 16px; font-weight: 800; color: #0a192f; margin-bottom: 2px;">
                      ${attorney.name}
                    </div>
                    <div style="font-size: 12.5px; font-weight: 700; color: #c2a176; margin-bottom: 4px;">
                      ${attorney.title}
                    </div>
                    <div style="font-size: 11.5px; color: #475569; margin-bottom: 4px;">
                      <strong>Practice:</strong> ${attorney.practice}
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
                      ${attorney.education}
                    </div>
                    <div style="font-size: 11px; color: #475569; line-height: 1.6;">
                      <strong>Corporate Law Group, PLLC</strong><br>
                      ${attorney.office}<br>
                      <strong>Tel:</strong> <a href="tel:+18005922529" style="color: #0b57d0; text-decoration: none;">${attorney.phone}</a> &bull; 
                      <strong>Direct:</strong> <a href="mailto:${fromEmail}" style="color: #0b57d0; text-decoration: none;">${fromEmail}</a> &bull; 
                      <a href="https://corporatelawgroup.org" style="color: #0b57d0; text-decoration: none;">corporatelawgroup.org</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Legal Disclaimer Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #e2e8f0; font-size: 10px; line-height: 1.55; color: #64748b; text-align: justify;">
              <strong>CONFIDENTIALITY NOTICE:</strong> This electronic transmission (including any attachments) contains legally privileged and confidential attorney-client communication or work product intended solely for the use of the individual or entity named as recipient. If you are not the intended recipient, please be aware that any review, disclosure, copying, distribution, or taking of any action in reliance on the contents of this communication is strictly prohibited. If you received this transmission in error, please immediately notify the sender by reply email and destroy all copies of the original message and attachments.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
