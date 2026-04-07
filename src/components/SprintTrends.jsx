import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import './SprintTrends.css';

function SprintTrends({ currentSprintData, sprintHistory: sprintHistoryProp }) {
  const [sprintHistory, setSprintHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);

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
    const cleanHistory = [...sprintHistory]
      .sort((a, b) => new Date(a.timestamp || a.date || a.sprintName) - 
                      new Date(b.timestamp || b.date || b.sprintName))
      .filter(s => {
        const velocity = s.velocity || s.completedPoints || s.storyPoints || 0;
        const completed = s.completedTickets || s.ticketsCompleted || 0;
        return velocity <= 200 && completed <= 85;
      });

    return cleanHistory.map(sprint => {
      // Calculate on hold tickets from ticket details
      const onHoldTickets = sprint.ticketDetails?.filter(ticket => 
        ticket.status?.toLowerCase().includes('hold') || 
        ticket.status?.toLowerCase().includes('blocked')
      ).length || 0;

      return {
        name: sprint.sprintName || sprint.sprintId,
        productivity: sprint.productivity || 0,
        velocity: sprint.velocity || 0,
        bugs: sprint.bugCount || 0,
        completedBugs: sprint.completedBugCount || 0,
        completionRate: sprint.totalStoryPoints > 0 
          ? ((sprint.completedStoryPoints / sprint.totalStoryPoints) * 100).toFixed(1)
          : 0,
        completedTickets: sprint.completedTickets || 0,
        onHoldTickets: onHoldTickets
      };
    });
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

          <div className="trend-card full-width">
            <h3>Tickets Completed Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={formatChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completedTickets" fill="#00875a" name="Completed Tickets" />
                <Line 
                  type="monotone" 
                  dataKey="completedTickets" 
                  stroke="#00875a" 
                  strokeWidth={2}
                  name="Completion Trend"
                  dot={{ fill: '#00875a', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="chart-inference">
              <strong>What to Infer?</strong> Track the number of tickets completed per sprint. Consistent or increasing completion indicates steady team throughput and delivery capacity.
            </div>
          </div>

          <div className="trend-card full-width">
            <h3>Tickets on Hold Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={formatChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="onHoldTickets" fill="#ff991f" name="Tickets on Hold" />
                <Line 
                  type="monotone" 
                  dataKey="onHoldTickets" 
                  stroke="#ff991f" 
                  strokeWidth={2}
                  name="On Hold Trend"
                  dot={{ fill: '#ff991f', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="chart-inference">
              <strong>What to Infer?</strong> Monitor tickets that are blocked or on hold. Increasing trend may indicate dependencies, blockers, or process bottlenecks that need attention.
            </div>
          </div>
        </div>
      )}

      {sprintHistory.length > 0 && (() => {
        const dateMap = {
          "2026-03-19": "AIML Sprint 39",
          "2026-03-20": "AIML Sprint 39",
          "2026-03-23": "AIML Sprint 39",
          "2026-03-24": "AIML Sprint 40",
          "2026-03-25": "AIML Sprint 40",
          "2026-03-26": "AIML Sprint 40",
          "2026-03-27": "AIML Sprint 40",
          "2026-03-30": "AIML Sprint 40",
          "2026-03-31": "AIML Sprint 40",
          "2026-04-01": "AIML Sprint 40",
          "2026-04-02": "AIML Sprint 40",
          "2026-04-03": "AIML Sprint 40"
        };

        const getSprintName = (sprint) => {
          const dateKey = sprint.date || sprint.timestamp?.split('T')[0];
          if (dateMap[dateKey]) return dateMap[dateKey];
          if (sprint.sprintName && !sprint.sprintName.startsWith('Sprint 20')) return sprint.sprintName;
          return null;
        };

        const sprintGroups = {};
        sprintHistory.forEach(sprint => {
          const name = getSprintName(sprint);
          if (!name) return;
          if (!sprintGroups[name]) {
            sprintGroups[name] = {
              name,
              velocity: 0,
              completedTickets: 0,
              productivity: 0,
              onHoldTickets: 0,
              count: 0,
              latestTimestamp: sprint.timestamp
            };
          }
          const current = sprintGroups[name];
          if (new Date(sprint.timestamp) > new Date(current.latestTimestamp)) {
            current.velocity = sprint.velocity || 0;
            current.completedTickets = sprint.completedTickets || 0;
            current.productivity = sprint.productivity || 0;
            current.onHoldTickets = (sprint.ticketDetails || []).filter(t => {
              const s = t.status?.toLowerCase() || '';
              return s.includes('hold') || s.includes('blocked');
            }).length;
            current.latestTimestamp = sprint.timestamp;
            current.completionRate = sprint.totalStoryPoints > 0
              ? parseFloat(((sprint.completedStoryPoints / sprint.totalStoryPoints) * 100).toFixed(1))
              : 0;
          }
        });

        const uniqueSprints = Object.values(sprintGroups).reverse();

        return (
          <div className="sprint-detail-section">
            <h3>Sprint Detail View</h3>
            <div style={{ marginBottom: '1rem' }}>
              <select
                value={selectedSprint || ''}
                onChange={(e) => setSelectedSprint(e.target.value)}
                style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ccc' }}
              >
                <option value="">Select a Sprint</option>
                {uniqueSprints.map((sprint, index) => (
                  <option key={index} value={sprint.name}>{sprint.name}</option>
                ))}
              </select>
            </div>

            {selectedSprint && (() => {
              const sprint = uniqueSprints.find(s => s.name === selectedSprint);
              if (!sprint) return null;
              const chartData = [{ name: sprint.name, ...sprint }];
              return (
                <div>
                  <div className="chart-container">
                    <h4>Velocity & Completion Rate</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="velocity" name="Velocity (Story Points)" fill="#1a56db" />
                        <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Completion Rate (%)" stroke="#16a34a" strokeWidth={2} dot={{ r: 5 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-container">
                    <h4>Team Productivity</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="productivity" name="Productivity (%)" stroke="#7c3aed" strokeWidth={2} dot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-container">
                    <h4>Tickets Completed</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="completedTickets" name="Completed Tickets" fill="#16a34a" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-container">
                    <h4>Tickets on Hold</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="onHoldTickets" name="Tickets on Hold" fill="#f59e0b" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}

export default SprintTrends;
