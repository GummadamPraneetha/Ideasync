/**
 * GitHub Repository Storage Sync Module
 * Handles direct REST API operations to read/write files from/to a GitHub repository.
 */

class GitHubSyncService {
  constructor() {
    this.STORAGE_KEY = 'ideasync_gh_config';
    this.LAST_SHA_KEY = 'ideasync_gh_sha';
  }

  /**
   * Get current GitHub configuration
   */
  getConfig() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      return {
        token: '',
        owner: 'Danvikas09',
        repo: 'Ideasync',
        path: 'ideas.json',
        branch: 'main'
      };
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.owner) parsed.owner = 'Danvikas09';
      if (!parsed.repo) parsed.repo = 'Ideasync';
      return parsed;
    } catch (e) {
      return { token: '', owner: 'Danvikas09', repo: 'Ideasync', path: 'ideas.json', branch: 'main' };
    }
  }

  /**
   * Save configuration to localStorage
   */
  saveConfig(config) {
    const cleanConfig = {
      token: (config.token || '').trim(),
      owner: (config.owner || 'Danvikas09').trim(),
      repo: (config.repo || 'Ideasync').trim(),
      path: (config.path || 'ideas.json').trim().replace(/^\//, ''),
      branch: (config.branch || 'main').trim()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanConfig));
    return cleanConfig;
  }

  /**
   * Check if GitHub storage is configured
   */
  isConfigured() {
    const cfg = this.getConfig();
    return Boolean(cfg.token && cfg.owner && cfg.repo);
  }

  /**
   * Get last known SHA of ideas.json
   */
  getLastSha() {
    return localStorage.getItem(this.LAST_SHA_KEY) || null;
  }

  /**
   * Save last known SHA
   */
  saveLastSha(sha) {
    if (sha) {
      localStorage.setItem(this.LAST_SHA_KEY, sha);
    } else {
      localStorage.removeItem(this.LAST_SHA_KEY);
    }
  }

  /**
   * Test connection to GitHub API with current credentials
   */
  async testConnection() {
    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      throw new Error('GitHub details incomplete. Please fill Token, Owner, and Repo.');
    }

    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${cfg.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Invalid Personal Access Token.');
      if (response.status === 404) throw new Error(`Repository "${cfg.owner}/${cfg.repo}" not found or token lacks access.`);
      throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      repoName: data.full_name,
      defaultBranch: data.default_branch
    };
  }

  /**
   * Fetch file SHA if it exists on GitHub
   */
  async getFileSha(path) {
    const cfg = this.getConfig();
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`;
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${cfg.token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        cache: 'no-cache'
      });
      if (res.ok) {
        const data = await res.json();
        return data.sha;
      }
    } catch (e) {}
    return null;
  }

  /**
   * Push a specific text file to GitHub repository
   */
  async pushSingleFile(path, contentText, commitMessage) {
    const cfg = this.getConfig();
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
    const existingSha = await this.getFileSha(path);

    const base64Content = btoa(unescape(encodeURIComponent(contentText)));
    const bodyObj = {
      message: commitMessage || `Update ${path} via IdeaSync`,
      content: base64Content,
      branch: cfg.branch
    };
    if (existingSha) bodyObj.sha = existingSha;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${cfg.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyObj)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to push ${path}`);
    }
    return true;
  }

  /**
   * Fetch ideas JSON file from GitHub Repository
   */
  async pullFromGitHub() {
    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      throw new Error('GitHub Sync is not configured.');
    }

    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?ref=${cfg.branch}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${cfg.token}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      cache: 'no-cache'
    });

    if (response.status === 404) {
      return { exists: false, sha: null, data: null };
    }

    if (!response.ok) {
      throw new Error(`Failed to pull from GitHub (${response.status}: ${response.statusText})`);
    }

    const fileMeta = await response.json();
    this.saveLastSha(fileMeta.sha);

    const rawContent = fileMeta.content.replace(/\n/g, '');
    const jsonString = decodeURIComponent(escape(atob(rawContent)));
    const parsedData = JSON.parse(jsonString);

    return {
      exists: true,
      sha: fileMeta.sha,
      data: parsedData
    };
  }

  /**
   * Push ideas JSON file to GitHub Repository
   */
  async pushToGitHub(ideasPayload) {
    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      throw new Error('GitHub Sync is not configured.');
    }

    ideasPayload.lastSynced = new Date().toISOString();
    const formattedJson = JSON.stringify(ideasPayload, null, 2);
    await this.pushSingleFile(cfg.path, formattedJson, `IdeaSync: Updated ideas data (${ideasPayload.ideas.length} items)`);
    
    return {
      success: true,
      lastSynced: ideasPayload.lastSynced
    };
  }
}

window.githubSync = new GitHubSyncService();
