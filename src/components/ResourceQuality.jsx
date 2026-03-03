import React from 'react';
import './ResourceQuality.css';

function ResourceQuality({ tickets }) {
  const getStoryPointValue = (ticket) => {
    const fields = ticket.fields;
    const fieldsToCheck = [
      'customfield_10058',
      'customfield_10202',
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

  const getResourceTableData = () => {
    // Get tickets in progress or dev
    const inProgressTickets = tickets
      .filter(ticket => {
        const status = ticket.fields.status?.name?.toLowerCase() || '';
        return status.includes('in progress') || status === 'dev';
      })
      .map(ticket => {
        const epicName = getEpicName(ticket);
        const dueDate = ticket.fields.duedate;
        return {
          resource: ticket.fields.assignee?.displayName || 'Unassigned',
          ticketId: ticket.key,
          epic: epicName,
          description: ticket.fields.summary,
          dueDate: formatDate(dueDate),
          rawDueDate: dueDate,
          storyPoints: getStoryPointValue(ticket),
          hasNoDueDate: !dueDate,
          hasNoEpic: epicName === 'No Epic'
        };
      });

    // Count tickets per resource
    const ticketCountByResource = {};
    inProgressTickets.forEach(ticket => {
      ticketCountByResource[ticket.resource] = (ticketCountByResource[ticket.resource] || 0) + 1;
    });

    // Add highlight flag for resources with 2+ tickets
    const ticketsWithHighlight = inProgressTickets.map(ticket => ({
      ...ticket,
      shouldHighlightRow: ticketCountByResource[ticket.resource] >= 2
    }));

    // Sort by resource name
    return ticketsWithHighlight.sort((a, b) => a.resource.localeCompare(b.resource));
  };

  return (
    <div className="resource-quality">
      <h2>In Progress Tickets by Resource</h2>
      
      <div className="what-to-infer">
        <strong>What to Infer?</strong>
        <p>Monitor active work distribution across the team. Blue highlighted rows indicate resources with 2+ tickets in "In Progress" or "Dev" status, which may signal multitasking or potential bottlenecks. Red text in Due Date column indicates no due date set. Yellow text in Epic column indicates no epic assigned. Check due dates to identify urgent items requiring attention.</p>
      </div>

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
                className={row.shouldHighlightRow ? 'highlight-row-blue' : ''}
              >
                <td>{row.resource}</td>
                <td>
                  <a 
                    href={`https://highwirepress.atlassian.net/browse/${row.ticketId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ticket-link"
                  >
                    {row.ticketId}
                  </a>
                </td>
                <td className={row.hasNoEpic ? 'no-epic' : ''}>{row.epic}</td>
                <td className="description-cell">{row.description}</td>
                <td className={row.hasNoDueDate ? 'no-due-date' : ''}>
                  {row.dueDate}
                </td>
                <td className="points-cell">{row.storyPoints}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#5e6c84' }}>
                No tickets in progress
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ResourceQuality;
