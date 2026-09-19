/**
 * Corporate Law Group Webmail Interface Controller
 * Provides the fast, intuitive Google Gmail desktop interface layout
 * for the project's inbox, with live Resend.dev & Supabase connectivity.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const state = {
    currentFolder: 'inbox', // Default clean project inbox
    currentLabel: '',
    searchQuery: '',
    selectedIds: new Set(),
    currentEmail: null,
    emails: [],
    chips: {
      hasAttachment: false,
      unreadOnly: false,
    }
  };

  // DOM Elements
  const emailListEl = document.getElementById('emailList');
  const emptyStateEl = document.getElementById('emptyState');
  const emailViewContainerEl = document.getElementById('emailViewContainer');
  const emailCanvasEl = document.getElementById('emailCanvas');
  const searchInput = document.getElementById('searchInput');
  const paginationRange = document.getElementById('paginationRange');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const bulkActionsStrip = document.getElementById('bulkActionsStrip');
  const defaultToolbarTools = document.getElementById('defaultToolbarTools');
  const refreshBtn = document.getElementById('refreshBtn');

  // Compose Elements
  const composeWindow = document.getElementById('composeWindow');
  const openComposeBtn = document.getElementById('openComposeBtn');
  const closeComposeBtn = document.getElementById('closeComposeBtn');
  const composeFromSelect = document.getElementById('composeFromSelect');
  const composeCustomFromRow = document.getElementById('composeCustomFromRow');
  const composeCustomFromName = document.getElementById('composeCustomFromName');
  const composeCustomFromUser = document.getElementById('composeCustomFromUser');
  const composeTo = document.getElementById('composeTo');
  const composeSubject = document.getElementById('composeSubject');
  const composeBody = document.getElementById('composeBody');
  const sendEmailBtn = document.getElementById('sendEmailBtn');
  const discardDraftBtn = document.getElementById('discardDraftBtn');

  // Header Identity Elements
  const headerSenderName = document.getElementById('headerSenderName');
  const headerSenderEmail = document.getElementById('headerSenderEmail');
  const headerAvatar = document.getElementById('headerAvatar');
  const identityBadge = document.getElementById('identityBadge');

  // Settings Modal Elements
  const settingsModal = document.getElementById('settingsModal');
  const settingsGearBtn = document.getElementById('settingsGearBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const copySqlBtn = document.getElementById('copySqlBtn');
  const clearEmailsBtn = document.getElementById('clearEmailsBtn');
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const statusDot = document.getElementById('statusDot');

  // Initial Data Load & Attorney Identity
  updateHeaderIdentity();
  await loadAndRender();
  updateBadgeCounts();
  updateStatusIndicator();

  // Background inbound sync from Resend on load
  if (window.emailService) {
    window.emailService.syncInboundEmails().then(count => {
      if (count > 0) {
        loadAndRender();
        updateBadgeCounts();
      }
    });
  }

  // Realtime Supabase incoming email subscriber
  if (window.emailService) {
    window.emailService.setNewEmailListener((newEmail) => {
      showToast(`New email received: ${newEmail.subject || '(no subject)'}`);
      loadAndRender();
      updateBadgeCounts();
    });
  }

  // ============================================================================
  // Core Data Loading & Rendering
  // ============================================================================
  async function loadAndRender() {
    state.selectedIds.clear();
    updateSelectionUI();

    const emails = await window.emailService.fetchEmails({
      folder: state.currentFolder,
      label: state.currentLabel,
      search: state.searchQuery,
      unreadOnly: state.chips.unreadOnly,
      hasAttachment: state.chips.hasAttachment
    });

    state.emails = emails;
    renderEmailList(emails);
  }

  function renderEmailList(emails) {
    if (!emails || emails.length === 0) {
      emailListEl.innerHTML = '';
      emptyStateEl.classList.add('visible');
      paginationRange.textContent = '0 of 0';
      return;
    }

    emptyStateEl.classList.remove('visible');
    paginationRange.textContent = `1–${emails.length} of ${emails.length}`;

    emailListEl.innerHTML = emails.map(email => {
      const isUnread = !email.is_read;
      const isChecked = state.selectedIds.has(email.id);
      const isStarred = email.is_starred;
      
      // Sender or Recipient display
      let displayParty = email.from_name || email.from_address;
      if (email.folder === 'sent' || state.currentFolder === 'sent') {
        displayParty = email.to_address.startsWith('To:') ? email.to_address : `To: ${email.to_address}`;
      }

      // Labels Pills
      let labelPillsHtml = '';
      if (Array.isArray(email.labels) && email.labels.length > 0) {
        labelPillsHtml = email.labels.map(l => `<span class="row-label-pill">${escapeHtml(l)}</span>`).join('');
      }

      return `
        <div class="email-row ${isUnread ? 'unread' : 'read'} ${isChecked ? 'selected' : ''}" data-id="${email.id}">
          <div class="row-lead-actions" onclick="event.stopPropagation()">
            <div class="checkbox-custom ${isChecked ? 'checked' : ''}" data-action="toggle-check" data-id="${email.id}"></div>
            <button class="row-star-btn ${isStarred ? 'starred' : ''}" data-action="toggle-star" data-id="${email.id}" title="Star message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${isStarred ? '#c2a176' : 'none'}" stroke="${isStarred ? '#c2a176' : 'currentColor'}" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
          </div>

          <div class="row-sender" title="${escapeHtml(displayParty)}">
            ${escapeHtml(displayParty)}
          </div>

          <div class="row-body-preview">
            ${labelPillsHtml}
            <span class="row-subject">${escapeHtml(email.subject || '(no subject)')}</span>
            <span class="row-snippet">- ${escapeHtml(email.snippet || '')}</span>
          </div>

          <div class="row-trail-actions">
            <span class="row-date">${email.display_date || 'Today'}</span>
            <div class="row-hover-tools" onclick="event.stopPropagation()">
              <button class="icon-btn" title="Delete" data-action="delete" data-id="${email.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
              <button class="icon-btn" title="${isUnread ? 'Mark as read' : 'Mark as unread'}" data-action="toggle-read" data-id="${email.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Row Click Handler (Opens Reading View)
    emailListEl.querySelectorAll('.email-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.id;
        const email = state.emails.find(item => item.id === id);
        if (email) {
          openEmailDetail(email);
        }
      });
    });

    // Row Quick Actions
    emailListEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'toggle-check') {
          if (state.selectedIds.has(id)) {
            state.selectedIds.delete(id);
          } else {
            state.selectedIds.add(id);
          }
          updateSelectionUI();
        } else if (action === 'toggle-star') {
          const isStarred = await window.emailService.toggleStar(id);
          const email = state.emails.find(e => e.id === id);
          if (email) email.is_starred = isStarred;
          renderEmailList(state.emails);
        } else if (action === 'delete') {
          await window.emailService.deleteEmail(id);
          showToast('Email moved to Trash.');
          await loadAndRender();
          updateBadgeCounts();
        } else if (action === 'toggle-read') {
          const email = state.emails.find(e => e.id === id);
          if (email) {
            const nextState = !email.is_read;
            await window.emailService.setReadState(id, nextState);
            email.is_read = nextState;
            renderEmailList(state.emails);
            updateBadgeCounts();
          }
        }
      });
    });
  }

  // ============================================================================
  // Reading View (Email Detail)
  // ============================================================================
  function openEmailDetail(email) {
    state.currentEmail = email;
    window.emailService.setReadState(email.id, true);
    email.is_read = true;
    updateBadgeCounts();

    emailCanvasEl.style.display = 'none';
    emailViewContainerEl.classList.add('visible');

    const viewSubject = document.getElementById('viewSubject');
    const viewSenderAvatar = document.getElementById('viewSenderAvatar');
    const viewSenderName = document.getElementById('viewSenderName');
    const viewSenderEmail = document.getElementById('viewSenderEmail');
    const viewDate = document.getElementById('viewDate');
    const viewBody = document.getElementById('viewBody');

    viewSubject.textContent = email.subject || '(no subject)';
    viewSenderName.textContent = email.from_name || email.from_address;
    viewSenderEmail.textContent = `<${email.from_address}>`;
    viewDate.textContent = email.display_date || new Date().toLocaleString();
    
    const partnerAvatar = window.emailService.getAvatarForEmail(email.from_address);
    if (partnerAvatar) {
      viewSenderAvatar.innerHTML = `<img src="${partnerAvatar}" alt="${email.from_name || ''}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
      viewSenderAvatar.textContent = (email.from_name || email.from_address || 'C')[0].toUpperCase();
    }
    
    viewBody.innerHTML = email.body_html ? sanitizeHtml(email.body_html) : `<p>${escapeHtml(email.body_text)}</p>`;
  }

  function closeEmailDetail() {
    state.currentEmail = null;
    emailViewContainerEl.classList.remove('visible');
    emailCanvasEl.style.display = 'flex';
    renderEmailList(state.emails);
  }

  document.getElementById('backToListBtn').addEventListener('click', closeEmailDetail);
  
  document.getElementById('viewDeleteBtn').addEventListener('click', async () => {
    if (state.currentEmail) {
      await window.emailService.deleteEmail(state.currentEmail.id);
      showToast('Email deleted.');
      closeEmailDetail();
      await loadAndRender();
      updateBadgeCounts();
    }
  });

  document.getElementById('viewMarkUnreadBtn').addEventListener('click', async () => {
    if (state.currentEmail) {
      await window.emailService.setReadState(state.currentEmail.id, false);
      showToast('Marked as unread.');
      closeEmailDetail();
      await loadAndRender();
      updateBadgeCounts();
    }
  });

  document.getElementById('replyBtn').addEventListener('click', () => {
    if (state.currentEmail) {
      openComposeModal({
        to: state.currentEmail.from_address,
        subject: `Re: ${state.currentEmail.subject.replace(/^Re:\s*/i, '')}`
      });
    }
  });

  document.getElementById('forwardBtn').addEventListener('click', () => {
    if (state.currentEmail) {
      openComposeModal({
        to: '',
        subject: `Fwd: ${state.currentEmail.subject.replace(/^Fwd:\s*/i, '')}`,
        body: `\n\n---------- Forwarded message ---------\nFrom: ${state.currentEmail.from_name} <${state.currentEmail.from_address}>\nSubject: ${state.currentEmail.subject}\n\n${state.currentEmail.body_text || ''}`
      });
    }
  });

  // ============================================================================
  // Navigation & Folders
  // ============================================================================
  document.querySelectorAll('.nav-folder-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-folder-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const folder = item.dataset.folder;
      state.currentFolder = folder;
      state.currentLabel = '';
      closeEmailDetail();
      loadAndRender();
    });
  });

  // Labels Navigation
  document.querySelectorAll('.tree-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-folder-item').forEach(i => i.classList.remove('active'));
      const label = item.dataset.label;
      state.currentFolder = 'all';
      state.currentLabel = label;
      closeEmailDetail();
      loadAndRender();
    });
  });

  // Search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      state.searchQuery = searchInput.value.trim();
      loadAndRender();
    }
  });

  document.getElementById('clearSearchBtn').addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    loadAndRender();
  });

  // Filter Chips
  document.getElementById('chipUnread').addEventListener('click', (e) => {
    state.chips.unreadOnly = !state.chips.unreadOnly;
    e.currentTarget.classList.toggle('active', state.chips.unreadOnly);
    loadAndRender();
  });

  document.getElementById('chipAttachment').addEventListener('click', (e) => {
    state.chips.hasAttachment = !state.chips.hasAttachment;
    e.currentTarget.classList.toggle('active', state.chips.hasAttachment);
    loadAndRender();
  });

  const chipMatter = document.getElementById('chipMatter');
  if (chipMatter) {
    chipMatter.addEventListener('click', (e) => {
      if (state.currentLabel === 'Client Matters') {
        state.currentLabel = '';
        chipMatter.classList.remove('active');
      } else {
        state.currentLabel = 'Client Matters';
        chipMatter.classList.add('active');
      }
      loadAndRender();
    });
  }

  const chipTime = document.getElementById('chipTime');
  if (chipTime) {
    chipTime.addEventListener('click', () => {
      showToast('Showing all messages sorted by date received.');
    });
  }

  const newLabelBtn = document.getElementById('newLabelBtn');
  if (newLabelBtn) {
    newLabelBtn.addEventListener('click', () => {
      const name = prompt('Enter new label name (e.g. Corporate Matters, Litigation):');
      if (name && name.trim()) {
        const labelsTree = document.querySelector('.labels-tree');
        if (labelsTree) {
          const li = document.createElement('li');
          li.className = 'tree-item';
          li.dataset.label = name.trim();
          li.innerHTML = `<span class="label-dot" style="background-color: #1a73e8;"></span><span>${escapeHtml(name.trim())}</span>`;
          li.addEventListener('click', () => {
            document.querySelectorAll('.nav-folder-item').forEach(i => i.classList.remove('active'));
            state.currentFolder = 'all';
            state.currentLabel = name.trim();
            closeEmailDetail();
            loadAndRender();
          });
          labelsTree.appendChild(li);
          showToast(`Label "${name.trim()}" created.`);
        }
      }
    });
  }

  // Selection & Bulk Toolbar
  selectAllCheckbox.addEventListener('click', () => {
    const isChecked = selectAllCheckbox.classList.toggle('checked');
    if (isChecked) {
      state.emails.forEach(e => state.selectedIds.add(e.id));
    } else {
      state.selectedIds.clear();
    }
    updateSelectionUI();
    renderEmailList(state.emails);
  });

  function updateSelectionUI() {
    const count = state.selectedIds.size;
    if (count > 0) {
      bulkActionsStrip.classList.add('visible');
      defaultToolbarTools.style.display = 'none';
      selectAllCheckbox.classList.add('checked');
    } else {
      bulkActionsStrip.classList.remove('visible');
      defaultToolbarTools.style.display = 'flex';
      selectAllCheckbox.classList.remove('checked');
    }
  }

  document.getElementById('bulkDeleteBtn').addEventListener('click', async () => {
    for (const id of state.selectedIds) {
      await window.emailService.deleteEmail(id);
    }
    showToast(`${state.selectedIds.size} emails moved to Trash.`);
    await loadAndRender();
    updateBadgeCounts();
  });

  document.getElementById('bulkReadBtn').addEventListener('click', async () => {
    for (const id of state.selectedIds) {
      await window.emailService.setReadState(id, true);
    }
    showToast(`${state.selectedIds.size} marked as read.`);
    await loadAndRender();
    updateBadgeCounts();
  });

  // Refresh
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.style.transform = 'rotate(360deg)';
    refreshBtn.style.transition = 'transform 0.6s ease';
    await window.emailService.syncInboundEmails();
    await loadAndRender();
    updateBadgeCounts();
    setTimeout(() => {
      refreshBtn.style.transform = 'none';
      refreshBtn.style.transition = 'none';
    }, 600);
    showToast('Inbox updated.');
  });

  // ============================================================================
  // Compose Modal Workflow
  // ============================================================================
  async function refreshComposeSenders() {
    if (!composeFromSelect) return;
    const senders = await window.emailService.getSenders();
    const activeEmail = (window.emailService.config.senderEmail || '').toLowerCase();
    const currentVal = composeFromSelect.value;
    composeFromSelect.innerHTML = '';

    senders.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.email;
      opt.dataset.name = s.name;
      opt.dataset.title = s.title || '';
      opt.textContent = `${s.name} <${s.email}>` + (s.title ? ` (${s.title})` : '');
      if (activeEmail && s.email.toLowerCase() === activeEmail) {
        opt.selected = true;
      } else if (!activeEmail && s.isDefault) {
        opt.selected = true;
      }
      composeFromSelect.appendChild(opt);
    });

    const customOpt = document.createElement('option');
    customOpt.value = '__custom__';
    customOpt.textContent = '+ Custom Name / Custom Email...';
    composeFromSelect.appendChild(customOpt);

    if (currentVal && currentVal !== '__custom__' && (!activeEmail || currentVal.toLowerCase() === activeEmail)) {
      composeFromSelect.value = currentVal;
    }
  }

  if (composeFromSelect) {
    composeFromSelect.addEventListener('change', () => {
      if (composeFromSelect.value === '__custom__') {
        if (composeCustomFromRow) {
          composeCustomFromRow.style.display = 'flex';
          if (composeCustomFromName) composeCustomFromName.focus();
        }
      } else {
        if (composeCustomFromRow) composeCustomFromRow.style.display = 'none';
      }
    });
  }

  function openComposeModal({ to = '', subject = '', body = '' } = {}) {
    refreshComposeSenders();
    composeTo.value = to;
    composeSubject.value = subject;
    composeBody.value = body;
    if (composeCustomFromRow) composeCustomFromRow.style.display = 'none';
    composeWindow.classList.add('visible');
    if (!to) {
      composeTo.focus();
    } else {
      composeBody.focus();
    }
  }

  openComposeBtn.addEventListener('click', () => openComposeModal());
  closeComposeBtn.addEventListener('click', () => composeWindow.classList.remove('visible'));
  discardDraftBtn.addEventListener('click', () => {
    composeWindow.classList.remove('visible');
    showToast('Draft discarded.');
  });

  sendEmailBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const to = composeTo.value.trim();
    const subject = composeSubject.value.trim();
    const body = composeBody.value.trim();

    if (!to) {
      alert('Please specify a recipient email address.');
      composeTo.focus();
      return;
    }

    sendEmailBtn.disabled = true;
    sendEmailBtn.textContent = 'Sending...';

    let fromEmail = '';
    let fromName = '';

    if (composeFromSelect && composeFromSelect.value === '__custom__') {
      let userInput = (composeCustomFromUser && composeCustomFromUser.value.trim()) || 'inquiries';
      let rawName = (composeCustomFromName && composeCustomFromName.value.trim()) || '';

      // Check if user entered "Name <email@domain>" format
      const combined = `${rawName} ${userInput}`;
      const angleMatch = combined.match(/^(.*?)\s*<(.+?)>$/);
      if (angleMatch) {
        fromName = angleMatch[1].replace(/["']/g, '').trim();
        fromEmail = angleMatch[2].trim();
      } else {
        fromEmail = userInput.includes('@') ? userInput : `${userInput}@mail.corporatelawgroup.org`;
        fromName = rawName || fromEmail.split('@')[0];
      }

      if (!fromName) {
        const prefix = fromEmail.split('@')[0];
        fromName = prefix ? (prefix.charAt(0).toUpperCase() + prefix.slice(1)) : 'Corporate Law Group';
      }
      // Save this new sender profile automatically so it persists for future emails!
      await window.emailService.saveSender({ name: fromName, email: fromEmail, isDefault: false });
    } else if (composeFromSelect && composeFromSelect.selectedOptions[0]) {
      fromEmail = composeFromSelect.value;
      const opt = composeFromSelect.selectedOptions[0];
      fromName = opt.dataset.name || window.emailService.config.senderName || 'Corporate Law Group Inquiries';
    } else {
      fromEmail = window.emailService.config.senderEmail || 'inquiries@mail.corporatelawgroup.org';
      fromName = window.emailService.config.senderName || 'Corporate Law Group Inquiries';
    }

    try {
      await window.emailService.sendEmail({
        fromName,
        fromEmail,
        to,
        subject: subject || '(no subject)',
        bodyHtml: `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>`,
        bodyText: body
      });

      composeWindow.classList.remove('visible');
      showToast(`Email sent from ${fromName} <${fromEmail}>`);
      if (state.currentFolder === 'sent') {
        await loadAndRender();
      }
      updateBadgeCounts();
    } catch (err) {
      alert(`Could not send email: ${err.message || err}`);
    } finally {
      sendEmailBtn.disabled = false;
      sendEmailBtn.textContent = 'Send';
    }
  });

  // ============================================================================
  // Settings & DB Connection Modal
  // ============================================================================
  function updateStatusIndicator() {
    const isConnected = window.emailService.config.isSupabaseConnected;
    if (isConnected) {
      statusText.textContent = 'Supabase Connected';
      statusDot.className = 'status-dot';
    } else {
      statusText.textContent = 'Configure Supabase & Resend';
      statusDot.className = 'status-dot offline';
    }
  }

  function updateHeaderIdentity() {
    const cfg = window.emailService.config;
    const name = cfg.senderName || 'Johnathan Vance';
    const email = cfg.senderEmail || 'johnathan@mail.corporatelawgroup.org';
    const avatar = cfg.senderAvatar || window.emailService.getAvatarForEmail(email) || '/assets/johnathan-vance.jpg';

    if (headerSenderName) headerSenderName.textContent = name;
    if (headerSenderEmail) headerSenderEmail.textContent = `<${email}>`;
    if (headerAvatar) {
      headerAvatar.innerHTML = `<img src="${avatar}" alt="${name}" id="headerAvatarImg">`;
    }
  }

  // Attorney Switcher Popover
  const attorneySwitcherPopover = document.getElementById('attorneySwitcherPopover');
  const attorneySwitcherList = document.getElementById('attorneySwitcherList');

  function renderAttorneySwitcher() {
    if (!attorneySwitcherList) return;
    const directory = window.emailService.getAttorneyDirectory();
    const currentEmail = (window.emailService.config.senderEmail || '').toLowerCase();
    attorneySwitcherList.innerHTML = '';

    directory.forEach(attorney => {
      const isSelected = currentEmail === attorney.email.toLowerCase();
      const item = document.createElement('div');
      item.className = 'attorney-item' + (isSelected ? ' active' : '');
      item.innerHTML = `
        <img src="${attorney.avatar}" class="attorney-item-avatar" alt="${attorney.name}">
        <div class="attorney-item-info">
          <div class="attorney-item-name">${attorney.name}</div>
          <div class="attorney-item-title">${attorney.title}</div>
          <div class="attorney-item-email">${attorney.email}</div>
        </div>
        ${isSelected ? '<span class="attorney-item-check">✓</span>' : ''}
      `;
      item.addEventListener('click', () => {
        switchActiveAttorney(attorney);
        if (attorneySwitcherPopover) attorneySwitcherPopover.style.display = 'none';
      });
      attorneySwitcherList.appendChild(item);
    });

    // Option for General Inquiries
    const inqItem = document.createElement('div');
    const isInq = currentEmail.includes('inquiries@');
    inqItem.className = 'attorney-item' + (isInq ? ' active' : '');
    inqItem.innerHTML = `
      <img src="/assets/logo.png" class="attorney-item-avatar" style="object-fit: contain; background: #0b57d0;" alt="Inquiries">
      <div class="attorney-item-info">
        <div class="attorney-item-name">Corporate Law Group Inquiries</div>
        <div class="attorney-item-title">General Client Intake</div>
        <div class="attorney-item-email">inquiries@mail.corporatelawgroup.org</div>
      </div>
      ${isInq ? '<span class="attorney-item-check">✓</span>' : ''}
    `;
    inqItem.addEventListener('click', () => {
      switchActiveAttorney({
        name: 'Corporate Law Group Inquiries',
        email: 'inquiries@mail.corporatelawgroup.org',
        title: 'General Client Intake',
        avatar: '/assets/logo.png'
      });
      if (attorneySwitcherPopover) attorneySwitcherPopover.style.display = 'none';
    });
    attorneySwitcherList.appendChild(inqItem);
  }

  function switchActiveAttorney(attorney) {
    window.emailService.saveConfig({
      senderName: attorney.name,
      senderEmail: attorney.email,
      senderTitle: attorney.title || '',
      senderAvatar: attorney.avatar || ''
    });
    updateHeaderIdentity();
    renderAttorneySwitcher();
    refreshComposeSenders();
    showToast(`Active persona: ${attorney.name}`);
  }

  if (headerAvatar) {
    headerAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!attorneySwitcherPopover) return;
      renderAttorneySwitcher();
      attorneySwitcherPopover.style.display = attorneySwitcherPopover.style.display === 'none' ? 'block' : 'none';
    });
  }

  if (identityBadge) {
    identityBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!attorneySwitcherPopover) return;
      renderAttorneySwitcher();
      attorneySwitcherPopover.style.display = attorneySwitcherPopover.style.display === 'none' ? 'block' : 'none';
    });
  }

  document.addEventListener('click', (e) => {
    if (attorneySwitcherPopover && !attorneySwitcherPopover.contains(e.target) && e.target !== headerAvatar && e.target !== identityBadge) {
      attorneySwitcherPopover.style.display = 'none';
    }
  });

  // Partner & Legal Counsel Directory Modal (Right Dock)
  const directoryModal = document.getElementById('directoryModal');
  const attorneyDirectoryDockBtn = document.getElementById('attorneyDirectoryDockBtn');
  const closeDirectoryBtn = document.getElementById('closeDirectoryBtn');
  const directoryCardsGrid = document.getElementById('directoryCardsGrid');

  function renderDirectoryModal() {
    if (!directoryCardsGrid) return;
    const directory = window.emailService.getAttorneyDirectory();
    directoryCardsGrid.innerHTML = '';

    directory.forEach(attorney => {
      const card = document.createElement('div');
      card.className = 'attorney-dossier-card';
      card.innerHTML = `
        <div class="dossier-top">
          <img src="${attorney.avatar}" class="dossier-photo" alt="${attorney.name}">
          <div>
            <div class="dossier-name">${attorney.name}</div>
            <div class="dossier-title">${attorney.title}</div>
            <a href="mailto:${attorney.email}" class="dossier-email">${attorney.email}</a>
          </div>
        </div>
        <div class="dossier-meta">
          <div><strong>Practice:</strong> ${attorney.practice || 'Corporate Law'}</div>
          <div><strong>Education:</strong> ${attorney.education || 'Columbia Law School'}</div>
          <div><strong>Experience:</strong> ${attorney.experience || 'BigLaw & Boutique'}</div>
        </div>
        <div class="dossier-actions">
          <button type="button" class="btn-dossier-action btn-dossier-primary" data-action="switch">
            Switch Persona
          </button>
          <button type="button" class="btn-dossier-action btn-dossier-secondary" data-action="compose">
            Compose as ${attorney.name.split(' ')[0]}
          </button>
        </div>
      `;

      card.querySelector('[data-action="switch"]').addEventListener('click', () => {
        switchActiveAttorney(attorney);
        directoryModal.style.display = 'none';
      });

      card.querySelector('[data-action="compose"]').addEventListener('click', () => {
        switchActiveAttorney(attorney);
        directoryModal.style.display = 'none';
        openComposeModal();
      });

      directoryCardsGrid.appendChild(card);
    });
  }

  if (attorneyDirectoryDockBtn) {
    attorneyDirectoryDockBtn.addEventListener('click', () => {
      renderDirectoryModal();
      directoryModal.style.display = 'flex';
    });
  }

  if (closeDirectoryBtn) {
    closeDirectoryBtn.addEventListener('click', () => {
      directoryModal.style.display = 'none';
    });
  }

  if (directoryModal) {
    directoryModal.addEventListener('click', (e) => {
      if (e.target === directoryModal) directoryModal.style.display = 'none';
    });
  }

  function openSettings() {
    const cfg = window.emailService.config;
    document.getElementById('cfgSupabaseUrl').value = cfg.supabaseUrl || 'https://xsnfafxcbdkyinytjhci.supabase.co';
    document.getElementById('cfgSupabaseKey').value = cfg.supabaseKey || '';
    document.getElementById('cfgResendKey').value = cfg.resendApiKey || '';
    const nameInput = document.getElementById('cfgSenderName');
    if (nameInput) nameInput.value = cfg.senderName || 'Corporate Law Group Inquiries';
    document.getElementById('cfgSenderEmail').value = cfg.senderEmail || 'inquiries@mail.corporatelawgroup.org';
    document.getElementById('cfgNotificationEmail').value = cfg.notificationEmail || 'inquiries@mail.corporatelawgroup.org';
    settingsModal.classList.add('visible');
  }

  function closeSettings() {
    settingsModal.classList.remove('visible');
  }

  settingsGearBtn.addEventListener('click', openSettings);
  statusBadge.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);

  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.settings-tab-page').forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).style.display = 'block';
    });
  });

  saveSettingsBtn.addEventListener('click', async () => {
    let emailVal = document.getElementById('cfgSenderEmail').value.trim() || 'inquiries@mail.corporatelawgroup.org';
    if (!emailVal.includes('@')) {
      emailVal = `${emailVal}@mail.corporatelawgroup.org`;
    }
    let nameVal = (document.getElementById('cfgSenderName') && document.getElementById('cfgSenderName').value.trim()) || '';
    if (!nameVal) {
      const prefix = emailVal.split('@')[0];
      nameVal = prefix ? (prefix.charAt(0).toUpperCase() + prefix.slice(1)) : 'Corporate Law Group';
    }

    const newConfig = {
      supabaseUrl: document.getElementById('cfgSupabaseUrl').value.trim(),
      supabaseKey: document.getElementById('cfgSupabaseKey').value.trim(),
      resendApiKey: document.getElementById('cfgResendKey').value.trim(),
      senderName: nameVal,
      senderEmail: emailVal,
      notificationEmail: document.getElementById('cfgNotificationEmail').value.trim() || 'inquiries@mail.corporatelawgroup.org'
    };

    saveSettingsBtn.textContent = 'Connecting...';
    saveSettingsBtn.disabled = true;

    // Also register this sender in the list as default
    await window.emailService.saveSender({ name: nameVal, email: emailVal, isDefault: true });

    const result = await window.emailService.saveConfig(newConfig);
    saveSettingsBtn.textContent = 'Save & Connect';
    saveSettingsBtn.disabled = false;

    updateStatusIndicator();
    updateHeaderIdentity();
    closeSettings();
    showToast(result.success ? 'Supabase connected & profile saved!' : 'Settings saved');
    await loadAndRender();
  });

  testConnectionBtn.addEventListener('click', async () => {
    testConnectionBtn.textContent = 'Testing...';
    testConnectionBtn.disabled = true;

    const testUrl = document.getElementById('cfgSupabaseUrl').value.trim();
    const testKey = document.getElementById('cfgSupabaseKey').value.trim();

    if (!testUrl || !testKey) {
      alert('Please enter your Supabase URL and Anon Key.');
      testConnectionBtn.textContent = 'Test Connection';
      testConnectionBtn.disabled = false;
      return;
    }

    try {
      const client = window.supabase.createClient(testUrl, testKey);
      const { data, error } = await client.from('emails').select('id').limit(1);
      if (error) throw error;
      alert('✅ Connection successful! Connected to Supabase "emails" table.');
    } catch (e) {
      alert(`⚠️ Connection check: ${e.message}\nMake sure you have created the "emails" table using the SQL Schema tab.`);
    }

    testConnectionBtn.textContent = 'Test Connection';
    testConnectionBtn.disabled = false;
  });

  copySqlBtn.addEventListener('click', () => {
    const code = document.getElementById('sqlCodeContent').textContent;
    navigator.clipboard.writeText(code).then(() => {
      copySqlBtn.textContent = 'Copied!';
      setTimeout(() => copySqlBtn.textContent = 'Copy SQL Script', 2000);
    });
  });

  clearEmailsBtn.addEventListener('click', () => {
    if (confirm('Clear all stored emails?')) {
      window.emailService.clearLocalEmails();
      closeSettings();
      loadAndRender();
      updateBadgeCounts();
      showToast('Stored emails cleared.');
    }
  });

  // ============================================================================
  // Helpers
  // ============================================================================
  async function updateBadgeCounts() {
    const counts = await window.emailService.getCounts();
    const inboxBadge = document.getElementById('inboxCountBadge');
    const draftsBadge = document.getElementById('draftsCountBadge');
    const sentBadge = document.getElementById('sentCountBadge');

    if (inboxBadge) inboxBadge.textContent = counts.inbox > 0 ? counts.inbox : '';
    if (draftsBadge) draftsBadge.textContent = counts.drafts > 0 ? counts.drafts : '';
    if (sentBadge) sentBadge.textContent = counts.sent > 0 ? counts.sent : '';
  }

  function showToast(message) {
    const toast = document.getElementById('gmailToast');
    const toastMsg = document.getElementById('toastMessage');
    toastMsg.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sanitizeHtml(rawHtml) {
    if (!rawHtml) return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, 'text/html');
      
      // Strip dangerous active tags
      const dangerousTags = ['script', 'noscript', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form'];
      dangerousTags.forEach(tag => {
        const els = doc.querySelectorAll(tag);
        els.forEach(el => el.remove());
      });

      // Strip event handlers and malicious URLs from all elements
      const allElements = doc.querySelectorAll('*');
      allElements.forEach(el => {
        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
          const name = attr.name.toLowerCase();
          const val = attr.value.trim().toLowerCase();
          if (name.startsWith('on') || val.startsWith('javascript:') || val.startsWith('data:text/html')) {
            el.removeAttribute(attr.name);
          }
        }
        if (el.tagName.toLowerCase() === 'a') {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
        }
      });

      return doc.body.innerHTML;
    } catch (e) {
      console.warn('HTML sanitization fallback applied:', e);
      return escapeHtml(rawHtml);
    }
  }

  // Hamburger Menu Toggle for Webmail Sidebar
  const sidebarToggleBtn = document.getElementById('gmailSidebarToggle');
  const appContainer = document.querySelector('.app-container');
  const sidebar = document.querySelector('.gmail-sidebar');

  if (sidebarToggleBtn && appContainer) {
    sidebarToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      appContainer.classList.toggle('sidebar-collapsed');
      if (sidebar) {
        sidebar.classList.toggle('mobile-hidden');
      }
    });
  }
});
