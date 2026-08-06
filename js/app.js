/**
 * IdeaSync Core Application State & Storage Controller
 */

class IdeaSyncApp {
  constructor() {
    this.LOCAL_DATA_KEY = 'ideasync_local_data';
    this.SYNC_STATE_KEY = 'ideasync_sync_state';

    // Initial default state pre-populated with user sample data
    this.defaultData = {
      appName: "IdeaSync",
      version: "1.0",
      lastSynced: new Date().toISOString(),
      ideas: [
        {
          id: "f2a91d45",
          title: "AI Crime Detection",
          description: "Detect suspicious human movement using AI and immediately notify the nearest police station.",
          status: "In Progress",
          createdAt: "2026-08-06T10:30:00Z",
          updatedAt: "2026-08-06T11:15:00Z"
        },
        {
          id: "a83c72ef",
          title: "Expense Tracker",
          description: "Create a mobile application that scans bills and tracks expenses automatically.",
          status: "New",
          createdAt: "2026-08-05T16:45:00Z",
          updatedAt: "2026-08-05T16:45:00Z"
        }
      ]
    };

    this.data = this.loadLocalData();
    this.currentView = 'grid'; // 'grid' | 'kanban' | 'json'
    this.activeFilter = 'All'; // 'All' | 'New' | 'In Progress' | 'Completed' | 'On Hold' | 'Archived'
    this.searchQuery = '';
    this.sortBy = 'updated'; // 'updated' | 'created' | 'title'
    this.isUnsynced = false;
    this.isSyncing = false;
  }

  /**
   * Load stored dataset from localStorage or initialize defaults
   */
  loadLocalData() {
    const raw = localStorage.getItem(this.LOCAL_DATA_KEY);
    if (!raw) {
      this.saveLocalData(this.defaultData);
      return this.defaultData;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
        parsed.ideas = [];
      }
      parsed.appName = "IdeaSync";
      parsed.version = "1.0";
      return parsed;
    } catch (e) {
      return this.defaultData;
    }
  }

  /**
   * Save dataset locally and mark as unsynced
   */
  saveLocalData(newData, markUnsynced = true) {
    this.data = newData;
    localStorage.setItem(this.LOCAL_DATA_KEY, JSON.stringify(this.data));
    if (markUnsynced) {
      this.isUnsynced = true;
    }
    this.render();
  }

  /**
   * Generate short 8-character hex ID (similar to sample: 'f2a91d45')
   */
  generateId() {
    return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  }

  /**
   * Add a new Idea
   */
  addIdea(title, description, status = 'New') {
    const now = new Date().toISOString();
    const newIdea = {
      id: this.generateId(),
      title: title.trim(),
      description: description.trim(),
      status: status,
      createdAt: now,
      updatedAt: now
    };

    this.data.ideas.unshift(newIdea);
    this.data.lastSynced = now;
    this.saveLocalData(this.data, true);
    return newIdea;
  }

  /**
   * Update an existing Idea
   */
  updateIdea(id, title, description, status) {
    const index = this.data.ideas.findIndex(item => item.id === id);
    if (index === -1) return null;

    const now = new Date().toISOString();
    this.data.ideas[index] = {
      ...this.data.ideas[index],
      title: title.trim(),
      description: description.trim(),
      status: status,
      updatedAt: now
    };

    this.saveLocalData(this.data, true);
    return this.data.ideas[index];
  }

  /**
   * Quick status change (used in Kanban drag/drop & context action)
   */
  updateStatus(id, newStatus) {
    const item = this.data.ideas.find(i => i.id === id);
    if (item && item.status !== newStatus) {
      item.status = newStatus;
      item.updatedAt = new Date().toISOString();
      this.saveLocalData(this.data, true);
    }
  }

  /**
   * Delete an Idea by ID
   */
  deleteIdea(id) {
    this.data.ideas = this.data.ideas.filter(item => item.id !== id);
    this.saveLocalData(this.data, true);
  }

  /**
   * Get filtered and sorted ideas array
   */
  getFilteredIdeas() {
    return this.data.ideas.filter(idea => {
      // Filter by status tab
      if (this.activeFilter !== 'All' && idea.status !== this.activeFilter) {
        return false;
      }
      // Filter by search query
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchTitle = idea.title.toLowerCase().includes(q);
        const matchDesc = idea.description.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    }).sort((a, b) => {
      if (this.sortBy === 'updated') {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      } else if (this.sortBy === 'created') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (this.sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }

  /**
   * Synchronize with GitHub
   */
  async syncWithGitHub(forcePush = false) {
    if (!window.githubSync.isConfigured()) {
      window.ui.showModal('github-modal');
      window.ui.showToast('Please configure GitHub storage settings first.', 'error');
      return;
    }

    this.isSyncing = true;
    window.ui.updateSyncBadge('syncing', 'Syncing...');

    try {
      if (forcePush || this.isUnsynced) {
        // Push local changes to GitHub
        const result = await window.githubSync.pushToGitHub(this.data);
        this.isUnsynced = false;
        this.data.lastSynced = result.lastSynced;
        this.saveLocalData(this.data, false);
        window.ui.updateSyncBadge('synced', 'Synced to GitHub');
        window.ui.showToast('Successfully synced to GitHub repository!', 'success');
      } else {
        // Pull latest from GitHub
        const pullRes = await window.githubSync.pullFromGitHub();
        if (pullRes.exists && pullRes.data) {
          this.data = pullRes.data;
          this.isUnsynced = false;
          this.saveLocalData(this.data, false);
          window.ui.updateSyncBadge('synced', 'Synced to GitHub');
          window.ui.showToast('Pulled latest ideas from GitHub repository!', 'success');
        } else {
          // File doesn't exist on GitHub yet -> initial push
          const result = await window.githubSync.pushToGitHub(this.data);
          this.isUnsynced = false;
          this.data.lastSynced = result.lastSynced;
          this.saveLocalData(this.data, false);
          window.ui.updateSyncBadge('synced', 'Created ideas.json on GitHub');
          window.ui.showToast('Created ideas.json in your GitHub repository!', 'success');
        }
      }
    } catch (err) {
      console.error('Sync Error:', err);
      window.ui.updateSyncBadge('error', 'Sync Failed');
      window.ui.showToast(err.message || 'Failed to sync with GitHub.', 'error');
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Render active view & stats
   */
  render() {
    window.ui.renderStats(this.data.ideas);
    window.ui.renderSyncBadge(this.isSyncing, this.isUnsynced, this.data.lastSynced);

    if (this.currentView === 'grid') {
      window.ui.renderGridView(this.getFilteredIdeas());
    } else if (this.currentView === 'kanban') {
      window.ui.renderKanbanView(this.data.ideas);
    } else if (this.currentView === 'json') {
      window.ui.renderJsonView(this.data);
    }
  }
}

window.app = new IdeaSyncApp();
