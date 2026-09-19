/**
 * CorporateLawGroup.org — Interactive Application Controller
 * Handles hero video controls, multi-step consultation booking modal,
 * attorney dossier modals, practice area deep-dives, SEO article reader,
 * Texas location switcher, and FAQ accordion.
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeroVideo();
  initConsultationFlow();
  initPracticeAreaModals();
  initAttorneyModals();
  initInsightsReader();
  initFaqAccordion();
  initLocationTabs();
  initContactForm();
  initNavigation();
});

/* ==========================================================================
   1. Hero Video Controller
   ========================================================================== */
function initHeroVideo() {
  const video = document.getElementById('heroVideo');
  const playBtn = document.getElementById('videoPlayToggle');
  const soundBtn = document.getElementById('videoSoundToggle');

  if (!video) return;

  // Attempt autoplay safely
  video.muted = true;
  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // Browser autoplay policy might need user interaction
      if (playBtn) playBtn.innerHTML = `<span>▶ Play Video</span>`;
    });
  }

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (video.paused) {
        video.play();
        playBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
          <span>Pause</span>
        `;
      } else {
        video.pause();
        playBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <span>Play</span>
        `;
      }
    });
  }

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      if (video.muted) {
        soundBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
          <span>Muted</span>
        `;
      } else {
        soundBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          <span>Audio On</span>
        `;
      }
    });
  }
}

/* ==========================================================================
   2. Multi-Step Consultation Booking Modal Flow
   ========================================================================== */
function initConsultationFlow() {
  const modal = document.getElementById('consultationModal');
  const openButtons = document.querySelectorAll('.trigger-consult-modal');
  const closeBtn = document.getElementById('closeConsultModal');
  const form = document.getElementById('consultationWizardForm');

  if (!modal) return;

  openButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const presetArea = btn.getAttribute('data-practice');
      openConsultModal(presetArea);
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeConsultModal());
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeConsultModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeConsultModal();
    }
  });

  // Wizard Steps Management
  let currentStep = 1;
  let selectedPractice = 'Corporate & Business Law';

  const practiceCards = modal.querySelectorAll('.practice-select-card');
  practiceCards.forEach(card => {
    card.addEventListener('click', () => {
      practiceCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPractice = card.getAttribute('data-value') || 'Corporate & Business Law';
    });
  });

  const nextStep1Btn = document.getElementById('btnNextStep1');
  const nextStep2Btn = document.getElementById('btnNextStep2');
  const prevStep2Btn = document.getElementById('btnPrevStep2');
  const prevStep3Btn = document.getElementById('btnPrevStep3');

  if (nextStep1Btn) {
    nextStep1Btn.addEventListener('click', () => {
      goToStep(2);
    });
  }

  if (nextStep2Btn) {
    nextStep2Btn.addEventListener('click', () => {
      const matterDesc = document.getElementById('wizardMatterDesc');
      if (matterDesc && !matterDesc.value.trim()) {
        alert('Please provide a brief description of your matter.');
        matterDesc.focus();
        return;
      }
      goToStep(3);
    });
  }

  if (prevStep2Btn) {
    prevStep2Btn.addEventListener('click', () => goToStep(1));
  }

  if (prevStep3Btn) {
    prevStep3Btn.addEventListener('click', () => goToStep(2));
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('wizardName').value.trim();
      const email = document.getElementById('wizardEmail').value.trim();
      const phone = document.getElementById('wizardPhone').value.trim();
      const company = document.getElementById('wizardCompany').value.trim() || 'N/A';
      const timeframe = document.getElementById('wizardUrgency')?.value || 'Active Matter (Within 1-2 weeks)';
      const matterDesc = document.getElementById('wizardMatterDesc')?.value.trim() || 'General legal consultation request.';
      const mode = document.getElementById('wizardMode')?.value || 'Video Conference (Zoom / Teams)';

      if (!name || !email || !phone) {
        alert('Please fill out all required contact fields.');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Transmitting Intake &amp; Dispatched Email...</span>`;
      }

      // Populate confirmation screen
      const refNum = 'CLG-' + Math.floor(100000 + Math.random() * 900000);
      document.getElementById('confirmRefNum').textContent = refNum;
      document.getElementById('confirmPractice').textContent = selectedPractice;
      document.getElementById('confirmClient').textContent = `${name} (${company})`;
      document.getElementById('confirmContact').textContent = `${email} | ${phone}`;
      document.getElementById('confirmUrgency').textContent = timeframe;

      // Dispatch consultation notification email to legal counsel
      try {
        if (window.emailService) {
          await window.emailService.sendConsultationNotification({
            refNum,
            name,
            company,
            email,
            phone,
            practiceArea: selectedPractice,
            matterDesc,
            urgency: timeframe,
            mode,
            source: 'Multi-Step Consultation Wizard'
          });
        }
      } catch (err) {
        console.warn('Consultation notification dispatch notice:', err);
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }

      goToStep(4);
    });
  }

  function goToStep(stepNumber) {
    currentStep = stepNumber;
    modal.querySelectorAll('.consult-step-content').forEach(pane => {
      pane.classList.remove('active');
    });
    const activePane = document.getElementById(`consultStep${stepNumber}`);
    if (activePane) activePane.classList.add('active');

    // Update pill indicators
    const pills = modal.querySelectorAll('.step-pill');
    pills.forEach((pill, idx) => {
      if (idx < stepNumber) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    modal.querySelector('.modal-window').scrollTop = 0;
  }

  window.openConsultModal = function(presetArea) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    goToStep(1);

    if (presetArea) {
      practiceCards.forEach(c => {
        if (c.getAttribute('data-value') === presetArea) {
          c.classList.add('selected');
          selectedPractice = presetArea;
        } else {
          c.classList.remove('selected');
        }
      });
    }
  };

  window.closeConsultModal = function() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };
}

/* ==========================================================================
   3. Practice Area Deep-Dive Modal Data & Handler
   ========================================================================== */
const practiceAreaDetails = {
  corporate: {
    number: '01',
    title: 'Corporate & Business Law',
    lead: 'Comprehensive corporate counsel for business lifecycle management, strategic transactions, governance, and structural risk mitigation.',
    subsections: [
      {
        heading: 'Entity Formation & Structuring',
        body: 'Advising founders and investors on entity selection (LLC, C-Corp, S-Corp, LP, Series LLC) under Texas Business Organizations Code (BOC) and Delaware General Corporation Law (DGCL). We draft bespoke bylaws, LLC company agreements, founder vesting deeds, and capitalization tables designed for institutional investment.'
      },
      {
        heading: 'Mergers & Acquisitions (M&A) and Joint Ventures',
        body: 'Structuring asset purchases, stock purchases, statutory mergers, cross-border acquisitions, and joint ventures. We manage sell-side and buy-side due diligence, disclosure schedules, representations and warranties, non-compete covenants, and Hart-Scott-Rodino (HSR) antitrust filings.'
      },
      {
        heading: 'Commercial Contracts & Transactions',
        body: 'Master services agreements (MSAs), vendor procurement, distribution and licensing agreements, intellectual property transfer agreements, executive employment covenants, and complex B2B commercial contracts.'
      },
      {
        heading: 'Corporate Governance & Restructuring',
        body: 'Counseling boards of directors, special transaction committees, and controlling shareholders regarding fiduciary duties, conflict-of-interest transactions, shareholder dispute resolutions, recapitalizations, and out-of-court restructurings.'
      }
    ],
    statutes: ['Texas Business Organizations Code (BOC)', 'Delaware General Corporation Law (DGCL)', 'Uniform Commercial Code (UCC)', 'Securities Exchange Act of 1934'],
    ctaArea: 'Corporate & Business Law'
  },
  banking: {
    number: '02',
    title: 'Banking & Finance Law',
    lead: 'Sophisticated representation for commercial lenders, regional banks, private debt funds, FinTech platforms, and institutional borrowers.',
    subsections: [
      {
        heading: 'Commercial Lending & Credit Facilities',
        body: 'Drafting and negotiating bilateral and syndicated credit facilities, revolving credit agreements, asset-based lending (ABL) structures, senior secured debt, and mezzanine financing facilities.'
      },
      {
        heading: 'UCC Article 9 & Collateral Security',
        body: 'Perfection of security interests under Texas and Delaware Uniform Commercial Code (UCC Article 9). Real property deeds of trust, deposit account control agreements (DACAs), intellectual property security agreements, and intercreditor / subordination agreements.'
      },
      {
        heading: 'Regulatory Compliance & Financial Supervision',
        body: 'Navigating federal and Texas state banking regulations, including FDIC, OCC, CFPB guidelines, Bank Secrecy Act (BSA), Anti-Money Laundering (AML), Dodd-Frank compliance, and Texas Department of Banking licensure.'
      },
      {
        heading: 'FinTech & Capital Markets',
        body: 'Legal infrastructure for digital lending platforms, payment processors, private placement debt issuances (Regulation D Rule 506(b) and 506(c)), and venture debt transactions.'
      }
    ],
    statutes: ['Uniform Commercial Code (UCC) Article 9', 'Texas Finance Code', 'Dodd-Frank Wall Street Reform Act', 'Federal Reserve & OCC Supervisory Guidance'],
    ctaArea: 'Banking & Finance'
  },
  tax: {
    number: '03',
    title: 'Tax Law & Business Planning',
    lead: 'High-stakes federal and state tax planning, transaction structuring, IRS controversy resolution, and pass-through taxation strategy.',
    subsections: [
      {
        heading: 'Tax-Efficient Transactional Structuring',
        body: 'Structuring taxable and tax-free mergers, acquisitions, divisive reorganizations (Section 355 spin-offs), Section 338(h)(10) elections, and Section 1031 like-kind real estate exchanges to maximize post-transaction liquidity.'
      },
      {
        heading: 'Corporate & Partnership Taxation',
        body: 'Advising partnerships, LLCs, and S-Corporations on Subchapter K and Subchapter S tax allocations, capital accounts, debt-financed distributions, targeted allocations, and phantom stock compensation plans.'
      },
      {
        heading: 'Texas State & Local Tax (SALT) Counsel',
        body: 'Navigating Texas Franchise Tax (Margin Tax) apportionments, combined reporting, sales and use tax exemptions, and administrative protests before the Texas Comptroller of Public Accounts.'
      },
      {
        heading: 'IRS Disputes, Audits & Controversies',
        body: 'Representing businesses and high-net-worth executives in IRS examinations, administrative appeals before IRS Appeals Officers, penalty abatements, and litigation before the United States Tax Court.'
      }
    ],
    statutes: ['Internal Revenue Code (IRC 26 U.S.C.)', 'Treasury Regulations', 'Texas Tax Code Chapters 151 & 171', 'U.S. Tax Court Rules of Practice'],
    ctaArea: 'Tax Law'
  }
};

function initPracticeAreaModals() {
  const modal = document.getElementById('practiceDetailModal');
  const triggers = document.querySelectorAll('.trigger-practice-modal');
  const closeBtn = document.getElementById('closePracticeModal');

  if (!modal) return;

  triggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const areaKey = trigger.getAttribute('data-area');
      const data = practiceAreaDetails[areaKey];
      if (!data) return;

      document.getElementById('practiceModalNum').textContent = data.number;
      document.getElementById('practiceModalTitle').textContent = data.title;
      document.getElementById('practiceModalLead').textContent = data.lead;

      // Subsections
      const container = document.getElementById('practiceModalSections');
      container.innerHTML = data.subsections.map(sub => `
        <div style="margin-bottom: 24px;">
          <h4 style="font-family: var(--font-serif); font-size: 1.22rem; margin-bottom: 8px; color: var(--text-primary); font-weight: 700;">${sub.heading}</h4>
          <p style="color: var(--text-secondary); line-height: 1.7; font-size: 0.95rem;">${sub.body}</p>
        </div>
      `).join('');

      // Statutes
      const statuteContainer = document.getElementById('practiceModalStatutes');
      statuteContainer.innerHTML = data.statutes.map(s => `
        <span style="display: inline-block; background: var(--bg-secondary); border: 1px solid var(--border-subtle); padding: 4px 12px; border-radius: var(--radius-full); font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); margin: 3px 4px 3px 0;">${s}</span>
      `).join('');

      // Consultation CTA link
      const ctaBtn = document.getElementById('practiceModalCta');
      ctaBtn.onclick = () => {
        closePracticeModal();
        openConsultModal(data.ctaArea);
      };

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  function closePracticeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closePracticeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePracticeModal();
  });
}

/* ==========================================================================
   4. Attorney Bio Dossier Modals
   ========================================================================== */
const attorneyBios = {
  vance: {
    name: 'Johnathan Vance',
    title: 'Managing Partner',
    focus: 'Corporate, Banking & Finance, Tax',
    image: 'assets/johnathan-vance.jpg',
    education: 'J.D., Columbia Law School (Harlan Fiske Stone Scholar) • B.A., Economics, University of Texas at Austin',
    bar: 'State Bar of Texas (1998) • State Bar of New York (2000) • U.S. District Court, Southern & Northern Districts of Texas',
    bio: 'Johnathan Vance is the Managing Partner of Corporate Law Group with over 26 years of BigLaw and elite boutique practice. He acts as principal corporate outside counsel to prominent mid-market operating companies, private equity sponsors, and financial institutions across Texas and the United States.',
    deals: [
      'Represented Texas-based industrial distributor in a $320M cross-border equity sale to European conglomerate.',
      'Lead counsel for syndicate of commercial banks structuring a $180M asset-based revolving credit facility.',
      'Advised high-growth tech holding entity on corporate reorganization and federal tax restructuring under IRC §368.',
      'Regularly advises corporate boards of directors on fiduciary compliance and shareholder dispute mitigation.'
    ]
  },
  sterling: {
    name: 'Eleanor Sterling',
    title: 'Partner & Head of Banking & Finance',
    focus: 'Commercial Lending, Debt Financing & Financial Regulations',
    image: 'assets/eleanor-sterling.jpg',
    education: 'J.D., Harvard Law School • B.S., Finance, Wharton School of Business, University of Pennsylvania',
    bar: 'State Bar of Texas (2004) • U.S. Court of Appeals for the Fifth Circuit',
    bio: 'Eleanor Sterling leads the Banking & Finance practice at Corporate Law Group. Formerly a senior partner at an AmLaw 50 finance practice, Eleanor has structured more than $4.8 billion in senior, subordinated, and asset-backed credit facilities. She counsels both commercial bank lenders and institutional borrowers through complex loan covenant compliance.',
    deals: [
      'Served as borrower counsel in a $240M syndicated term loan with major national banking consortium.',
      'Structured numerous UCC Article 9 multi-jurisdictional security agreements and account control frameworks.',
      'Advised regional Texas banking institutions on compliance with OCC Dodd-Frank regulatory revisions.',
      'Structured specialized mezzanine financing and convertible note programs for emerging enterprise expansion.'
    ]
  },
  chen: {
    name: 'Marcus Chen',
    title: 'Partner & Head of Tax Practice',
    focus: 'Business Tax Planning, Corporate Taxation & IRS Disputes',
    image: 'assets/marcus-chen.jpg',
    education: 'LL.M. in Taxation, New York University School of Law • J.D., University of Texas School of Law • B.B.A. in Accounting, Texas A&M',
    bar: 'State Bar of Texas (2008) • United States Tax Court • U.S. Court of Federal Claims',
    bio: 'Marcus Chen is a nationally recognized tax attorney specializing in transaction-related federal taxation, partnership tax allocations, and state and local tax (SALT) controversies. Marcus works hand-in-hand with CFOs, CPAs, and business owners to implement tax-advantaged entity architectures and successfully resolve audits before the IRS Appeals Office.',
    deals: [
      'Engineered Section 1031 multi-property commercial real estate exchange program valued in excess of $85M.',
      'Represented healthcare enterprise in IRS examination resulting in 100% concession of proposed $12M penalty assessment.',
      'Structured complex partnership equity rollover agreements and profits-interest incentive pools under Rev. Proc. 93-27.',
      'Successfully resolved Texas Comptroller Franchise Tax apportionment dispute yielding substantial refund.'
    ]
  },
  ramirez: {
    name: 'Sofia Ramirez',
    title: 'Senior Counsel',
    focus: 'Corporate Governance, Contracts & FinTech Regulations',
    image: 'assets/sofia-ramirez.jpg',
    education: 'J.D., Stanford Law School • B.A., Political Science & Economics, Rice University',
    bar: 'State Bar of Texas (2014) • State Bar of California (2016)',
    bio: 'Sofia Ramirez counsels venture-backed technology startups, financial technology pioneers, and mid-sized enterprises. She specializes in corporate formation, Series Seed through Series B equity financing, commercial licensing, FinTech regulatory compliance, and day-to-day corporate governance.',
    deals: [
      'Advised Austin-based FinTech payment gateway on money services business (MSB) regulatory compliance and state licensing.',
      'Represented enterprise SaaS company in closing $22M Series A venture preferred stock round.',
      'Drafted complete commercial contract suite (MSAs, SLAs, Data Processing Agreements) for B2B enterprise clients.',
      'Counsel to family office investment consortium on corporate governance bylaws and minority shareholder rights.'
    ]
  }
};

function initAttorneyModals() {
  const modal = document.getElementById('attorneyBioModal');
  const triggers = document.querySelectorAll('.trigger-attorney-modal');
  const closeBtn = document.getElementById('closeAttorneyModal');

  if (!modal) return;

  triggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const attorneyKey = btn.getAttribute('data-attorney');
      const bio = attorneyBios[attorneyKey];
      if (!bio) return;

      document.getElementById('modalAttorneyImg').src = bio.image;
      document.getElementById('modalAttorneyImg').alt = bio.name;
      document.getElementById('modalAttorneyName').textContent = bio.name;
      document.getElementById('modalAttorneyTitle').textContent = bio.title;
      document.getElementById('modalAttorneyFocus').textContent = bio.focus;
      document.getElementById('modalAttorneyEducation').textContent = bio.education;
      document.getElementById('modalAttorneyBar').textContent = bio.bar;
      document.getElementById('modalAttorneyBio').textContent = bio.bio;

      const dealsList = document.getElementById('modalAttorneyDeals');
      dealsList.innerHTML = bio.deals.map(d => `
        <li style="margin-bottom: 8px; display: flex; gap: 8px; font-size: 0.92rem; color: var(--text-secondary);">
          <span style="color: var(--accent-gold); font-weight: bold;">•</span>
          <span>${d}</span>
        </li>
      `).join('');

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeAttorneyModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeAttorneyModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAttorneyModal();
  });
}

/* ==========================================================================
   5. SEO Legal Insights Article Reader & Filter
   ========================================================================== */
const articlesData = {
  'corporate-law-guide': {
    category: 'Corporate Law',
    readTime: '6 min read',
    title: 'What Is Corporate Law and When Does Your Business Need a Corporate Attorney?',
    date: 'August 24, 2026',
    author: 'Johnathan Vance, Managing Partner',
    summary: 'An authoritative examination of corporate law, the scope of corporate legal representation, and the critical inflection points when business owners should engage counsel.',
    content: `
      <h3>Understanding the Foundations of Corporate Law</h3>
      <p>Corporate law governs the formation, governance, operation, and dissolution of business organizations. Unlike litigation, which resolves disputes after friction occurs, corporate law is predominantly transactional and preventive—designed to create resilient operating structures that protect owners, define stakeholder rights, and facilitate commercial growth.</p>
      
      <h3>Core Responsibilities of Corporate Counsel</h3>
      <p>A corporate attorney serves as a strategic business counselor who translates commercial goals into enforceable legal architectures. Key functions include:</p>
      <ul>
        <li><strong>Structural Selection & Entity Formation:</strong> Choosing between LLCs, C-Corporations, S-Corporations, and partnerships under Texas Business Organizations Code or Delaware law.</li>
        <li><strong>Internal Governance Documents:</strong> Drafting bespoke Operating Agreements, Corporate Bylaws, Shareholder Buy-Sell Agreements, and Voting Trusts that prevent future deadlocks.</li>
        <li><strong>Capitalization & Financing:</strong> Managing stock purchase agreements, convertible notes, SAFEs, and cap table hygiene.</li>
        <li><strong>Commercial Transactions:</strong> Preparing contracts that allocate operational, financial, and regulatory risks appropriately.</li>
      </ul>

      <h3>Key Inflection Points: When to Engage a Corporate Lawyer</h3>
      <p>Businesses frequently wait until conflict arises before seeking counsel. However, proactive engagement is far more cost-effective during:</p>
      <ol>
        <li><strong>Founding with Multiple Equity Partners:</strong> Without clear buy-sell provisions and dispute-resolution mechanics, co-founder disputes can paralyze or dissolve an enterprise.</li>
        <li><strong>Raising Outside Capital or Debt:</strong> When accepting institutional or angel funding, terms such as liquidation preferences, anti-dilution clauses, and board seats carry long-term control ramifications.</li>
        <li><strong>Negotiating Major Commercial Contracts:</strong> High-stakes supply, SaaS, distribution, or licensing agreements require rigorous limitation-of-liability and indemnity clauses.</li>
        <li><strong>Mergers, Acquisitions, or Exits:</strong> Strategic transactions require thorough legal due diligence, reps & warranties structuring, and asset-transfer perfection.</li>
      </ol>

      <div style="margin-top: 24px; padding: 18px; background: var(--bg-secondary); border-left: 3px solid var(--accent-gold); font-size: 0.95rem;">
        <strong>Strategic Takeaway:</strong> Corporate counsel is not an administrative cost center; it is risk mitigation that preserves enterprise value and prepares businesses for successful financing and liquidity events.
      </div>
    `
  },
  'banking-lawyer-role': {
    category: 'Banking & Finance',
    readTime: '5 min read',
    title: 'What Does a Banking and Finance Lawyer Do?',
    date: 'August 18, 2026',
    author: 'Eleanor Sterling, Head of Banking & Finance',
    summary: 'A deep dive into commercial lending, debt financing instruments, collateral security, and the essential role of finance attorneys in major credit transactions.',
    content: `
      <h3>The Nexus of Capital and Legal Structure</h3>
      <p>Banking and finance lawyers facilitate the movement of capital between lenders (banks, private credit funds, mezzanine lenders) and borrowers (operating companies, sponsors, developers). Their core responsibility is drafting and negotiating the comprehensive legal documentation that defines loan terms, protects collateral, and ensures regulatory compliance.</p>

      <h3>Primary Practice Areas in Banking Law</h3>
      <p>A sophisticated banking and finance attorney routinely handles:</p>
      <ul>
        <li><strong>Syndicated and Bilateral Credit Facilities:</strong> Structuring multi-million-dollar credit agreements, establishing borrowing bases, financial covenants (leverage ratios, debt service coverage), and default remedies.</li>
        <li><strong>Secured Lending & UCC Article 9 Perfection:</strong> Preparing Security Agreements, Pledge Agreements, and UCC-1 financing statements to establish first-priority liens over equipment, accounts receivable, inventory, and intellectual property.</li>
        <li><strong>Real Estate & Construction Financing:</strong> Drafting deeds of trust, assignments of leases and rents, environmental indemnities, and construction loan monitoring agreements.</li>
        <li><strong>Intercreditor & Subordination Agreements:</strong> Governing the priority of payments and lien rights between senior secured lenders, second-lien holders, and subordinated mezzanine debt providers.</li>
      </ul>

      <h3>Protecting Borrowers in Loan Negotiations</h3>
      <p>While banks utilize standard form agreements, standard terms are heavily lender-favorable. A dedicated borrower-side finance attorney negotiates critical provisions such as cure periods for technical defaults, flexibility in future indebtedness baskets, and limits on restrictive operational covenants.</p>
    `
  },
  'tax-considerations-starting-business': {
    category: 'Tax Law',
    readTime: '7 min read',
    title: 'Tax Considerations When Starting a Business',
    date: 'August 10, 2026',
    author: 'Marcus Chen, Head of Tax Practice',
    summary: 'A comprehensive guide for entrepreneurs evaluating pass-through taxation, corporate tax rates, Texas Franchise Tax, and founder equity structuring.',
    content: `
      <h3>Entity Classification and Federal Tax Treatment</h3>
      <p>The choice of legal entity determines how earnings are taxed, how losses are deducted, and how exit proceeds are treated by the IRS:</p>
      <ul>
        <li><strong>Pass-Through Entities (LLCs & Partnerships):</strong> Profits and losses flow directly to owners' individual tax returns, avoiding double taxation. Subject to Section 199A Qualified Business Income (QBI) deductions where eligible.</li>
        <li><strong>S-Corporation Election:</strong> Allows owner-employees to split compensation between W-2 reasonable salary and shareholder distributions, potentially reducing FICA self-employment taxes.</li>
        <li><strong>C-Corporations:</strong> Subject to entity-level corporate income tax (federal 21%) and shareholder-level dividend taxation. However, C-Corps can qualify for IRC Section 1202 Qualified Small Business Stock (QSBS) treatment, which may exempt up to $10M+ in capital gains upon sale.</li>
      </ul>

      <h3>Texas State Tax Specifics: The Franchise Margin Tax</h3>
      <p>While Texas famously levies no individual state income tax, businesses operating in Texas must navigate the Texas Franchise Tax. Calculated on gross margin using one of four statutory deduction methods, businesses must evaluate annual filing thresholds and passive entity exemptions.</p>

      <h3>Founder Equity Vesting and Section 83(b) Elections</h3>
      <p>If founders receive equity subject to vesting, filing a timely Section 83(b) Election with the IRS within 30 days of stock receipt is paramount. Missing this deadline can trigger devastating ordinary income tax liabilities as company value appreciates.</p>
    `
  },
  'llc-vs-corporation': {
    category: 'Business Law',
    readTime: '6 min read',
    title: 'LLC vs Corporation: Legal Considerations for Business Owners',
    date: 'August 02, 2026',
    author: 'Johnathan Vance & Sofia Ramirez',
    summary: 'Comparing liability shields, governance formality requirements, venture capital readiness, and long-term exit dynamics between LLCs and Corporations.',
    content: `
      <h3>Core Similarities: The Limited Liability Shield</h3>
      <p>Both Limited Liability Companies (LLCs) and Corporations shield their owners (members or shareholders) from personal liability for business debts, contracts, and tort claims, provided corporate formalities are observed and the corporate veil is maintained.</p>

      <h3>Where LLCs and Corporations Diverge</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 0.92rem;">
        <thead>
          <tr style="background: var(--bg-secondary); text-align: left;">
            <th style="padding: 10px; border: 1px solid var(--border-subtle);">Factor</th>
            <th style="padding: 10px; border: 1px solid var(--border-subtle);">LLC</th>
            <th style="padding: 10px; border: 1px solid var(--border-subtle);">Corporation (C-Corp)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid var(--border-subtle); font-weight: 600;">Governance</td>
            <td style="padding: 10px; border: 1px solid var(--border-subtle);">Flexible: Member-managed or Manager-managed by Company Agreement</td>
            <td style="padding: 10px; border: 1px solid var(--border-subtle);">Statutory: Shareholders, Board of Directors, Officers</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid var(--border-subtle); font-weight: 600;">Formalities</td>
            <td style="padding: 10px; border: 1px solid var(--border-subtle);">Fewer required statutory meetings and formal minutes</td>
            <td style="padding: 10px; border: 1px solid var(--border-subtle);">Strict annual shareholder & director meetings, formal minutes</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid var(--border-subtle); font-weight: 600;">Investor Preference</td>
            <td style="padding: 10px; border: 1px solid var(--border-subtle);">Preferred by real estate, consulting, family enterprises</td>
            <td style="padding: 10px; border: 1px solid var(--border-subtle);">Required by venture capital funds and institutional investors</td>
          </tr>
        </tbody>
      </table>

      <h3>Making the Strategic Selection</h3>
      <p>If your enterprise plans to seek institutional VC capital, issue standard stock options to employees, or pursue an initial public offering (IPO), Delaware or Texas C-Corporation is the industry standard. For closely-held businesses seeking pass-through tax efficiency and maximum contractual flexibility, an LLC is frequently superior.</p>
    `
  },
  'business-loan-agreement-guide': {
    category: 'Banking & Finance',
    readTime: '6 min read',
    title: 'What Should You Know Before Signing a Business Loan Agreement?',
    date: 'July 28, 2026',
    author: 'Eleanor Sterling, Head of Banking & Finance',
    summary: 'Key pitfalls, restrictive covenants, personal guarantees, and cross-collateralization provisions that commercial borrowers must review prior to execution.',
    content: `
      <h3>The Reality of Commercial Lending Documents</h3>
      <p>Commercial loan agreements are drafted by specialized bank counsel to provide maximum remedy to the lender in the event of default. Unlike consumer loans, there are minimal statutory protections for commercial borrowers—the executed contract strictly controls the relationship.</p>

      <h3>Five Critical Clauses Every Borrower Must Scrutinize</h3>
      <ol>
        <li><strong>Negative Covenants:</strong> Provisions prohibiting the borrower from incurring additional debt, distributing dividends to owners, selling material assets, or changing business lines without prior lender consent.</li>
        <li><strong>Financial Maintenance Ratios:</strong> Quarterly tests such as Debt Service Coverage Ratio (DSCR) or Fixed Charge Coverage Ratio (FCCR). Borrowers must ensure definitions include realistic add-backs and allow equity cure rights.</li>
        <li><strong>Material Adverse Effect (MAE) Clauses:</strong> Subjective default triggers enabling the lender to call the loan if they deem the borrower's financial condition impaired.</li>
        <li><strong>Scope of Personal Guarantees:</strong> Determining whether guarantees are unlimited, limited (capped at specific dollar percentages), or non-recourse with standard "bad-boy" carve-outs.</li>
        <li><strong>Default Interest and Acceleration:</strong> Identifying the exact cure periods (e.g., 5-10 business days for payment, 30 days for operational covenants) before the bank can accelerate the full balance.</li>
      </ol>
    `
  },
  'corporate-governance-guide': {
    category: 'Corporate Law',
    readTime: '5 min read',
    title: 'Corporate Governance: What Business Owners Should Know',
    date: 'July 15, 2026',
    author: 'Johnathan Vance & Sofia Ramirez',
    summary: 'Fiduciary duties of directors, preservation of the corporate veil, conflict-of-interest transactions, and best practices for board minutes and resolutions.',
    content: `
      <h3>Why Corporate Governance Matters</h3>
      <p>Corporate governance is the system of rules, practices, and processes by which a firm is directed and controlled. Effective governance is essential not only for public conglomerates, but for mid-sized private enterprises seeking to avoid internal conflict and shield owners from personal liability.</p>

      <h3>Fiduciary Duties of Directors and Managers</h3>
      <p>Under Texas and Delaware corporate law, directors and managers owe two primary fiduciary duties:</p>
      <ul>
        <li><strong>The Duty of Care:</strong> The obligation to act on an informed basis, with the diligence of an ordinarily prudent person, protected by the Business Judgment Rule.</li>
        <li><strong>The Duty of Loyalty:</strong> Prohibiting self-dealing, usurping corporate opportunities, or entering into transactions where personal interest conflicts with the company's best interest without full disclosure and disinterested approval.</li>
      </ul>

      <h3>Preserving the Corporate Veil</h3>
      <p>To prevent creditors from "piercing the corporate veil" and reaching owners' personal assets, companies must avoid commingling funds, maintain adequate capitalization, and systematically document major company transactions via written board resolutions.</p>
    `
  }
};

function initInsightsReader() {
  const modal = document.getElementById('articleDetailModal');
  const cards = document.querySelectorAll('.insight-card');
  const closeBtn = document.getElementById('closeArticleModal');
  const filterBtns = document.querySelectorAll('.filter-btn');

  if (!modal) return;

  // Click card to open article modal
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const articleId = card.getAttribute('data-article-id');
      const article = articlesData[articleId];
      if (!article) return;

      document.getElementById('articleModalCat').textContent = article.category;
      document.getElementById('articleModalTime').textContent = article.readTime;
      document.getElementById('articleModalTitle').textContent = article.title;
      document.getElementById('articleModalDate').textContent = article.date;
      document.getElementById('articleModalAuthor').textContent = article.author;
      document.getElementById('articleModalBody').innerHTML = article.content;

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeArticleModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeArticleModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeArticleModal();
  });

  // Filter Buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterCategory = btn.getAttribute('data-filter');
      cards.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (filterCategory === 'all' || cardCat === filterCategory) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   6. FAQ Accordion (Fluid Expand/Collapse)
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question-btn');
    const answer = item.querySelector('.faq-answer');

    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close other open items
      faqItems.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          otherItem.classList.remove('active');
          const otherAnswer = otherItem.querySelector('.faq-answer');
          if (otherAnswer) otherAnswer.style.maxHeight = null;
        }
      });

      // Toggle current
      if (isActive) {
        item.classList.remove('active');
        answer.style.maxHeight = null;
      } else {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 30 + 'px';
      }
    });
  });
}

/* ==========================================================================
   7. Texas Location Tabs Switcher
   ========================================================================== */
function initLocationTabs() {
  const tabBtns = document.querySelectorAll('.loc-tab-btn');
  const panes = document.querySelectorAll('.location-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetCity = btn.getAttribute('data-city');
      const targetPane = document.getElementById(`locPane-${targetCity}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

/* ==========================================================================
   8. In-Page Contact Form Handler
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('inpageContactForm');
  const successBanner = document.getElementById('contactSuccessBanner');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const company = document.getElementById('contactCompany')?.value.trim() || 'N/A';
    const service = document.getElementById('contactService').value;
    const matterDesc = document.getElementById('contactMatter')?.value.trim() || 'Consultation request submitted via in-page intake form.';

    if (!name || !email || !phone) {
      alert('Please fill out all required contact fields.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Transmitting Consultation Request &amp; Email...</span>`;
    }

    // Generate unique reference number
    const refNum = 'CLG-' + Math.floor(100000 + Math.random() * 900000);

    // Dispatch consultation notification email to legal counsel
    try {
      if (window.emailService) {
        await window.emailService.sendConsultationNotification({
          refNum,
          name,
          company,
          email,
          phone,
          practiceArea: service,
          matterDesc,
          urgency: 'Active Matter (Within 1-2 weeks)',
          mode: 'Office / Phone Consultation',
          source: 'In-Page Contact Section'
        });
      }
    } catch (err) {
      console.warn('Contact consultation dispatch warning:', err);
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnHtml;
    }

    // Show success message
    if (successBanner) {
      successBanner.style.display = 'block';
      successBanner.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="font-size: 1.4rem; color: #10b981; line-height: 1;">✓</div>
          <div>
            <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary); margin-bottom: 4px;">Thank you, ${name}. Consultation Request Transmitted.</div>
            <div style="font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary);">
              Your request regarding <strong>${service}</strong> (Matter Ref: <strong>${refNum}</strong>) has been securely transmitted and emailed to our legal intake team. A senior attorney will contact you within 24 business hours at <strong>${phone}</strong> or <strong>${email}</strong>.
            </div>
          </div>
        </div>
      `;
      form.reset();
      successBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

/* ==========================================================================
   9. Mobile Navigation & Scroll Header
   ========================================================================== */
function initNavigation() {
  const header = document.querySelector('.site-header');
  const toggleBtn = document.getElementById('mobileToggleBtn') || document.querySelector('.mobile-toggle');
  const drawerCloseBtn = document.getElementById('mobileDrawerClose');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  const menu = document.getElementById('primaryNav') || document.querySelector('.nav-menu');
  const interactiveItems = document.querySelectorAll(
    '.nav-menu .nav-link, .nav-menu .drawer-portal-pill, .nav-menu .mobile-practice-chip, .nav-menu .trigger-consult-modal, .nav-menu .drawer-info-link'
  );

  // Header background on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });

  function openMobileMenu() {
    if (!menu) return;
    menu.classList.add('open');
    if (toggleBtn) {
      toggleBtn.classList.add('active');
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
    if (backdrop) backdrop.classList.add('active');
    document.body.classList.add('mobile-menu-open');
  }

  function closeMobileMenu() {
    if (!menu) return;
    menu.classList.remove('open');
    if (toggleBtn) {
      toggleBtn.classList.remove('active');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('mobile-menu-open');
  }

  // Mobile menu toggle
  if (toggleBtn && menu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menu.classList.contains('open')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMobileMenu();
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', closeMobileMenu);
    }

    // Close when clicking any interactive item inside the drawer
    interactiveItems.forEach(item => {
      item.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        closeMobileMenu();
      }
    });

    // Close on window resize above mobile breakpoint
    window.addEventListener('resize', () => {
      if (window.innerWidth > 992 && menu.classList.contains('open')) {
        closeMobileMenu();
      }
    }, { passive: true });
  }
}

