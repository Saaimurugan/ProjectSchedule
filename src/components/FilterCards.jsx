import React from 'react';
import './FilterCards.css';

function FilterCards({ tickets, filteredTickets, onFilterChange, activeFilter }) {
  const getStoryPointsStats = () => {
    // Debug: Log first ticket to find story points field
    if (tickets.length > 0) {
      console.log('=== STORY POINTS DEBUG ===');
      console.log('First ticket:', tickets[0].key);
      console.log('Story Points Field ID from server:', window.storyPointsFieldId);
      
      // Check the story points field value
      if (window.storyPointsFieldId) {
        console.log(`Value of ${window.storyPointsFieldId}:`, tickets[0].fields[window.storyPointsFieldId]);
      }
      
      // Check all customfield values that are numbers
      Object.keys(tickets[0].fields).forEach(key => {
        const value = tickets[0].fields[key];
        if (key.startsWith('customfield') && typeof value === 'number') {
          console.log(`${key}: ${value} (number)`);
        }
      });
    }

    // Check the actual story points field - customfield_10058
    const withPoints = tickets.filter(t => {
      const fields = t.fields;
      
      // Check the correct story points field
      return fields.customfield_10058 || 
             fields.customfield_10202 ||
             fields.customfield_10005 || 
             fields.customfield_10308 ||
             fields.customfield_10016 || 
             fields.customfield_10026 || 
             fields.customfield_10036 ||
             fields.customfield_10106 ||
             fields.customfield_10002 ||
             fields.customfield_10004 ||
             fields.storyPoints;
    }).length;
    
    const withoutPoints = tickets.length - withPoints;
    console.log('Story points stats:', { withPoints, withoutPoints, total: tickets.length });
    return { withPoints, withoutPoints };
  };

  const getDueDateStats = () => {
    const withDueDate = tickets.filter(t => t.fields.duedate).length;
    const withoutDueDate = tickets.length - withDueDate;
    return { withDueDate, withoutDueDate };
  };

  const getStatusStats = () => {
    const statusMap = {};
    // Use filteredTickets to show status counts based on current filters
    filteredTickets.forEach(ticket => {
      const status = ticket.fields.status?.name || 'Unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    return statusMap;
  };

  const getAssigneeStats = () => {
    const assigneeMap = {};
    // Use filteredTickets to show assignee counts based on current filters
    filteredTickets.forEach(ticket => {
      const assignee = ticket.fields.assignee?.displayName || 'Unassigned';
      assigneeMap[assignee] = (assigneeMap[assignee] || 0) + 1;
    });
    return assigneeMap;
  };

  const getEpicStats = () => {
    const epicMap = {};
    // Use filteredTickets to show epic counts based on current filters
    filteredTickets.forEach(ticket => {
      // Try multiple common epic field names
      const epic = ticket.fields.customfield_10014?.name || 
                   ticket.fields.customfield_10008?.name ||
                   ticket.fields.epic?.name ||
                   ticket.fields.parent?.fields?.summary ||
                   'No Epic';
      epicMap[epic] = (epicMap[epic] || 0) + 1;
    });
    return epicMap;
  };

  const storyPoints = getStoryPointsStats();
  const dueDate = getDueDateStats();
  const statuses = getStatusStats();
  const assignees = getAssigneeStats();
  const epics = getEpicStats();

  return (
    <div className="filter-cards">
      <div 
        className={`filter-card ${activeFilter?.type === 'storyPoints' ? 'active' : ''}`}
        onClick={() => onFilterChange(null)}
      >
        <h3>Story Points</h3>
        <div className="card-stats">
          <div 
            className="stat-item clickable"
            onClick={(e) => {
              e.stopPropagation();
              onFilterChange({ type: 'storyPoints', value: 'without' });
            }}
          >
            <span className="stat-label">No Points:</span>
            <span className="stat-value">{storyPoints.withoutPoints}</span>
          </div>
          <div 
            className="stat-item clickable"
            onClick={(e) => {
              e.stopPropagation();
              onFilterChange({ type: 'storyPoints', value: 'with' });
            }}
          >
            <span className="stat-label">With Points:</span>
            <span className="stat-value">{storyPoints.withPoints}</span>
          </div>
        </div>
      </div>

      <div 
        className={`filter-card ${activeFilter?.type === 'dueDate' ? 'active' : ''}`}
        onClick={() => onFilterChange(null)}
      >
        <h3>Due Date</h3>
        <div className="card-stats">
          <div 
            className="stat-item clickable"
            onClick={(e) => {
              e.stopPropagation();
              onFilterChange({ type: 'dueDate', value: 'without' });
            }}
          >
            <span className="stat-label">No Due Date:</span>
            <span className="stat-value">{dueDate.withoutDueDate}</span>
          </div>
          <div 
            className="stat-item clickable"
            onClick={(e) => {
              e.stopPropagation();
              onFilterChange({ type: 'dueDate', value: 'with' });
            }}
          >
            <span className="stat-label">With Due Date:</span>
            <span className="stat-value">{dueDate.withDueDate}</span>
          </div>
        </div>
      </div>

      <div className="filter-card assignee-card">
        <h3>Assignee</h3>
        <div className="card-stats status-stats">
          {Object.entries(assignees).map(([assignee, count]) => (
            <div 
              key={assignee}
              className={`stat-item clickable ${activeFilter?.assignees?.includes(assignee) ? 'active-status' : ''}`}
              onClick={() => onFilterChange({ type: 'assignee', value: assignee })}
            >
              <span className="stat-label">{assignee}:</span>
              <span className="stat-value">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="filter-card epic-card">
        <h3>Epic</h3>
        <div className="card-stats status-stats">
          {Object.entries(epics).map(([epic, count]) => (
            <div 
              key={epic}
              className={`stat-item clickable ${activeFilter?.epics?.includes(epic) ? 'active-status' : ''}`}
              onClick={() => onFilterChange({ type: 'epic', value: epic })}
            >
              <span className="stat-label">{epic}:</span>
              <span className="stat-value">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="filter-card status-card">
        <h3>Status</h3>
        <div className="card-stats status-stats">
          {Object.entries(statuses).map(([status, count]) => (
            <div 
              key={status}
              className={`stat-item clickable ${activeFilter?.statuses?.includes(status) ? 'active-status' : ''}`}
              onClick={() => onFilterChange({ type: 'status', value: status })}
            >
              <span className="stat-label">{status}:</span>
              <span className="stat-value">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FilterCards;
