import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import './SprintTrends.css';

function SprintTrends({ currentSprintData, sprintHistory: sprintHistoryProp }) {
  const [sprintHistory, setSprintHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use sprint history from props
  useEffect(() => {
    if (sprintHistoryProp && sprintHistoryProp.length > 0) {
      console.log('Displaying sprint history:', sprintHistoryProp.length, 'sprints');
      const sortedData = [...sprintHistoryProp].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      setSprintHistory(sortedData);
      setLoading(false);
    } else {
      console.log('No sprint history available');
      setSprintHistory([]);
      setLoading(false);
    }
  }, [sprintHistoryProp]);

  const formatChartData = () => {
    return sprintHistory.map(sprint => ({
      name: sprint.sprintName || sprint.sprintId,
      productivity: sprint.productivity || 0,
      velocity: sprint.velocity || 0,
      bugs: sprint.bugCount || 0,
      completedBugs: sprint.completedBugCount || 0,
      completionRate: sprint.totalStoryPoints > 0 
        ? ((sprint.completedStoryPoints / sprint.totalStoryPoints) * 100).toFixed(1)
        : 0
    }));
  };

  if (loading && sprintHistory.length === 0) {
    return <div className="sprint-trends loading">Loading sprint history...</div>;
  }

  return (
    <div className="sprint-trends">
      <div className="sprint-trends-header">
        <h2>Sprint Trends (Last 10 Sprints)</h2>
        <div className="header-info">
          <span className="info-badge">Auto-saved daily when tickets are loaded</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}. Make sure the Lambda function is deployed and DynamoDB is configured.
        </div>
      )}

      {sprintHistory.length === 0 && !loading && (
        <div className="no-data-message">
          No sprint history available yet. Load JIRA tickets to automatically save sprint data and start tracking trends.
        </div>
      )}

      {sprintHistory.length > 0 && (
        <div className="trends-grid">
          <div className="trend-card full-width">
            <h3>Velocity & Completion Rate Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={formatChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis yAxisId="left" orientation="left" stroke="#0052cc" />
                <YAxis yAxisId="right" orientation="right" stroke="#00875a" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="velocity" fill="#0052cc" name="Velocity (Story Points)" />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="completionRate" 
                  stroke="#00875a" 
                  strokeWidth={3}
                  name="Completion Rate (%)"
                  dot={{ fill: '#00875a', r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="chart-inference">
              <strong>What to Infer?</strong> Track team velocity (completed story points) and completion rate over time. Consistent or increasing velocity indicates stable team performance. Completion rate shows planning accuracy.
            </div>
          </div>

          <div className="trend-card full-width">
            <h3>Bug Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={formatChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bugs" fill="#bf2600" name="Total Bugs" />
                <Bar dataKey="completedBugs" fill="#00875a" name="Completed Bugs" />
                <Line 
                  type="monotone" 
                  dataKey="bugs" 
                  stroke="#bf2600" 
                  strokeWidth={2}
                  name="Bug Trend"
                  dot={{ fill: '#bf2600', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="chart-inference">
              <strong>What to Infer?</strong> Monitor bug creation and resolution trends. Increasing bug count may indicate quality issues. Green bars show bug resolution effectiveness.
            </div>
          </div>

          <div className="trend-card full-width">
            <h3>Team Productivity Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formatChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="productivity" 
                  stroke="#6554c0" 
                  strokeWidth={3}
                  name="Productivity (%)"
                  dot={{ fill: '#6554c0', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="chart-inference">
              <strong>What to Infer?</strong> Overall team productivity percentage over sprints. Consistent high productivity indicates effective sprint planning and execution.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SprintTrends;
