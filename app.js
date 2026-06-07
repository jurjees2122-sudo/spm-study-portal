// ==========================================================================
// SPM HAQs Mastery Portal - Frontend Logic Engine
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    questions: SPM_QUESTIONS || [],
    filters: {
      search: '',
      type: 'all',
      chapter: 'all',
      highYield: false,
      status: 'all'
    },
    activeRecall: true, // Default to true for testing recall
    theme: 'dark',
    sidebarOpen: true
  };

  // LocalStorage Keys
  const STORAGE_KEYS = {
    READ: 'spm_study_read',
    REVISED: 'spm_study_revised',
    STRUGGLE: 'spm_study_struggle',
    THEME: 'spm_study_theme',
    RECALL: 'spm_study_recall'
  };

  // Progress States loaded from LocalStorage
  let studyProgress = {
    read: JSON.parse(localStorage.getItem(STORAGE_KEYS.READ)) || {},
    revised: JSON.parse(localStorage.getItem(STORAGE_KEYS.REVISED)) || {},
    struggling: JSON.parse(localStorage.getItem(STORAGE_KEYS.STRUGGLE)) || {}
  };

  // DOM Elements Cache
  const elements = {
    sidebar: document.getElementById('sidebar'),
    toggleSidebar: document.getElementById('toggleSidebar'),
    chaptersList: document.getElementById('chapters-list'),
    questionsGrid: document.getElementById('questions-grid'),
    emptyState: document.getElementById('empty-state'),
    searchInput: document.getElementById('search-input'),
    activeRecallToggle: document.getElementById('active-recall-toggle'),
    themeToggle: document.getElementById('theme-toggle'),
    highYieldFilter: document.getElementById('high-yield-filter'),
    statusFilter: document.getElementById('status-filter'),
    resultsCounter: document.getElementById('results-counter'),
    categoryTitle: document.getElementById('current-category-title'),
    progressFill: document.getElementById('progress-fill'),
    progressPercent: document.getElementById('progress-percent'),
    statRead: document.getElementById('stat-read'),
    statRevised: document.getElementById('stat-revised'),
    statStruggle: document.getElementById('stat-struggle'),
    resetAllFilters: document.getElementById('reset-all-filters'),
    activeFiltersSummary: document.getElementById('active-filters-summary')
  };

  // ==========================================================================
  // Initialization
  // ==========================================================================
  
  function init() {
    setupTheme();
    setupActiveRecallState();
    buildChapterNavigation();
    renderQuestions();
    updateProgressUI();
    setupEventListeners();
    lucide.createIcons();
  }

  // Set initial theme
  function setupTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
    state.theme = savedTheme;
    if (savedTheme === 'light') {
      document.body.classList.remove('dark-mode');
      elements.themeToggle.innerHTML = '<i data-lucide="moon"></i>';
    } else {
      document.body.classList.add('dark-mode');
      elements.themeToggle.innerHTML = '<i data-lucide="sun"></i>';
    }
  }

  // Set initial Active Recall Mode
  function setupActiveRecallState() {
    const savedRecall = localStorage.getItem(STORAGE_KEYS.RECALL);
    if (savedRecall !== null) {
      state.activeRecall = JSON.parse(savedRecall);
    }
    updateActiveRecallButtonUI();
  }

  function updateActiveRecallButtonUI() {
    if (state.activeRecall) {
      elements.activeRecallToggle.classList.add('active');
      elements.activeRecallToggle.querySelector('span').textContent = 'Active Recall: ON';
      elements.activeRecallToggle.querySelector('i').setAttribute('data-lucide', 'eye-off');
    } else {
      elements.activeRecallToggle.classList.remove('active');
      elements.activeRecallToggle.querySelector('span').textContent = 'Active Recall: OFF';
      elements.activeRecallToggle.querySelector('i').setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
  }

  // ==========================================================================
  // Dynamic Chapter Sidebar Generation
  // ==========================================================================
  
  function buildChapterNavigation() {
    // Collect all unique chapters
    const chapters = {};
    state.questions.forEach(q => {
      chapters[q.chapter] = (chapters[q.chapter] || 0) + 1;
    });

    elements.chaptersList.innerHTML = '';
    
    // Add "All Chapters" button
    const allLi = document.createElement('li');
    allLi.innerHTML = `
      <button class="chapter-btn active" data-chapter="all">
        <span class="name-wrapper">
          <i data-lucide="book-open"></i>
          <span>All Chapters</span>
        </span>
        <span class="count-badge">${state.questions.length}</span>
      </button>
    `;
    elements.chaptersList.appendChild(allLi);

    // Add individual chapters alphabetically
    Object.keys(chapters).sort().forEach(chName => {
      const li = document.createElement('li');
      li.innerHTML = `
        <button class="chapter-btn" data-chapter="${chName}">
          <span class="name-wrapper">
            <i data-lucide="folder"></i>
            <span>${chName}</span>
          </span>
          <span class="count-badge">${chapters[chName]}</span>
        </button>
      `;
      elements.chaptersList.appendChild(li);
    });
  }

  // ==========================================================================
  // Progress Calculations
  // ==========================================================================
  
  function updateProgressUI() {
    const total = state.questions.length;
    if (total === 0) return;

    const readCount = Object.values(studyProgress.read).filter(Boolean).length;
    const revisedCount = Object.values(studyProgress.revised).filter(Boolean).length;
    const struggleCount = Object.values(studyProgress.struggling).filter(Boolean).length;

    // Calculate unique questions completed (either read or revised)
    const completedSet = new Set([
      ...Object.keys(studyProgress.read).filter(k => studyProgress.read[k]),
      ...Object.keys(studyProgress.revised).filter(k => studyProgress.revised[k])
    ]);

    const percent = Math.round((completedSet.size / total) * 100);

    elements.progressFill.style.width = `${percent}%`;
    elements.progressPercent.textContent = `${percent}%`;
    
    elements.statRead.textContent = readCount;
    elements.statRevised.textContent = revisedCount;
    elements.statStruggle.textContent = struggleCount;
  }

  function persistProgress(type, id, val) {
    studyProgress[type][id] = val;
    
    let storageKey = '';
    if (type === 'read') storageKey = STORAGE_KEYS.READ;
    if (type === 'revised') storageKey = STORAGE_KEYS.REVISED;
    if (type === 'struggling') storageKey = STORAGE_KEYS.STRUGGLE;

    localStorage.setItem(storageKey, JSON.stringify(studyProgress[type]));
    updateProgressUI();
  }

  // ==========================================================================
  // Filtering Engine
  // ==========================================================================
  
  function getFilteredQuestions() {
    return state.questions.filter(q => {
      // 1. Search Query Match
      const searchMatch = !state.filters.search || 
        q.text.toLowerCase().includes(state.filters.search.toLowerCase()) || 
        q.chapter.toLowerCase().includes(state.filters.search.toLowerCase());

      // 2. Type Filter Match
      const typeMatch = state.filters.type === 'all' || q.type === state.filters.type;

      // 3. Chapter Filter Match
      const chapterMatch = state.filters.chapter === 'all' || q.chapter === state.filters.chapter;

      // 4. High-Yield Match (4+ stars)
      const hyMatch = !state.filters.highYield || q.stars >= 4;

      // 5. Study Status Match
      let statusMatch = true;
      if (state.filters.status === 'read') {
        statusMatch = studyProgress.read[q.id] === true;
      } else if (state.filters.status === 'revised') {
        statusMatch = studyProgress.revised[q.id] === true;
      } else if (state.filters.status === 'struggling') {
        statusMatch = studyProgress.struggling[q.id] === true;
      } else if (state.filters.status === 'unread') {
        statusMatch = !studyProgress.read[q.id] && !studyProgress.revised[q.id] && !studyProgress.struggling[q.id];
      }

      return searchMatch && typeMatch && chapterMatch && hyMatch && statusMatch;
    });
  }

  // ==========================================================================
  // Render Engine (Dynamic UI Generation)
  // ==========================================================================
  
  function renderQuestions() {
    const filtered = getFilteredQuestions();
    
    // Update Results Summary Info
    elements.resultsCounter.textContent = `Showing ${filtered.length} of ${state.questions.length} questions`;
    
    // Category Heading Update
    if (state.filters.chapter !== 'all') {
      elements.categoryTitle.textContent = state.filters.chapter;
    } else if (state.filters.type !== 'all') {
      elements.categoryTitle.textContent = `All ${state.filters.type}s`;
    } else {
      elements.categoryTitle.textContent = "All SPM Questions";
    }

    // Render Cards
    elements.questionsGrid.innerHTML = '';
    
    if (filtered.length === 0) {
      elements.emptyState.classList.remove('hidden');
      return;
    }
    
    elements.emptyState.classList.add('hidden');

    filtered.forEach(q => {
      const card = document.createElement('article');
      
      // Determine study status classes for styled borders
      let statusClass = '';
      if (studyProgress.struggling[q.id]) statusClass = 'status-struggling';
      else if (studyProgress.revised[q.id]) statusClass = 'status-revised';
      else if (studyProgress.read[q.id]) statusClass = 'status-read';
      
      card.className = `question-card ${statusClass}`;
      card.setAttribute('data-id', q.id);

      // Stars rendering
      let starsHTML = '';
      for (let s = 0; s < q.stars; s++) {
        starsHTML += '<i data-lucide="star"></i>';
      }

      // Checkbox checked states
      const readChecked = studyProgress.read[q.id] ? 'checked' : '';
      const revisedChecked = studyProgress.revised[q.id] ? 'checked' : '';
      const struggleChecked = studyProgress.struggling[q.id] ? 'checked' : '';

      // Set HTML Structure
      card.innerHTML = `
        <div class="card-header">
          <div class="meta-badges">
            <span class="type-badge ${q.type.toLowerCase().replace('/', '')}">${q.type}</span>
            <span class="chapter-badge">${q.chapter}</span>
            <span class="chapter-badge">Page ${q.page}</span>
          </div>
          <div class="star-rating">
            ${starsHTML}
          </div>
        </div>

        <h3 class="question-text">${q.id}. ${q.text}</h3>

        <div class="question-card-footer">
          <div class="study-checkboxes">
            <label>
              <input type="checkbox" class="cb-read" ${readChecked}>
              <span>Read</span>
            </label>
            <label>
              <input type="checkbox" class="cb-revised" ${revisedChecked}>
              <span>Revised</span>
            </label>
            <label>
              <input type="checkbox" class="cb-struggle" ${struggleChecked}>
              <span>Struggling</span>
            </label>
          </div>

          <div class="card-actions">
            <button class="card-btn" class="print-btn" title="Print this specific Q&A sheet">
              <i data-lucide="printer"></i>
            </button>
            <button class="card-btn primary toggle-answer-btn">
              <i data-lucide="eye"></i>
              <span>${state.activeRecall ? 'Reveal Answer' : 'Hide Answer'}</span>
            </button>
          </div>
        </div>

        <!-- Answer Section (Markdown Container) -->
        <div class="answer-wrapper ${state.activeRecall ? 'hidden' : ''}">
          <div class="answer-header">
            <h4><i data-lucide="text-quote"></i> Solved Answer (SIA & Park)</h4>
            <span class="badge badge-vsaq">Ref: Park & SIA solved sheets</span>
          </div>
          <div class="answer-body">
            ${renderMarkdown(q.answer)}
          </div>
        </div>
      `;

      elements.questionsGrid.appendChild(card);
    });

    // Re-trigger icon rendering
    lucide.createIcons();
    setupCardEventHandlers();
  }

  // Simple Markdown Parser to translate backend content into clean, premium typography
  function renderMarkdown(md) {
    if (!md) return '';
    return md
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/\* \*\*(.*?)\*\*/g, '<li><strong>$1</strong>')
      .replace(/\* (.*)/g, '<li>$1</li>')
      .replace(/\n\n/g, '<p></p>')
      .replace(/\$\$(.*?)\$\$/g, '<code class="formula">$1</code>');
  }

  // ==========================================================================
  // Card Interactivity Handlers
  // ==========================================================================
  
  function setupCardEventHandlers() {
    // Checkboxes change listeners
    document.querySelectorAll('.question-card').forEach(card => {
      const qId = parseInt(card.getAttribute('data-id'));
      
      // Study checklist triggers
      card.querySelector('.cb-read').addEventListener('change', (e) => {
        persistProgress('read', qId, e.target.checked);
        updateCardStatusClass(card, qId);
      });
      card.querySelector('.cb-revised').addEventListener('change', (e) => {
        persistProgress('revised', qId, e.target.checked);
        updateCardStatusClass(card, qId);
      });
      card.querySelector('.cb-struggle').addEventListener('change', (e) => {
        persistProgress('struggling', qId, e.target.checked);
        updateCardStatusClass(card, qId);
      });

      // Show/Hide Answer trigger
      card.querySelector('.toggle-answer-btn').addEventListener('click', (e) => {
        const wrapper = card.querySelector('.answer-wrapper');
        const btnText = card.querySelector('.toggle-answer-btn span');
        const btnIcon = card.querySelector('.toggle-answer-btn i');
        
        wrapper.classList.toggle('hidden');
        
        if (wrapper.classList.contains('hidden')) {
          btnText.textContent = 'Reveal Answer';
          btnIcon.setAttribute('data-lucide', 'eye');
        } else {
          btnText.textContent = 'Hide Answer';
          btnIcon.setAttribute('data-lucide', 'eye-off');
        }
        lucide.createIcons();
      });

      // Specific Print Button trigger
      card.querySelector('.card-actions button:first-child').addEventListener('click', () => {
        const wrapper = card.querySelector('.answer-wrapper');
        // Unhide answer during printing temporarily
        const wasHidden = wrapper.classList.contains('hidden');
        if (wasHidden) wrapper.classList.remove('hidden');
        
        // Hide other elements for clean printing
        window.print();
        
        if (wasHidden) wrapper.classList.add('hidden');
      });
    });
  }

  function updateCardStatusClass(card, id) {
    card.classList.remove('status-read', 'status-revised', 'status-struggling');
    
    if (studyProgress.struggling[id]) {
      card.classList.add('status-struggling');
    } else if (studyProgress.revised[id]) {
      card.classList.add('status-revised');
    } else if (studyProgress.read[id]) {
      card.classList.add('status-read');
    }
  }

  // ==========================================================================
  // System Event Listeners
  // ==========================================================================
  
  function setupEventListeners() {
    // Search Box Listener
    elements.searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      renderQuestions();
    });

    // Chapter Navigation Sidebar Listeners
    elements.chaptersList.addEventListener('click', (e) => {
      const btn = e.target.closest('.chapter-btn');
      if (!btn) return;

      document.querySelectorAll('.chapter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.filters.chapter = btn.getAttribute('data-chapter');
      renderQuestions();
    });

    // Question Type Filtering
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        state.filters.type = btn.getAttribute('data-type');
        renderQuestions();
      });
    });

    // High-Yield (Star rating) Filter Toggle
    elements.highYieldFilter.addEventListener('click', () => {
      state.filters.highYield = !state.filters.highYield;
      elements.highYieldFilter.classList.toggle('active', state.filters.highYield);
      renderQuestions();
    });

    // Status Filter Selection Change
    elements.statusFilter.addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      renderQuestions();
    });

    // Active Recall Mode Toggle
    elements.activeRecallToggle.addEventListener('click', () => {
      state.activeRecall = !state.activeRecall;
      localStorage.setItem(STORAGE_KEYS.RECALL, JSON.stringify(state.activeRecall));
      updateActiveRecallButtonUI();
      renderQuestions();
    });

    // Theme (Light/Dark) Switcher
    elements.themeToggle.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
      setupTheme();
    });

    // Sidebar Collapsing/Expanding Button
    elements.toggleSidebar.addEventListener('click', () => {
      state.sidebarOpen = !state.sidebarOpen;
      elements.sidebar.classList.toggle('collapsed', !state.sidebarOpen);
      
      const icon = elements.toggleSidebar.querySelector('i');
      if (state.sidebarOpen) {
        icon.setAttribute('data-lucide', 'chevron-left');
      } else {
        icon.setAttribute('data-lucide', 'chevron-right');
      }
      lucide.createIcons();
    });

    // Reset filters empty state button
    elements.resetAllFilters.addEventListener('click', resetFilters);
  }

  function resetFilters() {
    state.filters.search = '';
    state.filters.type = 'all';
    state.filters.chapter = 'all';
    state.filters.highYield = false;
    state.filters.status = 'all';

    elements.searchInput.value = '';
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-type') === 'all');
    });
    
    document.querySelectorAll('.chapter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-chapter') === 'all');
    });

    elements.highYieldFilter.classList.remove('active');
    elements.statusFilter.value = 'all';

    renderQuestions();
  }

  // Start the engine
  init();
});
