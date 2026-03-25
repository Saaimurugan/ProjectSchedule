import React from 'react';
import './Analytics.css';

function Analytics({ tickets }) {
  const countBusinessDays = (startDate, endDate) => {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  const getStoryPointValue = (issue) => {
    const val = issue?.fields?.customfield_10033;
    const points = (val !== null && val !== undefined) ? Number(val) : 0;
    return points;
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

  const getEpicName = (ticket) => {
    const fields = ticket.fields;
    return fields.customfield_10014?.name ||
      fields.customfield_10008?.name ||
      fields.epic?.name ||
      fields.parent?.fields?.summary ||
      'No Epic';
  };

  const calculateSprintDetails = () => {
    // Get unique resources
    const uniqueResources = new Set();
    tickets.forEach(ticket => {
      const assignee = ticket.fields.assignee?.displayName;
      if (assignee) {
        uniqueResources.add(assignee);
      }
    });

    // Get epic distribution
    const epicCounts = {};
    tickets.forEach(ticket => {
      const epicName = getEpicName(ticket);
      epicCounts[epicName] = (epicCounts[epicName] || 0) + 1;
    });

    // Find top epic
    const sortedEpics = Object.entries(epicCounts).sort((a, b) => b[1] - a[1]);
    const topEpic = sortedEpics.length > 0 ? sortedEpics[0] : ['None', 0];
    const epicConcentration = sortedEpics.length > 0
      ? `${topEpic[0]} (${topEpic[1]} tickets, ${((topEpic[1] / tickets.length) * 100).toFixed(0)}%)`
      : 'No epics';

    // Extract sprint dates - find the most common active sprint
    const sprintCounts = {};

    tickets.forEach(ticket => {
      const sprint = ticket.fields.sprint ||
        ticket.fields.customfield_10020?.[0] ||
        ticket.fields.customfield_10010?.[0];

      if (sprint) {
        const sprintKey = `${sprint.startDate}_${sprint.endDate}`;
        if (!sprintCounts[sprintKey]) {
          sprintCounts[sprintKey] = {
            count: 0,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            name: sprint.name
          };
        }
        sprintCounts[sprintKey].count++;
      }
    });

    // Get the most common active sprint
    const sortedSprints = Object.values(sprintCounts).sort((a, b) => b.count - a.count);
    let sprintStartDate = null;
    let sprintEndDate = null;

    if (sortedSprints.length > 0) {
      sprintStartDate = sortedSprints[0].startDate;
      sprintEndDate = sortedSprints[0].endDate;
      console.log('Using active sprint:', sortedSprints[0].name, 'with', sortedSprints[0].count, 'tickets');
    }

    // Fallback to current date + 10 days if no sprint dates found
    if (!sprintStartDate || !sprintEndDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      sprintStartDate = today.toISOString();

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 10);
      sprintEndDate = endDate.toISOString();
    }

    return {
      startDate: new Date(sprintStartDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      endDate: new Date(sprintEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      totalResources: uniqueResources.size,
      epicConcentration: epicConcentration,
      totalEpics: sortedEpics.length,
      sprintStartDate,
      sprintEndDate
    };
  };

  const sprintDetails = calculateSprintDetails();

  const calculateAnalytics = () => {
    let totalStoryPoints = 0;
    let completedStoryPoints = 0;
    let overdueTickets = [];
    let todayStoryPoints = 0;
    let tomorrowStoryPoints = 0;
    let futureStoryPoints = 0;
    let noDueDateStoryPoints = 0;
    let noDueDateTicketCount = 0;

    // Count unique assignees (resources)
    const uniqueAssignees = new Set();

    tickets.forEach(ticket => {
      const points = getStoryPointValue(ticket);
      const dueDateStatus = getDueDateStatus(ticket.fields.duedate);
      const status = ticket.fields.status?.name?.toLowerCase() || '';
      const assignee = ticket.fields.assignee?.displayName;

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
      }

      // Check if task is completed
      const isCompleted = status.includes('done') || status.includes('complete');

      switch (dueDateStatus) {
        case 'overdue':
          // Only count overdue if not completed
          if (!isCompleted) {
            overdueTickets.push({
              key: ticket.key,
              summary: ticket.fields.summary,
              assignee: assignee || 'Unassigned',
              dueDate: ticket.fields.duedate,
              storyPoints: points,
              status: ticket.fields.status?.name || 'Unknown'
            });
          }
          break;
        case 'today':
          if (typeof points === 'number' && !isNaN(points) && !isCompleted) {
            todayStoryPoints += points;
          }
          break;
        case 'tomorrow':
          if (typeof points === 'number' && !isNaN(points) && !isCompleted) {
            tomorrowStoryPoints += points;
          }
          break;
        case 'future':
          if (typeof points === 'number' && !isNaN(points) && !isCompleted) {
            futureStoryPoints += points;
          }
          break;
        case 'none':
          if (typeof points === 'number' && !isNaN(points)) {
            noDueDateStoryPoints += points;
          }
          noDueDateTicketCount++;
          break;
      }
    });

    // Calculate sprint capacity using sprint dates from sprintDetails
    const resourceCount = uniqueAssignees.size;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sprintStartDate = new Date(sprintDetails.sprintStartDate);
    const sprintEndDate = new Date(sprintDetails.sprintEndDate);

    sprintStartDate.setHours(0, 0, 0, 0);
    sprintEndDate.setHours(0, 0, 0, 0);

    // Calculate business days (excluding weekends)
    const totalSprintDays = countBusinessDays(sprintStartDate, sprintEndDate);
    const remainingDays = Math.max(0, countBusinessDays(today, sprintEndDate));
    const elapsedDays = Math.max(0, totalSprintDays - remainingDays);

    const pointsPerResourcePerDay = 3;
    const totalSprintCapacity = resourceCount * totalSprintDays * pointsPerResourcePerDay;
    const expectedCompletedByNow = resourceCount * elapsedDays * pointsPerResourcePerDay;
    const remainingCapacity = resourceCount * remainingDays * pointsPerResourcePerDay;
    const remainingWork = totalStoryPoints - completedStoryPoints;

    const capacityStatus = remainingWork <= remainingCapacity ? 'On Track' : 'At Risk';
    const completionStatus = completedStoryPoints >= expectedCompletedByNow ? 'On Track' : 'Behind Schedule';

    const inProgressTickets = tickets.filter(issue => {
      const status = issue.fields?.status?.name?.toLowerCase();
      return status === 'in progress' || status === 'dev' || status === 'qa';
    });

    return {
      totalStoryPoints,
      completedStoryPoints,
      inProgressStoryPoints: inProgressTickets.length,
      overdueTickets,
      todayStoryPoints,
      tomorrowStoryPoints,
      futureStoryPoints,
      noDueDateStoryPoints,
      noDueDateTicketCount,
      completionRate: totalStoryPoints > 0 ? ((completedStoryPoints / totalStoryPoints) * 100).toFixed(1) : 0,
      resourceCount,
      totalSprintDays,
      elapsedDays,
      remainingDays,
      expectedCompletedByNow,
      remainingCapacity,
      remainingWork,
      capacityStatus,
      completionStatus,
      totalSprintCapacity
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

      <div className="sprint-details-section">
        <h3>Sprint Details</h3>
        <div className="sprint-details-grid">
          <div className="sprint-detail-item">
            <span className="detail-label">Start Date:</span>
            <span className="detail-value">{sprintDetails.startDate}</span>
          </div>
          <div className="sprint-detail-item">
            <span className="detail-label">End Date:</span>
            <span className="detail-value">{sprintDetails.endDate}</span>
          </div>
          <div className="sprint-detail-item">
            <span className="detail-label">Total Resources:</span>
            <span className="detail-value">{sprintDetails.totalResources}</span>
          </div>
          <div className="sprint-detail-item">
            <span className="detail-label">EPICs Concentration:</span>
            <span className="detail-value">{sprintDetails.epicConcentration}</span>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-label">Total Story Points</div>
          <div className="analytics-value">{analytics.totalStoryPoints}/{analytics.totalSprintCapacity}</div>
          <div className="analytics-subtitle">
            {analytics.resourceCount} resources × {analytics.totalSprintDays} days × 3 pts/day = {analytics.totalSprintCapacity} capacity
          </div>
          <div className="analytics-inference">
            Total sprint points compared to full sprint capacity.
          </div>
        </div>

        <div className="analytics-card" style={{
          borderLeft: `4px solid ${analytics.capacityStatus === 'On Track' ? '#00875a' : '#bf2600'}`
        }}>
          <div className="analytics-label">Remaining Points</div>
          <div className="analytics-value">{analytics.remainingWork}/{analytics.remainingCapacity}</div>
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
          <div className="analytics-inference">
            Compare total work against remaining capacity to assess sprint feasibility.
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
          <div className="analytics-inference">
            Track actual vs expected completion to identify if team is on schedule.
          </div>
        </div>

        <div className="analytics-card info">
          <div className="analytics-label">In Progress</div>
          <div className="analytics-value">{analytics.inProgressStoryPoints}</div>
          <div className="analytics-inference">
            Monitor active work. High values may indicate work in progress limits need attention.
          </div>
        </div>

        <div className="analytics-card danger overdue-card">
          <div className="analytics-label">Overdue Tickets</div>
          <div className="analytics-value">{analytics.overdueTickets.length}</div>
          <div className="analytics-inference">
            Overdue work signals blockers or capacity issues requiring immediate action.
          </div>
          {analytics.overdueTickets.length > 0 && (
            <div className="overdue-tickets-list">
              {analytics.overdueTickets.map((ticket, index) => (
                <div key={index} className="overdue-ticket-item">
                  <a
                    href={`https://mpscentral.atlassian.net/browse/${ticket.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="overdue-ticket-link"
                  >
                    {ticket.key}
                  </a>
                  <span className="overdue-ticket-summary">{ticket.summary}</span>
                  <div className="overdue-ticket-meta">
                    <span className="overdue-assignee">{ticket.assignee}</span>
                    <span className="overdue-points">{ticket.storyPoints} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="analytics-card info">
          <div className="analytics-label">Due Today</div>
          <div className="analytics-value">{analytics.todayStoryPoints}</div>
          <div className="analytics-inference">
            Prioritize these tickets to avoid them becoming overdue.
          </div>
        </div>

        <div className="analytics-card success-light">
          <div className="analytics-label">Due Tomorrow</div>
          <div className="analytics-value">{analytics.tomorrowStoryPoints}</div>
          <div className="analytics-inference">
            Plan resources to complete these tickets on time.
          </div>
        </div>

        <div className="analytics-card neutral">
          <div className="analytics-label">Future Story Points</div>
          <div className="analytics-value">{analytics.futureStoryPoints}</div>
          <div className="analytics-inference">
            Work scheduled for later in the sprint. Monitor to ensure timely completion.
          </div>
        </div>

        <div className="analytics-card warning">
          <div className="analytics-label">No Due Date</div>
          <div className="analytics-value">{analytics.noDueDateTicketCount}</div>
          <div className="analytics-inference">
            Tickets without due dates may be deprioritized. Assign dates for better planning.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
