import React, { useState, useEffect } from 'react';
import './JiraConfig.css';

const API_ENDPOINT = 'https://kadj2jyknh.execute-api.us-east-1.amazonaws.com/dev/mps';

// Lightweight sprint detector — only fetches 1 ticket, only customfield_10020
const detectOpenSprint = async () => {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jql: 'project = CSAIM AND sprint in openSprints() ORDER BY created DESC',
      maxResults: 1,
      fields: ['customfield_10020'] // Only fetch sprint field — nothing else
    })
  });

  const raw = await response.json();
  let parsed = raw;
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  if (parsed.body && typeof parsed.body === 'string') parsed = JSON.parse(parsed.body);

  const sprintField = parsed.issues?.[0]?.fields?.customfield_10020;
  if (Array.isArray(sprintField) && sprintField.length > 0) {
    const sprint =
      sprintField.find(s => s.state === 'active') ||
      sprintField.find(s => s.state === 'closed') ||
      sprintField[0];
    return sprint?.name || null;
  }
  return null;
};

function JiraConfig({ onSubmit }) {
  const [jql, setJql] = useState('');
  const [detectedSprint, setDetectedSprint] = useState(null);
  const [detecting, setDetecting] = useState(true);
  const [detectError, setDetectError] = useState(null);

  const runDetection = async () => {
    setDetecting(true);
    setDetectError(null);
    try {
      const sprintName = await detectOpenSprint();
      if (sprintName) {
        setDetectedSprint(sprintName);
        setJql(`sprint = "${sprintName}" ORDER BY created DESC`);
      } else {
        setJql('project = CSAIM AND sprint in openSprints() ORDER BY created DESC');
        setDetectError('Could not detect sprint name — using openSprints() fallback');
      }
    } catch (err) {
      console.error('Sprint detection failed:', err);
      setJql('project = CSAIM AND sprint in openSprints() ORDER BY created DESC');
      setDetectError('Auto-detection failed — using openSprints() fallback');
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => { runDetection(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ jql });
  };

  return (
    <div className="config-card">
      <h2>JIRA Configuration</h2>

      <div style={{
        marginBottom: '1rem',
        padding: '10px 14px',
        borderRadius: '6px',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: detecting ? '#f4f5f7' : detectedSprint ? '#e3fcef' : '#fffae6',
        border: `1px solid ${detecting ? '#dfe1e6' : detectedSprint ? '#00875a' : '#ff991f'}`,
        color: detecting ? '#5e6c84' : detectedSprint ? '#006644' : '#974F0C'
      }}>
        <span>
          {detecting
            ? '⏳ Detecting current sprint...'
            : detectedSprint
              ? `✓ Auto-detected: ${detectedSprint}`
              : `⚠ ${detectError}`
          }
        </span>
        {!detecting && (
          <button
            onClick={runDetection}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#0052cc',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: '500'
            }}
          >
            ↻ Refresh
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="jql">JQL Query</label>
          <input
            id="jql"
            type="text"
            placeholder={detecting ? 'Detecting sprint...' : 'JQL query'}
            value={jql}
            onChange={(e) => setJql(e.target.value)}
            disabled={detecting}
            style={{ opacity: detecting ? 0.6 : 1 }}
          />
          <div style={{ fontSize: '12px', color: '#5e6c84', marginTop: '4px' }}>
            Auto-updates when a new sprint starts. You can still edit manually.
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={detecting || !jql}
        >
          {detecting ? 'Detecting...' : 'Fetch Tickets'}
        </button>
      </form>
    </div>
  );
}

export default JiraConfig;