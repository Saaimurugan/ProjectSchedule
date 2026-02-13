# JIRA Dashboard

A React dashboard that fetches and displays JIRA tickets with due dates, projects, and descriptions.

## Setup

1. Install dependencies:
```
npm install
```

2. Start the backend proxy server (in one terminal):
```
npm run server
```

3. Start the frontend dev server (in another terminal):
```
npm run dev
```

4. Open http://localhost:5173 in your browser

## Configuration

You'll need:
- Your JIRA domain (e.g., https://your-domain.atlassian.net)
- Your email address
- A JIRA API token (create one at: https://id.atlassian.com/manage-profile/security/api-tokens)

## Features

- Fetches tickets from JIRA using the REST API
- Displays ticket key, summary, project, due date, status, and description
- Highlights overdue tickets
- Supports custom JQL queries

## Architecture

The app uses a Node.js proxy server to avoid CORS issues when calling JIRA's API from the browser.
