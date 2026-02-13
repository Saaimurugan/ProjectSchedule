import React, { useState } from 'react';
import './JiraConfig.css';

function JiraConfig({ onSubmit }) {
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [jql, setJql] = useState('sprint = "AIML Sprint 37" ORDER BY created DESC');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ domain, email, apiToken, jql });
  };

  return (
    <div className="config-card">
      <h2>JIRA Configuration</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="domain">JIRA Domain</label>
          <input
            id="domain"
            type="text"
            placeholder="https://your-domain.atlassian.net"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="your-email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="apiToken">API Token</label>
          <input
            id="apiToken"
            type="password"
            placeholder="Your JIRA API token"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="jql">JQL Query</label>
          <input
            id="jql"
            type="text"
            placeholder='sprint = "AIML Sprint 44" ORDER BY created DESC'
            value={jql}
            onChange={(e) => setJql(e.target.value)}
          />
        </div>
        
        <button type="submit" className="btn-primary">Fetch Tickets</button>
      </form>
    </div>
  );
}

export default JiraConfig;
