import React, { useState } from 'react';

function DeveloperAccordion({ tickets, allEpics = [] }) {
  const [expandedDeveloper, setExpandedDeveloper] = useState(null);

  // Group tickets by assignee
  const groupedByAssignee = tickets.reduce((acc, ticket) => {
    const assignee = ticket.fields.assignee?.displayName || 'Unassigned';
    if (!acc[assignee]) {
      acc[assignee] = [];
    }
    acc[assignee].push(ticket);
    return acc;
  }, {});

  const getStoryPoints = (ticket) => {
    return ticket.fields.customfield_10033 || 0;
  };

  const getStatus = (ticket) => {
    return ticket.fields.status?.name || '';
  };

  const getStatusCategory = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('done') || statusLower.includes('complete')) {
      return 'Done';
    } else if (statusLower.includes('progress')) {
      return 'In Progress';
    }
    return 'Other';
  };

  const getStatusColor = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'in progress' || statusLower === 'dev') {
      return '#1a56db';
    } else if (statusLower === 'done') {
      return '#16a34a';
    } else if (statusLower === 'qa') {
      return '#7c3aed';
    }
    return '#6b7280';
  };

  const getSortPriority = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'in progress' || statusLower === 'dev') {
      return 0;
    } else if (statusLower === 'qa') {
      return 1;
    } else if (statusLower === 'done') {
      return 3;
    }
    return 2;
  };

  const sortTickets = (ticketList) => {
    return [...ticketList].sort((a, b) => {
      const priorityA = getSortPriority(getStatus(a));
      const priorityB = getSortPriority(getStatus(b));
      return priorityA - priorityB;
    });
  };

  const getValidationIssues = (ticket) => {
    const issues = [];

    // Rule 1: Description too short
    const description = ticket.fields.description?.content?.[0]?.content?.[0]?.text || '';
    if (description.length < 200) {
      issues.push('Description too short (min 200 characters)');
    }

    // Rule 2: No comments for QA/Done tickets
    const status = getStatus(ticket);
    const commentCount = ticket.fields.comment?.total || 0;
    if ((status.toLowerCase().includes('done') || status.toLowerCase().includes('qa')) && commentCount === 0) {
      issues.push('No comments. At least 1 comment required for QA/Done tickets');
    }

    // Rule 3: Missing required fields
    const storyPoints = getStoryPoints(ticket);
    const dueDate = ticket.fields.duedate;
    const missingFields = [];
    if (storyPoints === 0 || storyPoints === null) {
      missingFields.push('Story Points');
    }
    if (!dueDate) {
      missingFields.push('Due Date');
    }
    if (missingFields.length > 0) {
      issues.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Rule 4: Past due date and not completed
    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDateObj < today && !status.toLowerCase().includes('done')) {
        issues.push('Ticket past due date and not completed');
      }
    }

    // Rule 5: Epic not assigned
    const epic = ticket.fields.parent?.fields?.summary;
    if (!epic) {
      issues.push('Epic not assigned. Please add an epic to this ticket');
    }

    return issues;
  };

  const developerNames = Object.keys(groupedByAssignee).sort();

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '600' }}>Developer Workload</h2>
      
      {developerNames.map((developerName) => {
        const developerTickets = groupedByAssignee[developerName];
        const isExpanded = expandedDeveloper === developerName;

        // Calculate counts
        const totalTickets = developerTickets.length;
        const inProgressCount = developerTickets.filter(
          (t) => getStatusCategory(getStatus(t)) === 'In Progress'
        ).length;
        const doneCount = developerTickets.filter(
          (t) => getStatusCategory(getStatus(t)) === 'Done'
        ).length;
        const otherCount = totalTickets - inProgressCount - doneCount;

        // Calculate total story points
        const totalStoryPoints = developerTickets.reduce((sum, t) => sum + getStoryPoints(t), 0);
        const hasLowStoryPoints = totalStoryPoints < 30;

        return (
          <div
            key={developerName}
            style={{
              marginBottom: '15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9',
              overflow: 'hidden'
            }}
          >
            {/* Accordion Header */}
            <div
              onClick={() => setExpandedDeveloper(isExpanded ? null : developerName)}
              style={{
                padding: '16px',
                backgroundColor: '#f0f0f0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                userSelect: 'none',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <span style={{ fontSize: '18px', marginRight: '8px' }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '16px' }}>{developerName}</strong>
                  <span style={{ fontSize: '14px', color: '#666' }}>— {totalStoryPoints} pts</span>
                  {hasLowStoryPoints && (
                    <span style={{
                      fontSize: '20px',
                      display: 'inline-block'
                    }}>
                      🚩
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  Total: {totalTickets}
                </span>
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  In Progress: {inProgressCount}
                </span>
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Done: {doneCount}
                </span>
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Other: {otherCount}
                </span>
              </div>
            </div>

            {/* Accordion Content */}
            {isExpanded && (
              <div style={{ padding: '16px' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        padding: '10px',
                        textAlign: 'left',
                        borderBottom: '2px solid #ddd',
                        fontWeight: '600',
                        backgroundColor: '#f5f5f5',
                        width: '120px'
                      }}>
                        Ticket
                      </th>
                      <th style={{
                        padding: '10px',
                        textAlign: 'left',
                        borderBottom: '2px solid #ddd',
                        fontWeight: '600',
                        backgroundColor: '#f5f5f5'
                      }}>
                        Summary
                      </th>
                      <th style={{
                        padding: '10px',
                        textAlign: 'left',
                        borderBottom: '2px solid #ddd',
                        fontWeight: '600',
                        backgroundColor: '#f5f5f5',
                        width: '80px'
                      }}>
                        Status
                      </th>
                      <th style={{
                        padding: '10px',
                        textAlign: 'center',
                        borderBottom: '2px solid #ddd',
                        fontWeight: '600',
                        backgroundColor: '#f5f5f5',
                        width: '100px'
                      }}>
                        Story Points
                      </th>
                      <th style={{
                        padding: '10px',
                        textAlign: 'left',
                        borderBottom: '2px solid #ddd',
                        fontWeight: '600',
                        backgroundColor: '#f5f5f5',
                        width: '120px'
                      }}>
                        Due Date
                      </th>
                      <th style={{
                        padding: '10px',
                        textAlign: 'left',
                        borderBottom: '2px solid #ddd',
                        fontWeight: '600',
                        backgroundColor: '#f5f5f5'
                      }}>
                        Epic
                      </th>
                      <th style={{
                        padding: '10px',
                        textAlign: 'left',
                        borderBottom: '2px solid #ddd',
                        fontWeight: '600',
                        backgroundColor: '#f5f5f5'
                      }}>
                        Issues
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortTickets(developerTickets).map((ticket, idx) => {
                      const issues = getValidationIssues(ticket);
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #eee',
                            backgroundColor: issues.length > 0 ? '#fff5f5' : '#fff'
                          }}
                        >
                          <td style={{ padding: '10px', verticalAlign: 'top' }}>
                            <a
                              href={`https://mpscentral.atlassian.net/browse/${ticket.key}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#0052cc',
                                textDecoration: 'none',
                                fontWeight: '500'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              {ticket.key}
                            </a>
                          </td>
                          <td style={{ padding: '10px', verticalAlign: 'top' }}>
                            {ticket.fields.summary}
                          </td>
                          <td style={{ padding: '10px', verticalAlign: 'top' }}>
                            <span style={{ color: getStatusColor(getStatus(ticket)), fontWeight: '600' }}>
                              {getStatus(ticket)}
                            </span>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>
                            <span
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#f0f0f0',
                                borderRadius: '4px',
                                fontWeight: '600'
                              }}
                            >
                              {getStoryPoints(ticket)}
                            </span>
                          </td>
                          <td style={{ padding: '10px', verticalAlign: 'top' }}>
                            {ticket.fields.duedate ? (
                              new Date(ticket.fields.duedate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            ) : (
                              <span style={{ color: '#dc2626' }}>No due date</span>
                            )}
                          </td>
                          <td style={{ padding: '10px', verticalAlign: 'top' }}>
                            {ticket.fields.parent?.fields?.summary ? (
                              <span>{ticket.fields.parent.fields.summary}</span>
                            ) : (
                              <span style={{ color: '#ea580c' }}>No Epic</span>
                            )}
                          </td>
                          <td style={{ padding: '10px', verticalAlign: 'top' }}>
                            {issues.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {issues.map((issue, issueIdx) => (
                                  <div
                                    key={issueIdx}
                                    style={{
                                      padding: '6px 8px',
                                      backgroundColor: '#fee2e2',
                                      color: '#991b1b',
                                      borderRadius: '4px',
                                      fontSize: '13px',
                                      border: '1px solid #fecaca'
                                    }}
                                  >
                                    • {issue}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#059669', fontWeight: '600', fontSize: '13px' }}>
                                ✓ No issues
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Epics Summary Section */}
      {tickets.length > 0 && (
        <div style={{ marginTop: '40px', marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>Epics Summary</h3>
          {(() => {
            const epicMap = {};

            // First add all epics from allEpics prop with 0 counts
            allEpics.forEach(epic => {
              const name = epic.fields?.summary || epic.key;
              if (!epicMap[name]) {
                epicMap[name] = {
                  name,
                  totalTickets: 0,
                  doneTickets: 0,
                  storyPoints: 0,
                  dueDates: [],
                  epicKey: epic.key
                };
              }
            });

            // Then add ticket data on top
            tickets.forEach(ticket => {
              const epicName = ticket.fields?.parent?.fields?.summary || 'No Epic';
              if (!epicMap[epicName]) {
                epicMap[epicName] = {
                  name: epicName,
                  totalTickets: 0,
                  doneTickets: 0,
                  storyPoints: 0,
                  dueDates: []
                };
              }
              epicMap[epicName].totalTickets++;
              if (ticket.fields?.status?.name?.toLowerCase() === 'done') {
                epicMap[epicName].doneTickets++;
              }
              epicMap[epicName].storyPoints += Number(ticket.fields?.customfield_10033 || 0);
              if (ticket.fields?.duedate) {
                epicMap[epicName].dueDates.push(ticket.fields.duedate);
              }
            });

            const epics = Object.values(epicMap).map(epic => {
              const dueDates = epic.dueDates
                .map(d => new Date(d))
                .sort((a, b) => a - b);
              return {
                ...epic,
                earliestDueDate: dueDates.length > 0 ? dueDates[0] : null,
                latestDueDate: dueDates.length > 0 ? dueDates[dueDates.length - 1] : null
              };
            }).sort((a, b) => b.totalTickets - a.totalTickets);

            return epics.length > 0 ? (
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5'
                    }}>Epic Name</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5',
                      width: '100px'
                    }}>Total Tickets</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5',
                      width: '100px'
                    }}>Done Tickets</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5',
                      width: '100px'
                    }}>Story Points</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5',
                      width: '120px'
                    }}>Earliest Due Date</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5',
                      width: '120px'
                    }}>Latest Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {epics.map((epic, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{epic.name}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{epic.totalTickets}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                          {epic.doneTickets}/{epic.totalTickets}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>{epic.storyPoints}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {epic.earliestDueDate ? (
                          epic.earliestDueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        ) : (
                          <span style={{ color: '#dc2626' }}>No due date</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {epic.latestDueDate ? (
                          epic.latestDueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        ) : (
                          <span style={{ color: '#dc2626' }}>No due date</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: '#666', fontSize: '14px' }}>No epics found</div>
            );
          })()}
        </div>
      )}

      {/* Projects Summary Section */}
      {tickets.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>Projects Summary</h3>
          {(() => {
            const projectMap = {};
            tickets.forEach(ticket => {
              const projectName = ticket.fields.project?.name || 'Unknown Project';
              if (!projectMap[projectName]) {
                projectMap[projectName] = {
                  name: projectName,
                  tickets: [],
                  totalStoryPoints: 0,
                  doneCount: 0
                };
              }
              projectMap[projectName].tickets.push(ticket);
              projectMap[projectName].totalStoryPoints += getStoryPoints(ticket);
              if (getStatus(ticket).toLowerCase().includes('done')) {
                projectMap[projectName].doneCount++;
              }
            });

            const projects = Object.values(projectMap).map(project => {
              const dueDates = project.tickets
                .map(t => t.fields.duedate)
                .filter(d => d)
                .map(d => new Date(d))
                .sort((a, b) => a - b);
              return {
                ...project,
                totalTickets: project.tickets.length,
                earliestDueDate: dueDates.length > 0 ? dueDates[0] : null,
                latestDueDate: dueDates.length > 0 ? dueDates[dueDates.length - 1] : null
              };
            }).sort((a, b) => a.name.localeCompare(b.name));

            return projects.length > 0 ? (
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5'
                    }}>Project Name</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5',
                      width: '100px'
                    }}>Total Tickets</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5',
                      width: '100px'
                    }}>Done Tickets</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5',
                      width: '100px'
                    }}>Story Points</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5',
                      width: '120px'
                    }}>Earliest Due Date</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      fontWeight: '600',
                      backgroundColor: '#f5f5f5',
                      width: '120px'
                    }}>Latest Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{project.name}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{project.totalTickets}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                          {project.doneCount}/{project.totalTickets}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>{project.totalStoryPoints}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {project.earliestDueDate ? (
                          project.earliestDueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        ) : (
                          <span style={{ color: '#dc2626' }}>No due date</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {project.latestDueDate ? (
                          project.latestDueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        ) : (
                          <span style={{ color: '#dc2626' }}>No due date</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: '#666', fontSize: '14px' }}>No projects found</div>
            );
          })()}
        </div>
      )}

      {developerNames.length === 0 && tickets.length === 0 && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px'
        }}>
          No tickets to display
        </div>
      )}
    </div>
  );
}

export default DeveloperAccordion;
