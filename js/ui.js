/**
 * IdeaSync UI Component Renderer & Interface Handler
 */

class UIHandler {
  constructor() {
    this.toastTimer = null;
  }

  /**
   * Format ISO Date string into human readable relative timestamp
   */
  formatDate(isoString) {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSeconds = Math.floor((now - date) / 1000);

      if (diffSeconds < 60) return 'Just now';
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
      if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
      if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (e) {
      return isoString;
    }
  }

  /**
   * Render Stats counters in toolbar
   */
  renderStats(ideas) {
    const totalEl = document.getElementById('stat-total');
    const newEl = document.getElementById('stat-new');
    const progressEl = document.getElementById('stat-progress');
    const completedEl = document.getElementById('stat-completed');

    if (totalEl) totalEl.textContent = ideas.length;
    if (newEl) newEl.textContent = ideas.filter(i => i.status === 'New').length;
    if (progressEl) progressEl.textContent = ideas.filter(i => i.status === 'In Progress').length;
    if (completedEl) completedEl.textContent = ideas.filter(i => i.status === 'Completed').length;
  }

  /**
   * Update header sync status indicator
   */
  renderSyncBadge(isSyncing, isUnsynced, lastSynced) {
    const pill = document.getElementById('sync-status-pill');
    const dot = document.getElementById('sync-dot');
    const text = document.getElementById('sync-text');

    if (!pill || !dot || !text) return;

    if (!window.githubSync.isConfigured()) {
      dot.className = 'sync-dot';
      text.textContent = 'Local Mode (Click to Setup GitHub)';
      return;
    }

    if (isSyncing) {
      dot.className = 'sync-dot syncing';
      text.textContent = 'Syncing...';
    } else if (isUnsynced) {
      dot.className = 'sync-dot unsynced';
      text.textContent = 'Unsynced Local Changes';
    } else {
      dot.className = 'sync-dot synced';
      text.textContent = `Synced (${this.formatDate(lastSynced)})`;
    }
  }

  updateSyncBadge(state, message) {
    const dot = document.getElementById('sync-dot');
    const text = document.getElementById('sync-text');
    if (!dot || !text) return;

    dot.className = `sync-dot ${state}`;
    text.textContent = message;
  }

  /**
   * Push full web app codebase to configured GitHub repository directly from browser
   */
  async pushFullProjectToGitHub() {
    if (!window.githubSync.isConfigured()) {
      this.showToast('Please enter your GitHub Personal Access Token first.', 'error');
      return;
    }

    this.showToast('Pushing full project to Danvikas09/Ideasync...', 'success');
    
    try {
      // 1. Fetch current local files & push
      const files = [
        { path: 'index.html', fetchUrl: '/index.html' },
        { path: 'css/style.css', fetchUrl: '/css/style.css' },
        { path: 'js/github-sync.js', fetchUrl: '/js/github-sync.js' },
        { path: 'js/app.js', fetchUrl: '/js/app.js' },
        { path: 'js/ui.js', fetchUrl: '/js/ui.js' },
        { path: 'README.md', fetchUrl: '/README.md' }
      ];

      for (const item of files) {
        const res = await fetch(item.fetchUrl);
        const text = await res.text();
        await window.githubSync.pushSingleFile(item.path, text, `Commit ${item.path} via IdeaSync Web App`);
      }

      // Also push current ideas dataset
      await window.app.syncWithGitHub(true);

      this.showToast('🎉 Successfully pushed full project to https://github.com/Danvikas09/Ideasync!', 'success');
    } catch (err) {
      console.error('Project Push Error:', err);
      this.showToast(err.message || 'Failed to push project code.', 'error');
    }
  }

  /**
   * Render Ideas in Card Grid Layout
   */
  renderGridView(ideas) {
    const container = document.getElementById('view-container');
    if (!container) return;

    if (ideas.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M9.66 16.03a5 5 0 1 1 4.68-2.63M12 18v2m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"></path>
            </svg>
          </div>
          <h3 class="empty-title">No Ideas Found</h3>
          <p class="empty-desc">Capture your thoughts or project ideas before they slip away! Click below to create your first idea.</p>
          <button class="btn btn-primary" onclick="window.ui.openNewIdeaModal()">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add New Idea
          </button>
        </div>
      `;
      return;
    }

    const cardsHtml = ideas.map(idea => {
      const statusClass = idea.status.toLowerCase().replace(/\s+/g, '-');
      return `
        <div class="idea-card" data-id="${idea.id}" data-status="${idea.status}">
          <div class="card-header">
            <h3 class="idea-title">${this.escapeHtml(idea.title)}</h3>
            <span class="status-badge status-${statusClass}">${idea.status}</span>
          </div>
          <p class="idea-description">${this.escapeHtml(idea.description)}</p>
          <div class="card-footer">
            <span class="card-time" title="Updated: ${idea.updatedAt}">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${this.formatDate(idea.updatedAt)}
            </span>
            <div class="card-actions">
              <button class="action-btn" title="Copy JSON ID" onclick="window.ui.copyText('${idea.id}')">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <button class="action-btn" title="Edit Idea" onclick="window.ui.openEditIdeaModal('${idea.id}')">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="action-btn delete-btn" title="Delete Idea" onclick="window.ui.confirmDeleteIdea('${idea.id}')">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="ideas-grid">${cardsHtml}</div>`;
  }

  /**
   * Render Ideas in Kanban Board View
   */
  renderKanbanView(allIdeas) {
    const container = document.getElementById('view-container');
    if (!container) return;

    const columns = [
      { id: 'New', title: 'New', color: '#38bdf8' },
      { id: 'In Progress', title: 'In Progress', color: '#818cf8' },
      { id: 'Completed', title: 'Completed', color: '#34d399' },
      { id: 'On Hold', title: 'On Hold', color: '#fbbf24' }
    ];

    const columnsHtml = columns.map(col => {
      const colIdeas = allIdeas.filter(i => i.status === col.id);
      const cardsHtml = colIdeas.map(idea => `
        <div class="idea-card" data-id="${idea.id}" data-status="${idea.status}" draggable="true" ondragstart="window.ui.handleDragStart(event, '${idea.id}')">
          <div class="card-header">
            <h4 class="idea-title" style="font-size:0.95rem;">${this.escapeHtml(idea.title)}</h4>
          </div>
          <p class="idea-description" style="font-size:0.82rem; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${this.escapeHtml(idea.description)}</p>
          <div class="card-footer">
            <span class="card-time">${this.formatDate(idea.updatedAt)}</span>
            <div class="card-actions">
              <button class="action-btn" title="Edit" onclick="window.ui.openEditIdeaModal('${idea.id}')">
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `).join('');

      return `
        <div class="kanban-column" ondragover="event.preventDefault()" ondrop="window.ui.handleDrop(event, '${col.id}')">
          <div class="kanban-header">
            <div class="kanban-title">
              <span style="width:10px; height:10px; border-radius:50%; background:${col.color};"></span>
              ${col.title}
            </div>
            <span class="kanban-count">${colIdeas.length}</span>
          </div>
          <div class="kanban-cards">${cardsHtml || '<div style="font-size:0.8rem; color:var(--text-dim); text-align:center; padding:1rem;">Drop items here</div>'}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="kanban-board">${columnsHtml}</div>`;
  }

  /**
   * Render Raw JSON Code View
   */
  renderJsonView(dataPayload) {
    const container = document.getElementById('view-container');
    if (!container) return;

    const formattedJson = JSON.stringify(dataPayload, null, 2);

    container.innerHTML = `
      <div class="json-view-container">
        <div class="json-actions">
          <button class="btn btn-secondary" onclick="window.ui.copyText(document.getElementById('raw-json-code').innerText)">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy JSON Payload
          </button>
          <button class="btn btn-secondary" onclick="window.ui.downloadJsonFile()">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download file
          </button>
        </div>
        <pre class="json-code" id="raw-json-code"><code>${this.syntaxHighlightJson(formattedJson)}</code></pre>
      </div>
    `;
  }

  /**
   * HTML Syntax Highlighting for JSON
   */
  syntaxHighlightJson(jsonString) {
    jsonString = this.escapeHtml(jsonString);
    return jsonString.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          return `<span style="color:#93c5fd; font-weight:600;">${match}</span>`;
        } else {
          return `<span style="color:#86efac;">${match}</span>`;
        }
      } else if (/true|false/.test(match)) {
        return `<span style="color:#fde047;">${match}</span>`;
      } else if (/null/.test(match)) {
        return `<span style="color:#f87171;">${match}</span>`;
      }
      return `<span style="color:#f472b6;">${match}</span>`;
    });
  }

  handleDragStart(e, id) {
    e.dataTransfer.setData('text/plain', id);
  }

  handleDrop(e, targetStatus) {
    e.preventDefault();
    const ideaId = e.dataTransfer.getData('text/plain');
    if (ideaId) {
      window.app.updateStatus(ideaId, targetStatus);
    }
  }

  showModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  }

  openNewIdeaModal() {
    document.getElementById('idea-modal-title').textContent = 'Add New Idea';
    document.getElementById('idea-id').value = '';
    document.getElementById('idea-title-input').value = '';
    document.getElementById('idea-desc-input').value = '';
    document.getElementById('idea-status-select').value = 'New';
    this.showModal('idea-modal');
  }

  openEditIdeaModal(id) {
    const item = window.app.data.ideas.find(i => i.id === id);
    if (!item) return;

    document.getElementById('idea-modal-title').textContent = 'Edit Idea';
    document.getElementById('idea-id').value = item.id;
    document.getElementById('idea-title-input').value = item.title;
    document.getElementById('idea-desc-input').value = item.description;
    document.getElementById('idea-status-select').value = item.status;
    this.showModal('idea-modal');
  }

  confirmDeleteIdea(id) {
    const item = window.app.data.ideas.find(i => i.id === id);
    if (!item) return;

    if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
      window.app.deleteIdea(id);
      this.showToast('Idea deleted.', 'success');
    }
  }

  openGitHubModal() {
    const cfg = window.githubSync.getConfig();
    document.getElementById('gh-token').value = cfg.token;
    document.getElementById('gh-owner').value = cfg.owner || 'Danvikas09';
    document.getElementById('gh-repo').value = cfg.repo || 'Ideasync';
    document.getElementById('gh-path').value = cfg.path || 'ideas.json';
    document.getElementById('gh-branch').value = cfg.branch || 'main';
    this.showModal('github-modal');
  }

  downloadJsonFile() {
    const jsonStr = JSON.stringify(window.app.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ideas.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Copied to clipboard!', 'success');
    }).catch(() => {
      this.showToast('Failed to copy text.', 'error');
    });
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' 
      ? '<svg viewBox="0 0 24 24" width="18" height="18" stroke="#16a34a" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" stroke="#dc2626" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    
    toast.innerHTML = `${icon} <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.ui = new UIHandler();
