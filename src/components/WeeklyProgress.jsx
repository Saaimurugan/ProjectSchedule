import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Cell
} from 'recharts';

function WeeklyProgress({ tickets }) {
  // CRITICAL: Check for empty/null tickets BEFORE using them
  if (!tickets || tickets.length === 0) {
    return null;
  }

  console.log('WeeklyProgress received tickets:', tickets?.length, tickets?.[0]?.key);
  const [chartType, setChartType] = useState('weekly'); // 'weekly', 'developer', or 'storyPoints'
  const [selectedDeveloper, setSelectedDeveloper] = useState(null);

  // Extract story points from ticket (Jira custom field)
  const getStoryPoints = (ticket) => {
    return ticket.fields?.customfield_10016 || ticket.fields?.storyPoints || 0;
  };

  // Check if ticket is completed
  const isCompleted = (ticket) => {
    const status = ticket.fields.status?.name?.toLowerCase() || '';
    return status.includes('done') || status.includes('complete');
  };

  // Get unique developers
  const getDevelopers = () => {
    return [...new Set(
      tickets
        .filter(t => t.fields.assignee?.displayName)
        .map(t => t.fields.assignee.displayName)
    )].sort();
  };

  // Constants for story points
  const STORY_POINTS_PER_DAY = 3;
  const STORY_POINTS_PER_WEEK = STORY_POINTS_PER_DAY * 5; // 15

  // Get this week's days (Mon-Fri)
  const getThisWeekDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonday = getMondayOfWeek(today);

    const days = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(currentMonday);
      date.setDate(date.getDate() + i);
      days.push({
        date,
        label: `${formatDate(date, 'day')} ${formatDate(date)}`,
        dayName: new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })
      });
    }
    return days;
  };

  // Check if ticket is due on a specific day
  const isTicketDueOnDay = (ticket, day) => {
    if (!ticket.fields.duedate) return false;
    const ticketDate = new Date(ticket.fields.duedate);
    ticketDate.setHours(0, 0, 0, 0);
    return ticketDate.getTime() === day.date.getTime();
  };

  // Get story points for a specific day and developer
  const getDayStoryPoints = (day, developer = null) => {
    const dayTickets = tickets.filter(t => {
      if (!isTicketDueOnDay(t, day)) return false;
      if (developer && t.fields.assignee?.displayName !== developer) return false;
      return true;
    });

    const completed = dayTickets.filter(t => isCompleted(t));
    const pending = dayTickets.filter(t => !isCompleted(t));

    const completedPoints = completed.reduce((sum, t) => sum + getStoryPoints(t), 0);
    const pendingPoints = pending.reduce((sum, t) => sum + getStoryPoints(t), 0);

    return {
      completed: completedPoints,
      pending: pendingPoints,
      total: completedPoints + pendingPoints,
      completedCount: completed.length,
      pendingCount: pending.length,
      tickets: dayTickets
    };
  };

  // Calculate weekly totals for story points
  const getWeeklyStoryPointTotals = (developer = null) => {
    const days = getThisWeekDays();
    let totalCompleted = 0;
    let totalPending = 0;

    days.forEach(day => {
      const dayStats = getDayStoryPoints(day, developer);
      totalCompleted += dayStats.completed;
      totalPending += dayStats.pending;
    });

    return {
      completed: totalCompleted,
      pending: totalPending,
      total: totalCompleted + totalPending
    };
  };

  // Get Monday of the week for a given date
  const getMondayOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Format date as "2 Jun"
  const formatDate = (date, format = 'short') => {
    if (format === 'day') {
      return new Date(date).toLocaleDateString('en-GB', { weekday: 'short' });
    }
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Generate last 4 weeks (Mon-Fri)
  const getLast4Weeks = () => {
    const weeks = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonday = getMondayOfWeek(today);

    for (let i = 3; i >= 0; i--) {
      const monday = new Date(currentMonday);
      monday.setDate(monday.getDate() - i * 7);

      const friday = new Date(monday);
      friday.setDate(friday.getDate() + 4);

      weeks.push({
        monday,
        friday,
        label: `${formatDate(monday)}-${formatDate(friday)}`
      });
    }
    return weeks;
  };

  // Check if a date falls within a week (Mon-Fri)
  const isInWeek = (dateString, monday, friday) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date >= monday && date <= friday;
  };

  const weeks = getLast4Weeks();

  // Get all unique developers (excluding Unassigned)
  const developers = [...new Set(
    tickets
      .filter(t => t.fields.assignee?.displayName)
      .map(t => t.fields.assignee.displayName)
  )].sort();

  // Calculate stats per developer per week
  const getWeekStats = (developer, week) => {
    const weekTickets = tickets.filter(t => {
      const assignee = t.fields.assignee?.displayName;
      return assignee === developer && isInWeek(t.fields.duedate, week.monday, week.friday);
    });

    const completed = weekTickets.filter(t => {
      const status = t.fields.status?.name?.toLowerCase() || '';
      return status.includes('done') || status.includes('complete');
    }).length;

    const total = weekTickets.length;
    const pending = total - completed;

    return { completed, pending, total, tickets: weekTickets };
  };

  // Calculate row totals
  const getDevTotals = (developer) => {
    const devTickets = tickets.filter(t => t.fields.assignee?.displayName === developer);
    const completed = devTickets.filter(t => {
      const status = t.fields.status?.name?.toLowerCase() || '';
      return status.includes('done') || status.includes('complete');
    }).length;
    return { completed, pending: devTickets.length - completed, total: devTickets.length };
  };

  // Calculate column totals
  const getWeekTotals = (week) => {
    const weekTickets = tickets.filter(t => isInWeek(t.fields.duedate, week.monday, week.friday));
    const completed = weekTickets.filter(t => {
      const status = t.fields.status?.name?.toLowerCase() || '';
      return status.includes('done') || status.includes('complete');
    }).length;
    return { completed, pending: weekTickets.length - completed, total: weekTickets.length };
  };

  // Prepare chart data for weekly overview
  const getWeeklyChartData = () => {
    return weeks.map((week, idx) => {
      const totals = getWeekTotals(week);
      return {
        week: `Week ${idx + 1}`,
        label: week.label,
        completed: totals.completed,
        pending: totals.pending,
        total: totals.total
      };
    });
  };

  // Prepare chart data for developer breakdown
  const getDeveloperChartData = () => {
    const data = [];
    developers.forEach(dev => {
      const devData = { name: dev };
      weeks.forEach((week, idx) => {
        const stats = getWeekStats(dev, week);
        devData[`week${idx}Completed`] = stats.completed;
        devData[`week${idx}Pending`] = stats.pending;
        devData[`week${idx}Total`] = stats.total;
      });
      data.push(devData);
    });
    return data;
  };

  const weeklyData = getWeeklyChartData();
  const developerData = getDeveloperChartData();

  // Color scheme
  const colors = {
    completed: '#00875a',
    pending: '#ff991f',
    total: '#0052cc'
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#172b4d', margin: 0 }}>
          Weekly Progress Report
        </h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setChartType('storyPoints')}
            style={{
              padding: '6px 12px',
              background: chartType === 'storyPoints' ? '#0052cc' : '#e8eaf6',
              color: chartType === 'storyPoints' ? 'white' : '#172b4d',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: chartType === 'storyPoints' ? '600' : '500',
              fontSize: '12px'
            }}
          >
            Story Points
          </button>
          <button
            onClick={() => setChartType('weekly')}
            style={{
              padding: '6px 12px',
              background: chartType === 'weekly' ? '#0052cc' : '#e8eaf6',
              color: chartType === 'weekly' ? 'white' : '#172b4d',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: chartType === 'weekly' ? '600' : '500',
              fontSize: '12px'
            }}
          >
            Weekly Overview
          </button>
          <button
            onClick={() => setChartType('developer')}
            style={{
              padding: '6px 12px',
              background: chartType === 'developer' ? '#0052cc' : '#e8eaf6',
              color: chartType === 'developer' ? 'white' : '#172b4d',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: chartType === 'developer' ? '600' : '500',
              fontSize: '12px'
            }}
          >
            By Developer
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '1rem', fontSize: '12px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: colors.completed, borderRadius: '2px', display: 'inline-block' }}></span>
          Completed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: colors.pending, borderRadius: '2px', display: 'inline-block' }}></span>
          Pending
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: colors.total, borderRadius: '2px', display: 'inline-block' }}></span>
          Total
        </span>
      </div>

      {/* STORY POINTS TRACKER VIEW */}
      {chartType === 'storyPoints' && (
        <div>
          {/* Developer Filter */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedDeveloper(null)}
              style={{
                padding: '6px 12px',
                background: selectedDeveloper === null ? '#0052cc' : '#e8eaf6',
                color: selectedDeveloper === null ? 'white' : '#172b4d',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: selectedDeveloper === null ? '600' : '500',
                fontSize: '12px'
              }}
            >
              All Team
            </button>
            {getDevelopers().map(dev => (
              <button
                key={dev}
                onClick={() => setSelectedDeveloper(dev)}
                style={{
                  padding: '6px 12px',
                  background: selectedDeveloper === dev ? '#0052cc' : '#e8eaf6',
                  color: selectedDeveloper === dev ? 'white' : '#172b4d',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: selectedDeveloper === dev ? '600' : '500',
                  fontSize: '12px'
                }}
              >
                {dev}
              </button>
            ))}
          </div>

          {/* Weekly Summary Cards */}
          {(() => {
            const weeklyTotals = getWeeklyStoryPointTotals(selectedDeveloper);
            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                marginBottom: '2rem'
              }}>
                <div style={{
                  background: '#f1f2f4',
                  padding: '12px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  border: '1px solid #dfe1e6'
                }}>
                  <div style={{ fontSize: '11px', color: '#626f86', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                    Completed
                  </div>
                  <div style={{ fontSize: '24px', color: '#00875a', fontWeight: '700' }}>
                    {weeklyTotals.completed}
                  </div>
                  <div style={{ fontSize: '11px', color: '#626f86', marginTop: '4px' }}>
                    of {STORY_POINTS_PER_WEEK}
                  </div>
                </div>

                <div style={{
                  background: '#f1f2f4',
                  padding: '12px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  border: '1px solid #dfe1e6'
                }}>
                  <div style={{ fontSize: '11px', color: '#626f86', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                    Pending
                  </div>
                  <div style={{ fontSize: '24px', color: '#ff991f', fontWeight: '700' }}>
                    {weeklyTotals.pending}
                  </div>
                  <div style={{ fontSize: '11px', color: '#626f86', marginTop: '4px' }}>
                    Remaining
                  </div>
                </div>

                <div style={{
                  background: '#f1f2f4',
                  padding: '12px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  border: '1px solid #dfe1e6'
                }}>
                  <div style={{ fontSize: '11px', color: '#626f86', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                    Progress
                  </div>
                  <div style={{ fontSize: '24px', color: '#0052cc', fontWeight: '700' }}>
                    {Math.round((weeklyTotals.completed / STORY_POINTS_PER_WEEK) * 100)}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#626f86', marginTop: '4px' }}>
                    of weekly goal
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Daily Breakdown Table */}
          <div style={{
            overflowX: 'auto',
            border: '1px solid #dfe1e6',
            borderRadius: '6px'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ background: '#f7f8f9', borderBottom: '2px solid #dfe1e6' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#172b4d' }}>
                    Day
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#172b4d' }}>
                    Completed
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#172b4d' }}>
                    Pending
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#172b4d' }}>
                    Total
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#172b4d' }}>
                    Target: {STORY_POINTS_PER_DAY}
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#172b4d' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {getThisWeekDays().map((day, idx) => {
                  const dayStats = getDayStoryPoints(day, selectedDeveloper);
                  const isOnTrack = dayStats.total >= STORY_POINTS_PER_DAY;
                  const isComplete = dayStats.total === STORY_POINTS_PER_DAY && dayStats.pending === 0;

                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #dfe1e6',
                        background: isComplete ? '#dffcf0' : isOnTrack ? '#fffacd' : '#fff'
                      }}
                    >
                      <td style={{ padding: '12px', color: '#172b4d', fontWeight: '500' }}>
                        {day.label}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#00875a', fontWeight: '600' }}>
                        {dayStats.completed}
                        <span style={{ fontSize: '11px', color: '#626f86', display: 'block' }}>
                          ({dayStats.completedCount})
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#ff991f', fontWeight: '600' }}>
                        {dayStats.pending}
                        <span style={{ fontSize: '11px', color: '#626f86', display: 'block' }}>
                          ({dayStats.pendingCount})
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#0052cc', fontWeight: '600' }}>
                        {dayStats.total}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#626f86' }}>
                        {STORY_POINTS_PER_DAY}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {isComplete ? (
                          <span style={{
                            background: '#00875a',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            ✓ Complete
                          </span>
                        ) : isOnTrack ? (
                          <span style={{
                            background: '#fff7d6',
                            color: '#7f5f01',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            On Track
                          </span>
                        ) : (
                          <span style={{
                            background: '#ffeceb',
                            color: '#ae2a19',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            Behind
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {(() => {
                  const weeklyTotals = getWeeklyStoryPointTotals(selectedDeveloper);
                  return (
                    <tr style={{ background: '#f7f8f9', borderTop: '2px solid #dfe1e6', fontWeight: '600' }}>
                      <td style={{ padding: '12px', color: '#172b4d' }}>Weekly Total</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#00875a' }}>
                        {weeklyTotals.completed}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#ff991f' }}>
                        {weeklyTotals.pending}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#0052cc' }}>
                        {weeklyTotals.total}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#626f86' }}>
                        {STORY_POINTS_PER_WEEK}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {weeklyTotals.pending === 0 && weeklyTotals.total >= STORY_POINTS_PER_WEEK ? (
                          <span style={{
                            background: '#00875a',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            ✓ Complete
                          </span>
                        ) : weeklyTotals.total >= STORY_POINTS_PER_WEEK ? (
                          <span style={{
                            background: '#fff7d6',
                            color: '#7f5f01',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            On Track
                          </span>
                        ) : (
                          <span style={{
                            background: '#ffeceb',
                            color: '#ae2a19',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            Behind
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '1rem',
            fontSize: '12px',
            flexWrap: 'wrap'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                width: '12px',
                height: '12px',
                background: '#00875a',
                borderRadius: '2px',
                display: 'inline-block'
              }}></span>
              Story points completed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                width: '12px',
                height: '12px',
                background: '#ff991f',
                borderRadius: '2px',
                display: 'inline-block'
              }}></span>
              Story points pending
            </span>
          </div>
        </div>
      )}

      {/* WEEKLY OVERVIEW */}
      {chartType === 'weekly' ? (
        <div>
          {/* Weekly Overview - Stacked Bar Chart */}
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart
              data={weeklyData}
              margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 12, fill: '#5e6c84' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#5e6c84' }}
                label={{ value: 'Number of Tickets', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '8px'
                }}
                formatter={(value) => value}
                labelFormatter={(label) => `${label}`}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="completed" stackId="a" fill={colors.completed} name="Completed" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pending" stackId="a" fill={colors.pending} name="Pending" radius={[8, 8, 0, 0]} />
              <Line
                type="monotone"
                dataKey="total"
                stroke={colors.total}
                strokeWidth={2}
                name="Total"
                dot={{ fill: colors.total, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Weekly Stats Summary */}
          <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
            {weeklyData.map((week, idx) => (
              <div key={idx} style={{
                padding: '12px',
                background: '#f9f9f9',
                borderRadius: '6px',
                border: '1px solid #eee'
              }}>
                <div style={{ fontSize: '11px', color: '#5e6c84', marginBottom: '8px', fontWeight: '500' }}>
                  {week.week}
                </div>
                <div style={{ fontSize: '10px', color: '#5e6c84', marginBottom: '6px' }}>
                  {week.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: colors.completed, fontWeight: '600', fontSize: '12px' }}>
                    ✓ {week.completed}
                  </span>
                  <span style={{ color: colors.pending, fontWeight: '600', fontSize: '12px' }}>
                    ⏳ {week.pending}
                  </span>
                  <span style={{ color: colors.total, fontWeight: '600', fontSize: '12px' }}>
                    📋 {week.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Developer Breakdown - Grouped Bar Chart */}
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={developerData}
              margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#5e6c84' }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#5e6c84' }}
                label={{ value: 'Completed Tickets', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '8px'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {weeks.map((week, idx) => (
                <Bar
                  key={`week${idx}`}
                  dataKey={`week${idx}Completed`}
                  fill={`hsla(${idx * 90}, 70%, 50%, 0.8)`}
                  name={`Week ${idx + 1} - Completed`}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* Developer Summary */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '14px', color: '#172b4d', marginBottom: '1rem' }}>Developer Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {developers.map((dev, idx) => {
                const devTotals = getDevTotals(dev);
                return (
                  <div key={idx} style={{
                    padding: '12px',
                    background: '#f9f9f9',
                    borderRadius: '6px',
                    border: '1px solid #eee'
                  }}>
                    <div style={{ fontSize: '13px', color: '#172b4d', fontWeight: '600', marginBottom: '8px' }}>
                      {dev}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: colors.completed, fontWeight: '600', fontSize: '12px' }}>
                        ✓ {devTotals.completed} Completed
                      </span>
                      <span style={{ color: colors.pending, fontWeight: '600', fontSize: '12px' }}>
                        ⏳ {devTotals.pending} Pending
                      </span>
                      <span style={{ color: colors.total, fontWeight: '600', fontSize: '12px' }}>
                        📋 {devTotals.total} Total
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#5e6c84', marginTop: '1rem' }}>
        * Weeks based on ticket due dates (Mon–Fri). Tickets without due dates are excluded from weekly view but included in totals.
      </div>
    </div>
  );
}

export default WeeklyProgress;