import React from 'react';
import './TicketList.css';

function TicketList({ tickets, groupBy = 'date' }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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

  const groupTicketsByDate = () => {
    const groups = {
      overdue: [],
      today: [],
      tomorrow: [],
      future: [],
      none: []
    };

    tickets.forEach(ticket => {
      const status = getDueDateStatus(ticket.fields.duedate);
      groups[status].push(ticket);
    });

    return groups;
  };

  const groupTicketsByStatus = () => {
    const groups = {};
    tickets.forEach(ticket => {
      const status = ticket.fields.status?.name || 'Unknown';
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(ticket);
    });
    return groups;
  };

  const renderTicket = (ticket) => (
    <div key={ticket.id} className="ticket-item">
      <div className="ticket-header">
        <span className="ticket-key">{ticket.key}</span>
        <span className="ticket-type">{ticket.fields.issuetype?.name || 'N/A'}</span>
      </div>
      
      <div className="ticket-summary">{ticket.fields.summary}</div>
      
      <div className="ticket-meta">
        <div className="ticket-meta-item">
          <span className="ticket-meta-label">Project:</span>
          <span>{ticket.fields.project?.name || 'N/A'}</span>
        </div>
        
        <div className="ticket-meta-item">
          <span className="ticket-meta-label">Due Date:</span>
          <span>{formatDate(ticket.fields.duedate)}</span>
        </div>
        
        <div className="ticket-meta-item">
          <span className="ticket-meta-label">Status:</span>
          <span>{ticket.fields.status?.name || 'N/A'}</span>
        </div>

        <div className="ticket-meta-item">
          <span className="ticket-meta-label">Assignee:</span>
          <span>{ticket.fields.assignee?.displayName || 'Unassigned'}</span>
        </div>
      </div>
      
      {ticket.fields.description && (
        <div className="ticket-description">
          {typeof ticket.fields.description === 'string' 
            ? ticket.fields.description 
            : ticket.fields.description?.content?.[0]?.content?.[0]?.text || 'No description'}
        </div>
      )}
    </div>
  );

  if (groupBy === 'status') {
    const groupedTickets = groupTicketsByStatus();
    
    return (
      <div className="ticket-list">
        <h2>Tickets ({tickets.length})</h2>
        
        {Object.entries(groupedTickets).map(([status, statusTickets]) => (
          <div key={status} className="date-group future-group">
            <h3 className="date-group-title">{status} ({statusTickets.length})</h3>
            {statusTickets.map(renderTicket)}
          </div>
        ))}
      </div>
    );
  }

  const groupedTickets = groupTicketsByDate();

  return (
    <div className="ticket-list">
      <h2>Tickets ({tickets.length})</h2>
      
      {groupedTickets.overdue.length > 0 && (
        <div className="date-group overdue-group">
          <h3 className="date-group-title">Overdue ({groupedTickets.overdue.length})</h3>
          {groupedTickets.overdue.map(renderTicket)}
        </div>
      )}
      
      {groupedTickets.today.length > 0 && (
        <div className="date-group today-group">
          <h3 className="date-group-title">Due Today ({groupedTickets.today.length})</h3>
          {groupedTickets.today.map(renderTicket)}
        </div>
      )}
      
      {groupedTickets.tomorrow.length > 0 && (
        <div className="date-group tomorrow-group">
          <h3 className="date-group-title">Due Tomorrow ({groupedTickets.tomorrow.length})</h3>
          {groupedTickets.tomorrow.map(renderTicket)}
        </div>
      )}
      
      {groupedTickets.future.length > 0 && (
        <div className="date-group future-group">
          <h3 className="date-group-title">Upcoming ({groupedTickets.future.length})</h3>
          {groupedTickets.future.map(renderTicket)}
        </div>
      )}
      
      {groupedTickets.none.length > 0 && (
        <div className="date-group none-group">
          <h3 className="date-group-title">No Due Date ({groupedTickets.none.length})</h3>
          {groupedTickets.none.map(renderTicket)}
        </div>
      )}
    </div>
  );
}

export default TicketList;
