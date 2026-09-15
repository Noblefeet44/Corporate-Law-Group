# Corporate Law Group Webmail Panel (/email) with Resend.dev & Supabase
- **Domain**: `@mail.corporatelawgroup.org`
- **Default Sender Profiles**:
  - `Corporate Law Group Inquiries <inquiries@mail.corporatelawgroup.org>`
  - `Corporate Law Group Support <support@mail.corporatelawgroup.org>`
  - Custom sender names & aliases (e.g. `pecker@mail.corporatelawgroup.org`) customizable on the fly in `/email`
- **Supabase Project**: `https://xsnfafxcbdkyinytjhci.supabase.co`

---

## 🌟 Key Features

1. **Clean Google-Style Webmail Architecture**:
   - Rebranded with **Corporate Law Group** (CLG) identity.
   - Active identity badge in top navigation showing current sender profile.
   - Core folders: **Inbox**, **Starred**, **Sent**, **Drafts**, **Trash**.
   - Clean **Labels**: `Client Matters`, `Corporate Inquiries`, `Confidential`.
   - Google pill search bar with filter chips: `Any time`, `Has attachment`, `Is unread`, `Client Matters`.
   - Floating bottom-right **Compose modal** with **From** sender profile selector, allowing selection of `Inquiries`, `Support`, or entering any custom sender name and alias (e.g. `pecker@mail.corporatelawgroup.org`)!
   - Interactive **Reading Pane** with sender avatars, headers, and formatted HTML rendering.
   - Clean right-side utilities dock for court calendars, notes, and contacts.

2. **Realtime Inbound Sync with Supabase**:
   - Subscribes to Supabase Realtime channel (`supabase.channel('public:emails')`).
   - Any new incoming email inserted into Supabase appears in the inbox immediately without requiring a page refresh.

3. **Resend.dev Inbound Webhook Support**:
   - Includes a ready-to-deploy Supabase Edge Function (`resend_inbound_function.ts`) to receive and parse incoming emails from Resend.
   - Webhook endpoint: `https://xsnfafxcbdkyinytjhci.supabase.co/functions/v1/resend-inbound`

---

## 🚀 Quick Setup Guide

### Step 1: Run the Database Migration in Supabase

1. Open your Supabase SQL Editor: [https://supabase.com/dashboard/project/xsnfafxcbdkyinytjhci/sql](https://supabase.com/dashboard/project/xsnfafxcbdkyinytjhci/sql)
2. Click **New query**, paste the SQL script from `email/supabase_setup.sql`, and click **Run**.
3. This creates:
   - The `emails` table.
   - The `email_senders` table with default identities (`Inquiries`, `Support`, and custom aliases).
   - Performance indexes for search, folders, and read states.
   - Row Level Security (RLS) policies.
   - Realtime publication on both tables.

---

### Step 2: Configure Inbound Email Webhook in Resend.dev

To receive real incoming emails:

1. **Deploy the Supabase Edge Function**:
   In your terminal, navigate to your project and deploy:
   ```bash
   supabase functions deploy resend-inbound --no-verify-jwt
   ```
   Ensure you have set the Supabase environment variables:
   ```bash
   supabase secrets set SUPABASE_URL=https://your-project.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Add the Webhook in Resend**:
   - Log into your [Resend Dashboard](https://resend.com).
   - Navigate to **Webhooks** &rarr; **Add Webhook**.
   - Set the Endpoint URL to:
     ```
     https://<your-project-id>.supabase.co/functions/v1/resend-inbound
     ```
   - Check the event: **`email.received`** (or `email.delivered`).
   - Click **Create Webhook**.

3. All incoming emails sent to your domain in Resend will now be routed directly into your Supabase database and instantly appear in the webmail Inbox!

---

### Step 3: Connect Credentials in the Web App

1. Visit `/email` in your browser.
2. Click the **Settings Gear (`⚙`)** in the top right header (or click the status pill **"Demo Mode (Configure DB)"**).
3. Enter:
   - **Supabase Project URL** (from Project Settings &rarr; API)
   - **Supabase Anon Key** (from Project Settings &rarr; API)
   - **Resend.dev API Key** (from Resend &rarr; API Keys)
   - **Sender Display Email**
4. Click **Test Connection** to verify your setup, then click **Save & Connect**.
5. The status indicator will turn green: **🟢 Supabase Connected**.

---

## 📂 File Manifest

- `index.html`: The main Gmail webmail client application.
- `gmail.css`: Google Material 3 and Google Workspace styling.
- `gmail.js`: Interactive UI controller, folder switching, search, reading pane, and compose.
- `email-service.js`: Data service supporting Supabase Realtime, Resend API sending, and offline fallback store.
- `supabase_setup.sql`: Complete SQL schema, RLS policies, and seed data.
- `resend_inbound_function.ts`: Supabase Edge Function for Resend inbound email webhook processing.
