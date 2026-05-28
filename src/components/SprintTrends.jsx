import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import './SprintTrends.css';

function SprintTrends({ currentSprintData, sprintHistory: sprintHistoryProp }) {
  const [sprintHistory, setSprintHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState(null);

  useEffect(() => {
    if (sprintHistoryProp && sprintHistoryProp.length > 0) {
      const sortedData = [...sprintHistoryProp].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      setSprintHistory(sortedData);
      setLoading(false);
    } else {
      setSprintHistory([]);
      setLoading(false);
    }
  }, [sprintHistoryProp]);

  // Resolve sprint name — never use date-based labels
  const resolveSprintName = (sprint) => {
    const name = sprint.sprintName || sprint.sprintId || '';
    if (name && !name.match(/^Sprint \d{4}-\d{2}-\d{2}$/)) return name;
    if (sprint.customSprintName) return sprint.customSprintName;
    if (sprint.timestamp) {
      const d = new Date(sprint.timestamp);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }
    return 'Unknown Sprint';
  };

  // Get Monday of the week for a given date
  const getMondayOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon...
    const diff = (day === 0) ? -6 : 1 - day; // adjust to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Format date as "18 May"
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Group daily records into weekly buckets (Mon–Sun), average values
  const groupIntoWeeks = (records) => {
    if (!records || records.length === 0) return [];

    // Build a map: weekKey (Monday ISO date) → array of daily records
    const weekMap = {};

    records.forEach(record => {
      const recordDate = new Date(record.timestamp || record.date);
      const monday = getMondayOfWeek(recordDate);
      const weekKey = monday.toISOString().split('T')[0];

      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          monday,
          records: []
        };
      }
      weekMap[weekKey].records.push(record);
    });

    // Sort weeks chronologically
    const sortedWeeks = Object.values(weekMap).sort((a, b) => a.monday - b.monday);

    // Label weeks as Week 1, Week 2...
    return sortedWeeks.map((week, idx) => {
      const recs = week.records;
      const count = recs.length;

      // Calculate Friday of this week
      const friday = new Date(week.monday);
      friday.setDate(friday.getDate() + 4);

      // Average all daily values
      const avg = (key) => {
        const vals = recs.map(r => Number(r[key] || 0)).filter(v => !isNaN(v));
        return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
      };

      // For completionRate, calculate from averaged SP values
      const avgTotalSP = avg('totalStoryPoints');
      const avgCompletedSP = avg('completedStoryPoints');
      const completionRate = avgTotalSP > 0
        ? parseFloat(((avgCompletedSP / avgTotalSP) * 100).toFixed(1))
        : 0;

      // On hold: average from ticketDetails across all days in week
      const onHoldAvg = recs.reduce((sum, r) => {
        const holds = (r.ticketDetails || []).filter(t => {
          const s = t.status?.toLowerCase() || '';
          return s.includes('hold') || s.includes('blocked');
        }).length;
        return sum + holds;
      }, 0) / count;

      const label = `${formatDate(week.monday)}-${formatDate(friday)})`;

      return {
        name: label,
        weekStart: week.monday,
        weekEnd: friday,
        daysInWeek: count,
        velocity: avg('velocity'),
        completionRate,
        productivity: avg('productivity'),
        bugs: avg('bugCount'),
        completedBugs: avg('completedBugCount'),
        completedTickets: avg('completedTickets'),
        onHoldTickets: parseFloat(onHoldAvg.toFixed(1))
      };
    });
  };

const formatWeeklyChartData = () => {
    // Use ALL records regardless of sprint name — includes old date-based records too
    const validRecords = sprintHistory.filter(s => s.timestamp || s.date);
    if (validRecords.length === 0) return [];

    // Group purely by Mon–Sun calendar week
    const weekMap = {};
    validRecords.forEach(record => {
      const recordDate = new Date(record.timestamp || record.date);
      const monday = getMondayOfWeek(recordDate);
      const weekKey = monday.toISOString().split('T')[0];
      if (!weekMap[weekKey]) weekMap[weekKey] = { monday, records: [] };
      weekMap[weekKey].records.push(record);
    });

    // Sort chronologically, take last 10 weeks
    const last10 = Object.values(weekMap)
      .sort((a, b) => a.monday - b.monday)
      .slice(-10);

    return last10.map((week, idx) => {
      const recs = week.records;
      const count = recs.length;
      const friday = new Date(week.monday);
      friday.setDate(friday.getDate() + 4);

      const avg = (key) => {
        const vals = recs.map(r => Number(r[key] || 0)).filter(v => !isNaN(v));
        return vals.length > 0
          ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
          : 0;
      };

      const avgTotalSP = avg('totalStoryPoints');
      const avgCompletedSP = avg('completedStoryPoints');
      const completionRate = avgTotalSP > 0
        ? parseFloat(((avgCompletedSP / avgTotalSP) * 100).toFixed(1))
        : 0;

      const onHoldAvg = recs.reduce((sum, r) => {
        const holds = (r.ticketDetails || []).filter(t => {
          const s = t.status?.toLowerCase() || '';
          return s.includes('hold') || s.includes('blocked');
        }).length;
        return sum + holds;
      }, 0) / count;

      // Show sprint name in label if whole week belongs to one sprint
      const sprintNames = [...new Set(recs.map(r => resolveSprintName(r)))];
      const sprintLabel = sprintNames.length === 1 ? ` · ${sprintNames[0]}` : '';

      return {
        name: `${formatDate(week.monday)}-${formatDate(friday)}${sprintLabel}`,
        weekStart: week.monday,
        weekEnd: friday,
        daysInWeek: count,
        velocity: avg('velocity'),
        completionRate,
        productivity: avg('productivity'),
        bugs: avg('bugCount'),
        completedBugs: avg('completedBugCount'),
        completedTickets: avg('completedTickets'),
        onHoldTickets: parseFloat(onHoldAvg.toFixed(1))
      };
    });
  };

  const chartData = formatWeeklyChartData();

  // Get unique sprint names for dropdown
  const getUniqueSprints = () => {
    const sprintGroups = {};
    sprintHistory.forEach(record => {
      const name = resolveSprintName(record);
      if (name === 'Unknown Sprint') return;
      if (!sprintGroups[name]) sprintGroups[name] = [];
      sprintGroups[name].push(record);
    });
    return Object.entries(sprintGroups)
      .map(([name, records]) => ({
        name,
        weeks: groupIntoWeeks(records)
      }))
      .reverse();
  };

  if (loading && sprintHistory.length === 0) {
    return <div className="sprint-trends loading">Loading sprint history...</div>;
  }

  return (
    <div className="sprint-trends">
      <div className="sprint-trends-header">
        <h2>Sprint Trends (Weekly View)</h2>
        <div className="header-info">
          <span className="info-badge">Auto-saved daily · Grouped by week (Mon–Sun)</span>
        </div>
      </div>

      {sprintHistory.length === 0 && !loading && (
        <div className="no-data-message">
          No sprint history available yet. Load JIRA tickets to automatically save sprint data and start tracking trends.
        </div>
      )}

      {chartData.length > 0 && (
        <div className="trends-grid">

          {/* Velocity & Completion Rate */}
          <div className="trend-card full-width">
            <h3>Velocity & Completion Rate Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis yAxisId="left" orientation="left" stroke="#0052cc" />
                <YAxis yAxisId="right" orientation="right" stroke="#00875a" domain={[0, 100]} />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'Completion Rate (%)' ? `${value}%` : value,
                    name
                  ]}
                />
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
              <strong>What to Infer?</strong> Weekly average of completed story points and completion rate. Each bar represents the average velocity across all days recorded in that week.
            </div>
          </div>

          {/* Bug Trend */}
          <div className="trend-card full-width">
            <h3>Bug Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
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
              <strong>What to Infer?</strong> Weekly average bug count and resolution. Increasing trend may indicate quality issues.
            </div>
          </div>

          {/* Team Productivity */}
          <div className="trend-card full-width">
            <h3>Team Productivity Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(v) => [`${v}%`, 'Productivity']} />
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
              <strong>What to Infer?</strong> Weekly average team productivity percentage. Consistent high productivity indicates effective sprint execution.
            </div>
          </div>

          {/* Tickets Completed */}
          <div className="trend-card full-width">
            <h3>Tickets Completed Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completedTickets" fill="#00875a" name="Completed Tickets (avg)" />
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
              <strong>What to Infer?</strong> Average tickets completed per week. Steady or increasing bars indicate healthy delivery pace.
            </div>
          </div>

          {/* Tickets on Hold */}
          <div className="trend-card full-width">
            <h3>Tickets on Hold Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="onHoldTickets" fill="#ff991f" name="Tickets on Hold (avg)" />
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
              <strong>What to Infer?</strong> Average on-hold tickets per week. Increasing trend may indicate blockers or dependencies.
            </div>
          </div>
        </div>
      )}

      {/* Sprint Detail View */}
      {getUniqueSprints().length > 0 && (
        <div className="sprint-detail-section">
          <h3>Sprint Detail View</h3>
          <div style={{ marginBottom: '1rem' }}>
            <select
              value={selectedSprint || ''}
              onChange={(e) => setSelectedSprint(e.target.value)}
              style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="">Select a Sprint</option>
              {getUniqueSprints().map((sprint, idx) => (
                <option key={idx} value={sprint.name}>{sprint.name}</option>
              ))}
            </select>
          </div>

          {selectedSprint && (() => {
            const sprint = getUniqueSprints().find(s => s.name === selectedSprint);
            if (!sprint || sprint.weeks.length === 0) return (
              <div style={{ color: '#666', fontSize: '14px' }}>No weekly data available for this sprint.</div>
            );

            return (
              <div>
                <div className="chart-container">
                  <h4>Velocity & Completion Rate — {selectedSprint}</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={sprint.weeks}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="velocity" name="Velocity (Story Points)" fill="#1a56db" />
                      <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Completion Rate (%)" stroke="#16a34a" strokeWidth={2} dot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-container">
                  <h4>Team Productivity — {selectedSprint}</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={sprint.weeks}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="productivity" name="Productivity (%)" stroke="#7c3aed" strokeWidth={2} dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-container">
                  <h4>Tickets Completed — {selectedSprint}</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={sprint.weeks}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completedTickets" name="Completed Tickets (avg)" fill="#16a34a" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-container">
                  <h4>Tickets on Hold — {selectedSprint}</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={sprint.weeks}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="onHoldTickets" name="Tickets on Hold (avg)" fill="#f59e0b" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default SprintTrends;