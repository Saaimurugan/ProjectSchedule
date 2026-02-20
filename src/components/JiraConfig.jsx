import React, { useState } from 'react';
import './JiraConfig.css';

function JiraConfig({ onSubmit }) {
  const [jql, setJql] = useState('sprint = "AIML Sprint 38" ORDER BY created DESC');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ jql });
  };

  return (
    <div className="config-card">
      <h2>JIRA Configuration</h2>
      <form onSubmit={handleSubmit}>
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
