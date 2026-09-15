/**
 * EmailService: Manages Supabase DB connection, Realtime subscriptions,
 * Resend.dev API sending, and storage for Corporate Law Group Webmail.
 */

// Starting clean with no hardcoded sample messages
const INITIAL_EMAILS = [];

class EmailService {
  constructor() {
    this.storageKey = 'clg_webmail_data_v2'; // New key so old sample data is cleared
    this.configKey = 'clg_webmail_config_v2';
    this.supabase = null;
    this.realtimeChannel = null;
    this.onNewEmailCallback = null;

    this.loadConfig();
    this.initLocalStorage();
    this.initSupabaseIfConfigured();
  }

  loadConfig() {
    const saved = localStorage.getItem(this.configKey);
    const defaults = this.getDefaultConfig();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean out any old sample Alex Jame references from previous tests
        if (parsed.senderEmail && parsed.senderEmail.toLowerCase().includes('alex@')) {
          parsed.senderEmail = defaults.senderEmail;
          parsed.senderName = defaults.senderName;
        }
        if (parsed.senderName && parsed.senderName.toLowerCase().includes('alex')) {
          parsed.senderName = defaults.senderName;
        }
        if (Array.isArray(parsed.senders)) {
          parsed.senders = parsed.senders.filter(s => !s.email.toLowerCase().includes('alex@'));
        }
        // Ensure credentials and domain are up to date if previously unset or old
        if (!parsed.supabaseUrl || parsed.supabaseUrl.trim() === '') {
          parsed.supabaseUrl = defaults.supabaseUrl;
        }
        if (!parsed.supabaseKey || parsed.supabaseKey.trim() === '') {
          parsed.supabaseKey = defaults.supabaseKey;
        }
        if (!parsed.domain || (parsed.domain.includes('corporatelawgroup.org') && !parsed.domain.includes('mail.'))) {
          parsed.domain = defaults.domain;
        }
        if (!parsed.senders || parsed.senders.length === 0) {
          parsed.senders = defaults.senders;
        }
        this.config = { ...defaults, ...parsed };
        localStorage.setItem(this.configKey, JSON.stringify(this.config));
      } catch (e) {
        this.config = defaults;
      }
    } else {
      this.config = defaults;
    }
  }

  getDefaultConfig() {
    return {
      supabaseUrl: 'https://xsnfafxcbdkyinytjhci.supabase.co',
      supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzbmZhZnhjYmRreWlueXRqaGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjIwOTgsImV4cCI6MjEwMzkzODA5OH0.7VgcsxW4LlbvoImnTCg7vX27jBCwcJO5VVTeh9ea3jw',
      supabaseTable: 'emails',
      domain: 'mail.corporatelawgroup.org',
      resendApiKey: '',
      senderEmail: 'inquiries@mail.corporatelawgroup.org',
      senderName: 'Corporate Law Group Inquiries',
      notificationEmail: 'inquiries@mail.corporatelawgroup.org',
      isSupabaseConnected: false,
      senders: [
        { name: 'Corporate Law Group Inquiries', email: 'inquiries@mail.corporatelawgroup.org', isDefault: true },
        { name: 'Corporate Law Group Support', email: 'support@mail.corporatelawgroup.org', isDefault: false }
      ]
    };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(this.configKey, JSON.stringify(this.config));
    return this.initSupabaseIfConfigured();
  }

  initLocalStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify(INITIAL_EMAILS));
    }
  }

  getLocalEmails() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  setLocalEmails(emails) {
    localStorage.setItem(this.storageKey, JSON.stringify(emails));
  }

  async initSupabaseIfConfigured() {
    if (this.config.supabaseUrl && this.config.supabaseKey && window.supabase) {
      try {
        this.supabase = window.supabase.createClient(this.config.supabaseUrl, this.config.supabaseKey);
        
        // Test lightweight query
        const { data, error } = await this.supabase
          .from(this.config.supabaseTable || 'emails')
          .select('id')
          .limit(1);

        if (!error) {
          this.config.isSupabaseConnected = true;
          this.setupRealtimeSubscription();
          console.log('[EmailService] Connected to Supabase successfully!');
          return { success: true, message: 'Connected to Supabase database!' };
        } else {
          console.warn('[EmailService] Supabase query returned error:', error);
          this.config.isSupabaseConnected = false;
          return { success: false, message: error.message };
        }
      } catch (err) {
        console.warn('[EmailService] Supabase initialization failed:', err);
        this.config.isSupabaseConnected = false;
        return { success: false, message: err.message };
      }
    } else {
      this.config.isSupabaseConnected = false;
      return { success: false, message: 'Credentials not configured (operating in local store mode)' };
    }
  }

  setupRealtimeSubscription() {
    if (!this.supabase) return;
    try {
      if (this.realtimeChannel) {
        this.supabase.removeChannel(this.realtimeChannel);
      }
      
      const tableName = this.config.supabaseTable || 'emails';
      this.realtimeChannel = this.supabase
        .channel('public:' + tableName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: tableName },
          (payload) => {
            console.log('[Realtime] New inbound email received:', payload.new);
            
            // Sync to local memory list
            const local = this.getLocalEmails();
            local.unshift(payload.new);
            this.setLocalEmails(local);

            if (this.onNewEmailCallback) {
              this.onNewEmailCallback(payload.new);
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[Realtime] Subscription error:', e);
    }
  }

  setNewEmailListener(callback) {
    this.onNewEmailCallback = callback;
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
  }

  // Fetch emails with filters
  async fetchEmails({ folder = 'inbox', search = '', label = '', unreadOnly = false, hasAttachment = false } = {}) {
    let list = [];

    if (this.supabase && this.config.isSupabaseConnected) {
      try {
        const tableName = this.config.supabaseTable || 'emails';
        let query = this.supabase.from(tableName).select('*').order('created_at', { ascending: false });

        if (folder === 'starred') {
          query = query.eq('is_starred', true);
        } else if (folder === 'all') {
          // fetch all
        } else if (folder) {
          query = query.eq('folder', folder);
        }

        const { data, error } = await query;
        if (!error && data) {
          list = data;
          this.setLocalEmails(data); // Sync local copy
        } else {
          list = this.getLocalEmails();
        }
      } catch (err) {
        list = this.getLocalEmails();
      }
    } else {
      list = this.getLocalEmails();
    }

    // Apply filters
    if (folder === 'starred') {
      list = list.filter(e => e.is_starred);
    } else if (folder && folder !== 'all') {
      list = list.filter(e => (e.folder || 'inbox').toLowerCase() === folder.toLowerCase());
    }

    if (label) {
      list = list.filter(e => {
        if (Array.isArray(e.labels)) {
          return e.labels.some(l => l.toLowerCase().includes(label.toLowerCase()));
        }
        return false;
      });
    }

    if (unreadOnly) {
      list = list.filter(e => !e.is_read);
    }

    if (hasAttachment) {
      list = list.filter(e => e.has_attachment);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(e => 
        (e.subject && e.subject.toLowerCase().includes(q)) ||
        (e.snippet && e.snippet.toLowerCase().includes(q)) ||
        (e.from_address && e.from_address.toLowerCase().includes(q)) ||
        (e.from_name && e.from_name.toLowerCase().includes(q)) ||
        (e.to_address && e.to_address.toLowerCase().includes(q))
      );
    }

    return list.map(e => ({
      ...e,
      display_date: e.display_date || this.formatDate(e.created_at)
    }));
  }

  // Live counts for badges
  async getCounts() {
    const emails = this.getLocalEmails();
    const inboxUnread = emails.filter(e => (e.folder || 'inbox') === 'inbox' && !e.is_read).length;
    const draftsCount = emails.filter(e => e.folder === 'drafts').length;
    const sentCount = emails.filter(e => e.folder === 'sent').length;

    return {
      inbox: inboxUnread,
      drafts: draftsCount,
      sent: sentCount
    };
  }

  async toggleStar(id) {
    const list = this.getLocalEmails();
    const item = list.find(e => e.id === id);
    if (item) {
      item.is_starred = !item.is_starred;
      this.setLocalEmails(list);
    }

    if (this.supabase && this.config.isSupabaseConnected && item) {
      try {
        await this.supabase
          .from(this.config.supabaseTable || 'emails')
          .update({ is_starred: item.is_starred })
          .eq('id', id);
      } catch (e) {
        console.warn('Error updating star in Supabase:', e);
      }
    }
    return item ? item.is_starred : false;
  }

  async setReadState(id, isRead) {
    const list = this.getLocalEmails();
    const item = list.find(e => e.id === id);
    if (item) {
      item.is_read = isRead;
      this.setLocalEmails(list);
    }

    if (this.supabase && this.config.isSupabaseConnected) {
      try {
        await this.supabase
          .from(this.config.supabaseTable || 'emails')
          .update({ is_read: isRead })
          .eq('id', id);
      } catch (e) {
        console.warn('Error updating read status in Supabase:', e);
      }
    }
  }

  async deleteEmail(id) {
    const list = this.getLocalEmails();
    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) {
      list[idx].folder = 'trash';
      this.setLocalEmails(list);
    }

    if (this.supabase && this.config.isSupabaseConnected) {
      try {
        await this.supabase
          .from(this.config.supabaseTable || 'emails')
          .update({ folder: 'trash' })
          .eq('id', id);
      } catch (e) {
        console.warn('Error moving to trash in Supabase:', e);
      }
    }
  }

  // Senders / Mailbox Profile Management
  async getSenders() {
    let senders = this.config.senders || [];
    if (this.supabase && this.config.isSupabaseConnected) {
      try {
        const { data, error } = await this.supabase
          .from('email_senders')
          .select('*')
          .order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          senders = data.map(d => ({
            name: d.display_name,
            email: d.email_address,
            isDefault: d.is_default
          }));
          this.config.senders = senders;
          localStorage.setItem(this.configKey, JSON.stringify(this.config));
        }
      } catch (e) {
        console.warn('Could not fetch senders from Supabase:', e);
      }
    }
    return senders;
  }

  async saveSender({ name, email, isDefault = false }) {
    let cleanEmail = (email || '').trim();
    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@${this.config.domain || 'mail.corporatelawgroup.org'}`;
    }
    const cleanName = (name || cleanEmail.split('@')[0]).trim();
    const newSender = { name: cleanName, email: cleanEmail, isDefault };

    const current = this.config.senders || [];
    const exists = current.find(s => s.email.toLowerCase() === cleanEmail.toLowerCase());
    if (exists) {
      exists.name = cleanName;
      if (isDefault) {
        current.forEach(s => s.isDefault = false);
        exists.isDefault = true;
      }
    } else {
      if (isDefault) {
        current.forEach(s => s.isDefault = false);
      }
      current.push(newSender);
    }
    this.config.senders = current;
    localStorage.setItem(this.configKey, JSON.stringify(this.config));

    // Save to Supabase if connected
    if (this.supabase && this.config.isSupabaseConnected) {
      try {
        await this.supabase.from('email_senders').upsert([{
          display_name: cleanName,
          email_address: cleanEmail,
          is_default: isDefault
        }], { onConflict: 'email_address' });
      } catch (e) {
        console.warn('Error saving sender to Supabase:', e);
      }
    }
    return newSender;
  }

  // Send Email (Resend.dev API + Supabase sync)
  async sendEmail({ fromName, fromEmail, to, cc, bcc, subject, bodyHtml, bodyText }) {
    let finalEmail = (fromEmail || this.config.senderEmail || 'inquiries@mail.corporatelawgroup.org').trim();
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail}@${this.config.domain || 'mail.corporatelawgroup.org'}`;
    }
    let finalName = (fromName || this.config.senderName || '').trim();
    if (!finalName) {
      const prefix = finalEmail.split('@')[0];
      finalName = prefix ? (prefix.charAt(0).toUpperCase() + prefix.slice(1)) : 'Corporate Law Group';
    }

    const newEmail = {
      id: 'sent-' + Date.now(),
      from_address: finalEmail,
      from_name: finalName,
      to_address: to,
      cc: cc || '',
      bcc: bcc || '',
      subject: subject || '(no subject)',
      snippet: (bodyText || bodyHtml.replace(/<[^>]*>/g, ' ')).slice(0, 140),
      body_html: bodyHtml || `<p>${bodyText}</p>`,
      body_text: bodyText || '',
      folder: 'sent',
      is_read: true,
      is_starred: false,
      has_attachment: false,
      labels: ['Sent'],
      created_at: new Date().toISOString(),
      display_date: 'Just now'
    };

    let resendResult = null;
    if (this.config.resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${finalName} <${finalEmail}>`,
            to: to.split(',').map(s => s.trim()),
            subject: subject || '(no subject)',
            html: bodyHtml || bodyText,
            text: bodyText || undefined
          })
        });

        resendResult = await response.json();
        if (response.ok) {
          newEmail.message_id = resendResult.id;
        }
      } catch (err) {
        console.warn('[Resend API] Fetch error:', err);
      }
    }

    // Persist locally
    const list = this.getLocalEmails();
    list.unshift(newEmail);
    this.setLocalEmails(list);

    // Persist to Supabase if connected
    if (this.supabase && this.config.isSupabaseConnected) {
      try {
        await this.supabase.from(this.config.supabaseTable || 'emails').insert([{
          message_id: newEmail.message_id,
          from_address: newEmail.from_address,
          from_name: newEmail.from_name,
          to_address: newEmail.to_address,
          subject: newEmail.subject,
          snippet: newEmail.snippet,
          body_html: newEmail.body_html,
          body_text: newEmail.body_text,
          folder: 'sent',
          is_read: true,
          is_starred: false,
          labels: ['Sent']
        }]);
      } catch (e) {
        console.warn('Error saving sent email to Supabase:', e);
      }
    }

    return { success: true, email: newEmail, resend: resendResult };
  }

  // Send Consultation Request Notification Email (Webmail inbox sync + real email dispatch)
  async sendConsultationNotification(data) {
    const refNum = data.refNum || ('CLG-' + Math.floor(100000 + Math.random() * 900000));
    const clientName = data.name || 'Prospective Client';
    const clientEmail = data.email || 'unknown@example.com';
    const clientPhone = data.phone || 'N/A';
    const clientCompany = data.company || 'Not Specified';
    const practiceArea = data.practiceArea || 'General Corporate Counsel';
    const matterDesc = data.matterDesc || 'No matter description provided.';
    const urgency = data.urgency || 'Standard / Within 1-2 weeks';
    const mode = data.mode || 'Video Conference / In-Person';
    const source = data.source || 'Website Intake Form';
    const targetEmail = this.config.notificationEmail || 'inquiries@mail.corporatelawgroup.org';
    const submissionDate = new Date().toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const subject = `[New Consultation Request] ${practiceArea} - ${clientName} (${refNum})`;

    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: #0b1528; padding: 24px 28px; border-bottom: 3px solid #c2a176;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 19px; font-weight: 700; letter-spacing: 0.5px;">CORPORATE LAW GROUP</h2>
            <span style="background: rgba(194, 161, 118, 0.2); color: #c2a176; padding: 4px 10px; border-radius: 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">New Legal Intake</span>
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0;">Confidential Consultation Booking Notification</p>
        </div>

        <div style="padding: 24px 28px;">
          <div style="background: #f8fafc; border-left: 4px solid #c2a176; padding: 12px 16px; margin-bottom: 22px; border-radius: 0 6px 6px 0;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">Reference Matter ID</div>
            <div style="font-size: 18px; font-weight: 800; color: #0b1528; margin-top: 2px;">${refNum}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Received: ${submissionDate}</div>
          </div>

          <h3 style="color: #0b1528; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Client Profile</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13.5px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;">Full Name:</td>
              <td style="padding: 6px 0; color: #0b1528; font-weight: 600;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Organization / Entity:</td>
              <td style="padding: 6px 0; color: #0b1528;">${clientCompany}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Email Address:</td>
              <td style="padding: 6px 0;"><a href="mailto:${clientEmail}" style="color: #0b57d0; text-decoration: none; font-weight: 500;">${clientEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Phone:</td>
              <td style="padding: 6px 0;"><a href="tel:${clientPhone}" style="color: #0b1528; text-decoration: none; font-weight: 500;">${clientPhone}</a></td>
            </tr>
          </table>

          <h3 style="color: #0b1528; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Consultation Parameters</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13.5px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;">Practice Area:</td>
              <td style="padding: 6px 0; color: #0b1528; font-weight: 600;"><span style="background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 4px;">${practiceArea}</span></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Urgency / Timeline:</td>
              <td style="padding: 6px 0; color: #b91c1c; font-weight: 600;">${urgency}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Preferred Mode:</td>
              <td style="padding: 6px 0; color: #0b1528;">${mode}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Intake Channel:</td>
              <td style="padding: 6px 0; color: #64748b;">${source}</td>
            </tr>
          </table>

          <h3 style="color: #0b1528; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Matter Context &amp; Objectives</h3>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; font-size: 13.5px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${matterDesc}</div>

          <div style="margin-top: 26px; padding-top: 18px; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="mailto:${clientEmail}?subject=RE: Legal Consultation - ${refNum} (${practiceArea})" style="background: #0b1528; color: #ffffff; padding: 9px 18px; border-radius: 5px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">Reply to Client</a>
            <a href="tel:${clientPhone}" style="background: #f1f5f9; color: #0b1528; padding: 9px 18px; border-radius: 5px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block; border: 1px solid #cbd5e1;">Call (${clientPhone})</a>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 14px 28px; text-align: center; font-size: 11.5px; color: #64748b; border-top: 1px solid #e2e8f0;">
          CONFIDENTIAL INTAKE NOTICE &bull; Corporate Law Group Practice Management &bull; Ref: ${refNum}
        </div>
      </div>
    `;

    const bodyText = `
NEW LEGAL CONSULTATION REQUEST (${refNum})
=========================================
Reference ID: ${refNum}
Practice Area: ${practiceArea}
Urgency: ${urgency}
Preferred Mode: ${mode}
Intake Channel: ${source}
Date: ${submissionDate}

CLIENT INFORMATION:
- Name: ${clientName}
- Company: ${clientCompany}
- Email: ${clientEmail}
- Phone: ${clientPhone}

MATTER SUMMARY:
${matterDesc}
=========================================
`;

    const snippet = `New consultation request from ${clientName} (${clientCompany}) for ${practiceArea}. Ref: ${refNum}`;

    // 1. Create Inbound Email Record for Webmail Inbox
    const newInbound = {
      id: 'inbound-' + Date.now(),
      message_id: 'clg-ref-' + refNum,
      from_address: clientEmail,
      from_name: `${clientName}${clientCompany && clientCompany !== 'N/A' && clientCompany !== 'Not Specified' ? ' (' + clientCompany + ')' : ''}`,
      to_address: targetEmail,
      subject: subject,
      snippet: snippet.slice(0, 160),
      body_html: bodyHtml,
      body_text: bodyText,
      folder: 'inbox',
      is_read: false,
      is_starred: true,
      has_attachment: false,
      labels: ['Inbox', 'Client Matters', 'Corporate Inquiries'],
      created_at: new Date().toISOString(),
      display_date: 'Just now'
    };

    // Store in Webmail localStorage
    const localList = this.getLocalEmails();
    localList.unshift(newInbound);
    this.setLocalEmails(localList);

    // Call Realtime listener if app is currently listening
    if (this.onNewEmailCallback) {
      try {
        this.onNewEmailCallback(newInbound);
      } catch (e) {
        console.warn('Realtime callback error:', e);
      }
    }

    // Persist to Supabase if connected
    let supabaseResult = null;
    if (this.supabase && this.config.isSupabaseConnected) {
      try {
        const { data: sbData, error: sbErr } = await this.supabase
          .from(this.config.supabaseTable || 'emails')
          .insert([{
            message_id: newInbound.message_id,
            from_address: newInbound.from_address,
            from_name: newInbound.from_name,
            to_address: newInbound.to_address,
            subject: newInbound.subject,
            snippet: newInbound.snippet,
            body_html: newInbound.body_html,
            body_text: newInbound.body_text,
            folder: 'inbox',
            is_read: false,
            is_starred: true,
            has_attachment: false,
            labels: ['Inbox', 'Client Matters', 'Corporate Inquiries'],
            created_at: newInbound.created_at
          }])
          .select();
        supabaseResult = { data: sbData, error: sbErr };
      } catch (err) {
        console.warn('[EmailService] Supabase insert error for consultation:', err);
      }
    }

    // 2. Outbound Email Delivery (Resend API if configured)
    let resendResult = null;
    if (this.config.resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${this.config.senderName} <${this.config.senderEmail}>`,
            to: [targetEmail],
            reply_to: clientEmail,
            subject: subject,
            html: bodyHtml,
            text: bodyText
          })
        });
        resendResult = await res.json();
      } catch (err) {
        // Resend direct API calls from browsers are subject to CORS restrictions
        console.warn('[EmailService] Resend delivery notice (browser CORS policy may require routing through a backend or Supabase Edge Function):', err);
      }
    }

    return {
      success: true,
      refNum,
      inboundEmail: newInbound,
      supabase: supabaseResult,
      resend: resendResult,
      targetEmail
    };
  }

  // Clear local storage
  clearLocalEmails() {
    localStorage.setItem(this.storageKey, JSON.stringify([]));
    return [];
  }
}

window.emailService = new EmailService();
