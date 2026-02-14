import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Line, ComposedChart } from 'recharts';
import './Charts.css';

function Charts({ tickets }) {
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
        productivity: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
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
            <BarChart data={dueDateData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis yAxisId="left" orientation="left" stroke="#0052cc" />
              <YAxis yAxisId="right" orientation="right" stroke="#ff991f" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="tickets" fill="#0052cc" name="Number of Tickets" />
              <Bar yAxisId="right" dataKey="storyPoints" fill="#ff991f" name="Story Points" />
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-inference">
            <strong>What to Infer?</strong> Monitor overdue tickets and workload timing. High overdue counts indicate capacity issues or blockers. Balanced future distribution suggests good sprint planning.
          </div>
        </div>

        <div className="chart-card full-width">
          <h3>Resource Productivity</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={resourceProductivityData()}>
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
              <Bar yAxisId="left" dataKey="totalPoints" fill="#0052cc" name="Total Story Points" />
              <Bar yAxisId="left" dataKey="completedPoints" fill="#00875a" name="Completed Points" />
              <Bar yAxisId="left" dataKey="target" fill="#ff991f" name="Target (14 days × 3 pts/day)" />
              <Bar yAxisId="right" dataKey="tickets" fill="#6554c0" name="Number of Tickets" />
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-inference">
            <strong>What to Infer?</strong> Compare team member workload and completion rates. Green bars show progress vs total (blue). Compare against target (orange) to identify over/under allocation. High ticket count with low points may indicate task fragmentation.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Charts;
