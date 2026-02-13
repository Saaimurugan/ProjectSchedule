import React from 'react';
import './Analytics.css';

function Analytics({ tickets }) {
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
    if (!dateString) return 'none';
    
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dueDate < today) return 'overdue';
    if (dueDate.getTime() === today.getTime()) return 'today';
    if (dueDate.getTime() === tomorrow.getTime()) return 'tomorrow';
    return 'future';
  };

  const calculateAnalytics = () => {
    let totalStoryPoints = 0;
    let completedStoryPoints = 0;
    let inProgressStoryPoints = 0;
    let overdueStoryPoints = 0;
    let todayStoryPoints = 0;
    let tomorrowStoryPoints = 0;
    let futureStoryPoints = 0;
    let noDueDateStoryPoints = 0;

    // Count unique assignees (resources)
    const uniqueAssignees = new Set();

    tickets.forEach(ticket => {
      const points = getStoryPointValue(ticket);
      const dueDateStatus = getDueDateStatus(ticket.fields.duedate);
      const status = ticket.fields.status?.name?.toLowerCase() || '';
      const assignee = ticket.fields.assignee?.displayName;

      // Log first 3 tickets for debugging
      if (totalStoryPoints < 20) {
        console.log(`Ticket ${ticket.key}: customfield_10005=${ticket.fields.customfield_10005}, points=${points}, type=${typeof points}`);
      }

      if (assignee) {
        uniqueAssignees.add(assignee);
      }

      // Ensure points is a valid number before adding
      if (typeof points === 'number' && !isNaN(points)) {
        totalStoryPoints += points;
      }

      if (status.includes('done') || status.includes('complete')) {
        if (typeof points === 'number' && !isNaN(points)) {
          completedStoryPoints += points;
        }
      } else if (status.includes('progress')) {
        if (typeof points === 'number' && !isNaN(points)) {
          inProgressStoryPoints += points;
        }
      }

      switch (dueDateStatus) {
        case 'overdue':
          if (typeof points === 'number' && !isNaN(points)) {
            overdueStoryPoints += points;
          }
          break;
        case 'today':
          if (typeof points === 'number' && !isNaN(points)) {
            todayStoryPoints += points;
          }
          break;
        case 'tomorrow':
          if (typeof points === 'number' && !isNaN(points)) {
            tomorrowStoryPoints += points;
          }
          break;
        case 'future':
          if (typeof points === 'number' && !isNaN(points)) {
            futureStoryPoints += points;
          }
          break;
        case 'none':
          if (typeof points === 'number' && !isNaN(points)) {
            noDueDateStoryPoints += points;
          }
          break;
      }
    });

    // Calculate sprint capacity
    const resourceCount = uniqueAssignees.size;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Assuming sprint ends in 14 days (2 weeks) - you can adjust this
    const sprintEndDate = new Date(today);
    sprintEndDate.setDate(sprintEndDate.getDate() + 14);
    
    const totalSprintDays = 14; // Total sprint duration
    const remainingDays = Math.max(0, Math.ceil((sprintEndDate - today) / (1000 * 60 * 60 * 24)));
    const elapsedDays = totalSprintDays - remainingDays;
    
    const pointsPerResourcePerDay = 3;
    const totalSprintCapacity = resourceCount * totalSprintDays * pointsPerResourcePerDay;
    const expectedCompletedByNow = resourceCount * elapsedDays * pointsPerResourcePerDay;
    const remainingCapacity = resourceCount * remainingDays * pointsPerResourcePerDay;
    const remainingWork = totalStoryPoints - completedStoryPoints;
    
    const capacityStatus = remainingWork <= remainingCapacity ? 'On Track' : 'At Risk';
    const completionStatus = completedStoryPoints >= expectedCompletedByNow ? 'On Track' : 'Behind Schedule';

    return {
      totalStoryPoints,
      completedStoryPoints,
      inProgressStoryPoints,
      overdueStoryPoints,
      todayStoryPoints,
      tomorrowStoryPoints,
      futureStoryPoints,
      noDueDateStoryPoints,
      completionRate: totalStoryPoints > 0 ? ((completedStoryPoints / totalStoryPoints) * 100).toFixed(1) : 0,
      resourceCount,
      totalSprintDays,
      elapsedDays,
      remainingDays,
      expectedCompletedByNow,
      remainingCapacity,
      remainingWork,
      capacityStatus,
      completionStatus
    };
  };

  const analytics = calculateAnalytics();
  
  console.log('Analytics Summary:', {
    totalStoryPoints: analytics.totalStoryPoints,
    completedStoryPoints: analytics.completedStoryPoints,
    noDueDateStoryPoints: analytics.noDueDateStoryPoints,
    ticketCount: tickets.length
  });

  return (
    <div className="analytics">
      <h2>Analytics</h2>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-label">Total Story Points</div>
          <div className="analytics-value">{analytics.totalStoryPoints}/{analytics.remainingCapacity}</div>
          <div className="analytics-subtitle">
            {analytics.resourceCount} resources × {analytics.remainingDays} days × 3 pts/day = {analytics.remainingCapacity} capacity
          </div>
          <div className="analytics-subtitle" style={{ 
            color: analytics.capacityStatus === 'On Track' ? '#00875a' : '#bf2600',
            fontWeight: 600,
            marginTop: '0.5rem'
          }}>
            {analytics.remainingWork} pts remaining - {analytics.capacityStatus}
          </div>
        </div>

        <div className="analytics-card success">
          <div className="analytics-label">Completed Story Points</div>
          <div className="analytics-value">{analytics.completedStoryPoints}</div>
          <div className="analytics-subtitle">
            {analytics.elapsedDays} days elapsed × {analytics.resourceCount} resources × 3 pts/day = {analytics.expectedCompletedByNow} expected
          </div>
          <div className="analytics-subtitle" style={{ 
            color: analytics.completionStatus === 'On Track' ? '#00875a' : '#bf2600',
            fontWeight: 600,
            marginTop: '0.5rem'
          }}>
            {analytics.completionRate}% complete - {analytics.completionStatus}
          </div>
        </div>

        <div className="analytics-card info">
          <div className="analytics-label">In Progress</div>
          <div className="analytics-value">{analytics.inProgressStoryPoints}</div>
        </div>

        <div className="analytics-card danger">
          <div className="analytics-label">Overdue Story Points</div>
          <div className="analytics-value">{analytics.overdueStoryPoints}</div>
        </div>

        <div className="analytics-card info">
          <div className="analytics-label">Due Today</div>
          <div className="analytics-value">{analytics.todayStoryPoints}</div>
        </div>

        <div className="analytics-card success-light">
          <div className="analytics-label">Due Tomorrow</div>
          <div className="analytics-value">{analytics.tomorrowStoryPoints}</div>
        </div>

        <div className="analytics-card neutral">
          <div className="analytics-label">Future Story Points</div>
          <div className="analytics-value">{analytics.futureStoryPoints}</div>
        </div>

        <div className="analytics-card warning">
          <div className="analytics-label">No Due Date</div>
          <div className="analytics-value">{analytics.noDueDateStoryPoints}</div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
