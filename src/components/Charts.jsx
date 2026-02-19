import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Line, ComposedChart, ScatterChart, Scatter, ZAxis } from 'recharts';
import './Charts.css';

function Charts({ tickets }) {
  const [selectedEpic, setSelectedEpic] = useState(null);

  const getStoryPointValue = (ticket) => {
    const fields = ticket.fields;
    
    // Check the actual story points fields based on console output
    const fieldsToCheck = [
      'customfield_10058',  // This appears to be the correct field
      'customfield_10202',  // Alternative field
      'customfield_10005',
      'customfield_10308',
      'customfield_10016',
      'customfield_10026',
      'customfield_10036',
      'customfield_10106',
      'customfield_10002',
      'customfield_10004',
      'storyPoints'
    ];
    
    for (const fieldName of fieldsToCheck) {
      if (fields[fieldName] !== null && fields[fieldName] !== undefined) {
        const value = Number(fields[fieldName]);
        if (!isNaN(value)) {
          return value;
        }
      }
    }
    
    return 0;
  };

  const getDueDateStatus = (dateString) => {
    if (!dateString) return 'No Due Date';
    
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today) return 'Overdue';
    if (dueDate.getTime() === today.getTime()) return 'Due Today';
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDate.getTime() === tomorrow.getTime()) return 'Due Tomorrow';
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    if (dueDate <= nextWeek) return 'This Week';
    
    return 'Future';
  };

  // Chart 1: Story Points Distribution
  const storyPointsData = () => {
    const ranges = {
      '0': { count: 0, points: 0 },
      '1-3': { count: 0, points: 0 },
      '4-8': { count: 0, points: 0 },
      '9-13': { count: 0, points: 0 },
      '14+': { count: 0, points: 0 }
    };

    tickets.forEach(ticket => {
      const points = getStoryPointValue(ticket);
      if (points === 0) {
        ranges['0'].count++;
      } else if (points <= 3) {
        ranges['1-3'].count++;
        ranges['1-3'].points += points;
      } else if (points <= 8) {
        ranges['4-8'].count++;
        ranges['4-8'].points += points;
      } else if (points <= 13) {
        ranges['9-13'].count++;
        ranges['9-13'].points += points;
      } else {
        ranges['14+'].count++;
        ranges['14+'].points += points;
      }
    });

    return Object.entries(ranges).map(([range, data]) => ({
      range,
      tickets: data.count,
      storyPoints: data.points
    }));
  };

  // Chart 2: Due Date Distribution
  const dueDateData = () => {
    const distribution = {};

    tickets.forEach(ticket => {
      const status = getDueDateStatus(ticket.fields.duedate);
      if (!distribution[status]) {
        distribution[status] = { count: 0, points: 0 };
      }
      distribution[status].count++;
      distribution[status].points += getStoryPointValue(ticket);
    });

    return Object.entries(distribution).map(([status, data]) => ({
      status,
      tickets: data.count,
      storyPoints: data.points
    }));
  };

  // Chart 3: Resource Productivity
  const resourceProductivityData = () => {
    const resources = {};
    const sprintDays = 14; // Total sprint duration
    const pointsPerDay = 3;
    const targetPerResource = sprintDays * pointsPerDay;

    tickets.forEach(ticket => {
      const assignee = ticket.fields.assignee?.displayName || 'Unassigned';
      const points = getStoryPointValue(ticket);
      const status = ticket.fields.status?.name?.toLowerCase() || '';
      const isCompleted = status.includes('done') || status.includes('complete');

      if (!resources[assignee]) {
        resources[assignee] = {
          total: 0,
          completed: 0,
          tickets: 0
        };
      }

      resources[assignee].total += points;
      resources[assignee].tickets++;
      if (isCompleted) {
        resources[assignee].completed += points;
      }
    });

    return Object.entries(resources)
      .map(([name, data]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        totalPoints: data.total,
        completedPoints: data.completed,
        tickets: data.tickets,
        target: targetPerResource,
        productivity: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        isBelowTarget: data.total < targetPerResource
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  };

  const getEpicName = (ticket) => {
    const fields = ticket.fields;
    return fields.customfield_10014?.name || 
           fields.customfield_10008?.name ||
           fields.epic?.name ||
           fields.parent?.fields?.summary ||
           'No Epic';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Chart 4: Epic vs Story Points
  const epicStoryPointsData = () => {
    const epics = {};

    tickets.forEach(ticket => {
      const epicName = getEpicName(ticket);
      const points = getStoryPointValue(ticket);

      if (!epics[epicName]) {
        epics[epicName] = {
          storyPoints: 0,
          ticketCount: 0
        };
      }

      epics[epicName].storyPoints += points;
      epics[epicName].ticketCount++;
    });

    return Object.entries(epics)
      .map(([name, data]) => ({
        epic: name.length > 30 ? name.substring(0, 30) + '...' : name,
        storyPoints: data.storyPoints
      }))
      .sort((a, b) => b.storyPoints - a.storyPoints);
  };

  // Chart 5: Epic vs Ticket Count
  const epicTicketCountData = () => {
    const epics = {};

    tickets.forEach(ticket => {
      const epicName = getEpicName(ticket);

      if (!epics[epicName]) {
        epics[epicName] = 0;
      }

      epics[epicName]++;
    });

    return Object.entries(epics)
      .map(([name, count]) => ({
        epic: name.length > 30 ? name.substring(0, 30) + '...' : name,
        tickets: count
      }))
      .sort((a, b) => b.tickets - a.tickets);
  };

  // Chart 6: Resources per Epic (Bubble Chart)
  const resourcesPerEpicData = () => {
    const epicResources = {};
    const epicTickets = {};

    tickets.forEach(ticket => {
      const epicName = getEpicName(ticket);
      const assignee = ticket.fields.assignee?.displayName;

      // Count resources
      if (!epicResources[epicName]) {
        epicResources[epicName] = new Set();
      }
      if (assignee) {
        epicResources[epicName].add(assignee);
      }

      // Count tickets
      if (!epicTickets[epicName]) {
        epicTickets[epicName] = 0;
      }
      epicTickets[epicName]++;
    });

    return Object.entries(epicResources)
      .map(([name, resourceSet], index) => ({
        name: name.length > 25 ? name.substring(0, 25) + '...' : name,
        fullName: name,
        x: index + 1,
        y: resourceSet.size,
        z: epicTickets[name] || 0
      }))
      .sort((a, b) => b.y - a.y);
  };

  // Get users for selected epic
  const getUsersByEpic = (epicName) => {
    const users = new Set();
    
    tickets.forEach(ticket => {
      const ticketEpic = getEpicName(ticket);
      const assignee = ticket.fields.assignee?.displayName;
      
      if (ticketEpic === epicName && assignee) {
        users.add(assignee);
      }
    });
    
    return Array.from(users).sort();
  };

  // Handle bubble click
  const handleBubbleClick = (data) => {
    if (data && data.payload && data.payload.fullName) {
      setSelectedEpic(data.payload.fullName);
    }
  };

  const getResourceTableData = () => {
    // Get all unique assignees from all tickets
    const allAssignees = new Set();
    tickets.forEach(ticket => {
      const assignee = ticket.fields.assignee?.displayName;
      if (assignee) {
        allAssignees.add(assignee);
      }
    });

    // Get tickets in progress
    const inProgressTickets = tickets
      .filter(ticket => {
        const status = ticket.fields.status?.name?.toLowerCase() || '';
        return status.includes('in progress');
      })
      .map(ticket => ({
        resource: ticket.fields.assignee?.displayName || 'Unassigned',
        ticketId: ticket.key,
        epic: getEpicName(ticket),
        description: ticket.fields.summary,
        dueDate: formatDate(ticket.fields.duedate),
        storyPoints: getStoryPointValue(ticket),
        hasTickets: true
      }));

    // Count tickets per resource
    const ticketCountByResource = {};
    inProgressTickets.forEach(ticket => {
      ticketCountByResource[ticket.resource] = (ticketCountByResource[ticket.resource] || 0) + 1;
    });

    // Add highlight flag for resources with 2+ tickets
    const ticketsWithHighlight = inProgressTickets.map(ticket => ({
      ...ticket,
      shouldHighlight: ticketCountByResource[ticket.resource] >= 2
    }));

    // Find assignees with no in-progress tickets
    const assigneesWithTickets = new Set(inProgressTickets.map(t => t.resource));
    const assigneesWithoutTickets = Array.from(allAssignees)
      .filter(assignee => !assigneesWithTickets.has(assignee))
      .map(assignee => ({
        resource: assignee,
        ticketId: '-',
        epic: '-',
        description: 'No tickets in progress',
        dueDate: '-',
        storyPoints: '-',
        hasTickets: false,
        shouldHighlight: false
      }));

    // Combine and sort
    return [...ticketsWithHighlight, ...assigneesWithoutTickets]
      .sort((a, b) => {
        // Sort by hasTickets first (true before false), then by resource name
        if (a.hasTickets !== b.hasTickets) {
          return b.hasTickets ? 1 : -1;
        }
        return a.resource.localeCompare(b.resource);
      });
  };

  // Resource Quality: Bug count by resource
  const resourceQualityData = () => {
    const resources = {};

    tickets.forEach(ticket => {
      const assignee = ticket.fields.assignee?.displayName || 'Unassigned';
      const issueType = ticket.fields.issuetype?.name?.toLowerCase() || '';
      const isBug = issueType.includes('bug');
      const status = ticket.fields.status?.name?.toLowerCase() || '';
      const isCompleted = status.includes('done') || status.includes('complete');

      if (!resources[assignee]) {
        resources[assignee] = {
          totalBugs: 0,
          completedBugs: 0,
          openBugs: 0
        };
      }

      if (isBug) {
        resources[assignee].totalBugs++;
        if (isCompleted) {
          resources[assignee].completedBugs++;
        } else {
          resources[assignee].openBugs++;
        }
      }
    });

    return Object.entries(resources)
      .filter(([name, data]) => data.totalBugs > 0) // Only show resources with bugs
      .map(([name, data]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        totalBugs: data.totalBugs,
        completedBugs: data.completedBugs,
        openBugs: data.openBugs
      }))
      .sort((a, b) => b.totalBugs - a.totalBugs);
  };

  const COLORS = ['#0052cc', '#00875a', '#ff991f', '#bf2600', '#6554c0', '#00b8d9'];

  return (
    <div className="charts">
      <h2>Charts & Insights</h2>
      
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Story Points Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={storyPointsData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis yAxisId="left" orientation="left" stroke="#0052cc" />
              <YAxis yAxisId="right" orientation="right" stroke="#00875a" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="tickets" fill="#0052cc" name="Number of Tickets" />
              <Bar yAxisId="right" dataKey="storyPoints" fill="#00875a" name="Story Points" />
              <Line yAxisId="right" type="monotone" dataKey="storyPoints" stroke="#bf2600" strokeWidth={2} name="Trend" dot={{ fill: '#bf2600', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="chart-inference">
            <strong>What to Infer?</strong> Check if tickets are properly sized. High concentration in 0 points suggests missing estimates. Balanced distribution across ranges indicates healthy sprint planning.
          </div>
        </div>

        <div className="chart-card">
          <h3>Due Date Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={dueDateData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis yAxisId="left" orientation="left" stroke="#0052cc" />
              <YAxis yAxisId="right" orientation="right" stroke="#ff991f" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="tickets" fill="#0052cc" name="Number of Tickets" />
              <Bar yAxisId="right" dataKey="storyPoints" fill="#ff991f" name="Story Points" />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="tickets" 
                stroke="#bf2600" 
                strokeWidth={2}
                name="Ticket Trend"
                dot={{ fill: '#bf2600', r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="chart-inference">
            <strong>What to Infer?</strong> Monitor overdue tickets and workload timing. High overdue counts indicate capacity issues or blockers. Balanced future distribution suggests good sprint planning.
          </div>
        </div>

        <div className="chart-card full-width">
          <h3>Resource Productivity</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={resourceProductivityData()}>
              <defs>
                <pattern id="redStripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                  <rect width="8" height="8" fill="#0052cc" />
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#bf2600" strokeWidth="4" />
                </pattern>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                interval={0}
              />
              <YAxis yAxisId="left" orientation="left" stroke="#0052cc" />
              <YAxis yAxisId="right" orientation="right" stroke="#6554c0" />
              <Tooltip />
              <Legend />
              <Bar 
                yAxisId="left" 
                dataKey="totalPoints" 
                name="Total Story Points"
                shape={(props) => {
                  const { fill, x, y, width, height, payload } = props;
                  const finalFill = payload.isBelowTarget ? 'url(#redStripes)' : fill;
                  return <rect x={x} y={y} width={width} height={height} fill={finalFill} />;
                }}
                fill="#0052cc"
              />
              <Bar yAxisId="left" dataKey="completedPoints" fill="#00875a" name="Completed Points" />
              <Bar yAxisId="left" dataKey="target" fill="#ff991f" name="Target (14 days × 3 pts/day)" />
              <Bar yAxisId="right" dataKey="tickets" fill="#6554c0" name="Number of Tickets" />
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-inference">
            <strong>What to Infer?</strong> Compare team member workload and completion rates. Green bars show progress vs total (blue). Blue bars with red stripes indicate users below target capacity. Compare against target (orange) to identify over/under allocation. High ticket count (purple) with low points may indicate task fragmentation.
          </div>

          <div className="resource-table-container">
            <h4>In Progress Tickets by Resource</h4>
            <div className="table-wrapper">
              <table className="resource-table">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Ticket ID</th>
                    <th>Epic</th>
                    <th>Description</th>
                    <th>Due Date</th>
                    <th>Story Points</th>
                  </tr>
                </thead>
                <tbody>
                  {getResourceTableData().length > 0 ? (
                    getResourceTableData().map((row, index) => (
                      <tr 
                        key={index} 
                        className={`${!row.hasTickets ? 'no-tickets-row' : ''} ${row.shouldHighlight ? 'highlight-row' : ''}`}
                      >
                        <td>{row.resource}</td>
                        <td>
                          {row.ticketId !== '-' ? (
                            <a 
                              href={`https://highwirepress.atlassian.net/browse/${row.ticketId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ticket-link"
                            >
                              {row.ticketId}
                            </a>
                          ) : (
                            row.ticketId
                          )}
                        </td>
                        <td>{row.epic}</td>
                        <td className="description-cell">{row.description}</td>
                        <td>{row.dueDate}</td>
                        <td className="points-cell">{row.storyPoints}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#5e6c84' }}>
                        No resources found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="chart-inference">
              <strong>What to Infer?</strong> Monitor active work distribution across the team. Yellow highlighted rows indicate resources with 2+ tickets in progress, which may signal multitasking or potential bottlenecks. Red rows show resources with no active work who may be available for new assignments. Check due dates to identify urgent items requiring attention.
            </div>
          </div>
        </div>

        <div className="chart-card full-width">
          <h3>Resource Quality</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={resourceQualityData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalBugs" fill="#bf2600" name="Total Bugs" />
              <Bar dataKey="completedBugs" fill="#00875a" name="Completed Bugs" />
              <Bar dataKey="openBugs" fill="#ff991f" name="Open Bugs" />
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-inference">
            <strong>What to Infer?</strong> Track bug distribution across team members. High bug counts may indicate areas needing code review or additional testing. Green bars show bug resolution effectiveness. Orange bars highlight outstanding bugs requiring attention.
          </div>
        </div>

        <div className="chart-card full-width">
          <h3>Epic vs Story Points</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={epicStoryPointsData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="epic" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="storyPoints" fill="#00875a" name="Story Points" />
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-inference">
            <strong>What to Infer?</strong> Identify which epics have the most story points allocated. This helps prioritize epic-level work and understand where the team's effort is concentrated.
          </div>
        </div>

        <div className="chart-card full-width">
          <h3>Epic vs Ticket Count</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={epicTicketCountData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="epic" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tickets" fill="#0052cc" name="Number of Tickets" />
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-inference">
            <strong>What to Infer?</strong> Shows ticket distribution across epics. High ticket count with low story points (from previous chart) may indicate many small tasks or missing estimates.
          </div>
        </div>

        <div className="chart-card resources-epic-container">
          <div className="resources-epic-content">
            <div className="user-list-panel">
              <h4>Resources by Epic</h4>
              {selectedEpic ? (
                <>
                  <div className="selected-epic-header">
                    <strong>{selectedEpic}</strong>
                    <button 
                      className="clear-selection-btn" 
                      onClick={() => setSelectedEpic(null)}
                      title="Clear selection"
                    >
                      ×
                    </button>
                  </div>
                  <ul className="user-list">
                    {getUsersByEpic(selectedEpic).map((user, index) => (
                      <li key={index} className="user-item">{user}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="no-selection">
                  Click on an epic bar to see resources
                </div>
              )}
            </div>
            
            <div className="chart-section">
              <h3>Resources per Epic</h3>
              <ResponsiveContainer width="100%" height={450}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 100, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="category" 
                    dataKey="name" 
                    name="Epic"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Resources"
                    label={{ value: 'Number of Resources', angle: -90, position: 'insideLeft' }}
                  />
                  <ZAxis 
                    type="number" 
                    dataKey="z" 
                    range={[100, 1000]} 
                    name="Tickets"
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="custom-tooltip">
                            <p><strong>{data.fullName}</strong></p>
                            <p>Resources: {data.y}</p>
                            <p>Tickets: {data.z}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Scatter 
                    name="Epics" 
                    data={resourcesPerEpicData()} 
                    onClick={handleBubbleClick}
                    cursor="pointer"
                  >
                    {resourcesPerEpicData().map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="chart-inference">
                <strong>What to Infer?</strong> Bubble chart showing resources per epic. Y-axis shows number of resources, bubble size represents ticket count. Click on a bubble to see the list of resources. Helps identify epic ownership and resource distribution across initiatives.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Charts;
