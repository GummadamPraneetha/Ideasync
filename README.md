# 💡 IdeaSync - GitHub Repository as Storage

IdeaSync is a web application designed to note down ideas, project concepts, and tasks across laptops, mobile web browsers, and tablets — using a **GitHub Repository as Backendless Storage**.

## 🌟 Key Features

- **Backendless Sync via GitHub REST API**: Stores notes directly inside a `ideas.json` file in any GitHub repository using a GitHub Personal Access Token (PAT).
- **Strict Data Schema**:
  ```json
  {
    "appName": "IdeaSync",
    "version": "1.0",
    "lastSynced": "2026-08-06T14:30:00Z",
    "ideas": [
      {
        "id": "f2a91d45",
        "title": "AI Crime Detection",
        "description": "Detect suspicious human movement using AI and immediately notify the nearest police station.",
        "status": "In Progress",
        "createdAt": "2026-08-06T10:30:00Z",
        "updatedAt": "2026-08-06T11:15:00Z"
      },
      {
        "id": "a83c72ef",
        "title": "Expense Tracker",
        "description": "Create a mobile application that scans bills and tracks expenses automatically.",
        "status": "New",
        "createdAt": "2026-08-05T16:45:00Z",
        "updatedAt": "2026-08-05T16:45:00Z"
      }
    ]
  }
  ```
- **Multiple Views**:
  - **Cards Grid View**: Stat counters, status badges (`New`, `In Progress`, `Completed`, `On Hold`, `Archived`), timestamps, and search/sort bar.
  - **Kanban Board View**: Interactive drag-and-drop workflow status columns.
  - **Raw JSON Code View**: Live syntax-highlighted JSON inspector with copy and download options.
- **Theme Switcher**: Switch live between **Light Grey**, **Slate Grey**, and **Bright White**.
- **Offline First**: Works locally in browser storage even without GitHub configured.

---

## 🚀 How to Run Locally

1. Open a terminal in the project directory:
   ```bash
   python3 -m http.server 8080
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```

---

## 🔒 GitHub Storage Configuration

1. Click **GitHub Storage Settings** in the top navigation bar.
2. Enter your **GitHub Personal Access Token (PAT)** (needs `repo` or `contents: read/write` access).
3. Enter your **Repository Owner** and **Repository Name** (e.g. `yourname/ideas-repo`).
4. Click **Save & Push** or **Pull from GitHub**.
