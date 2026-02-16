import React, { useState, useEffect } from 'react';
import JiraConfig from './components/JiraConfig';
import FilterCards from './components/FilterCards';
import Analytics from './components/Analytics';
import Charts from './components/Charts';
import TicketList from './components/TicketList';
import SprintTrends from './components/SprintTrends';
import './App.css';

function App() {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [currentSprintData, setCurrentSprintData] = useState(null);
  const [activeFilter, setActiveFilter] = useState({
    storyPoints: null,
    dueDate: null,
    assignees: [],
    epics: [],
    statuses: []
  });

  const fetchTickets = async (jiraConfig) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://kadj2jyknh.execute-api.us-east-1.amazonaws.com/dev/mps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jiraConfig),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.statusText}`);
      }

      const rawText = await response.text();
      console.log('Raw response text:', rawText);
      console.log('Raw response type:', typeof rawText);
      
      let parsedData;
      try {
        parsedData = JSON.parse(rawText);
        console.log('First parse successful:', parsedData);
        console.log('Parsed data type:', typeof parsedData);
        
        // Check if response has API Gateway structure (statusCode, body, headers)
        if (parsedData.body && typeof parsedData.body === 'string') {
          console.log('Detected API Gateway response structure, parsing body...');
          parsedData = JSON.parse(parsedData.body);
          console.log('Parsed body:', parsedData);
        }
        
        // Check if it's still double-stringified
        if (typeof parsedData === 'string') {
          console.log('Data is still a string, parsing again...');
          parsedData = JSON.parse(parsedData);
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
        throw new Error('Failed to parse response');
      }
      
      console.log('Final parsed data:', parsedData);
      console.log('Issues array:', parsedData.issues);
      console.log('Issues length:', parsedData.issues?.length);
      
      if (!parsedData.issues || !Array.isArray(parsedData.issues)) {
        throw new Error('Invalid response format: issues array not found');
      }
      
      setTickets(parsedData.issues);
      setFilteredTickets(parsedData.issues);
      setConfig(jiraConfig);
      setActiveFilter({
        storyPoints: null,
        dueDate: null,
        assignees: [],
        epics: [],
        statuses: []
      });
      
      // Store story points field ID for later use
      if (parsedData.storyPointsFieldId) {
        window.storyPointsFieldId = parsedData.storyPointsFieldId;
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate current sprint data whenever tickets change
  useEffect(() => {
    if (tickets.length > 0) {
      const sprintData = calculateSprintData(tickets);
      setCurrentSprintData(sprintData);
    }
  }, [tickets]);

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

  const calculateSprintData = (ticketList) => {
    let totalStoryPoints = 0;
    let completedStoryPoints = 0;
    let bugCount = 0;
    let completedBugCount = 0;
    let overdueTickets = 0;
    const uniqueAssignees = new Set();
    const ticketDetails = [];

    ticketList.forEach(ticket => {
      const points = getStoryPointValue(ticket);
      const status = ticket.fields.status?.name?.toLowerCase() || '';
      const isCompleted = status.includes('done') || status.includes('complete');
      const issueType = ticket.fields.issuetype?.name?.toLowerCase() || '';
      const isBug = issueType.includes('bug');
      const assignee = ticket.fields.assignee?.displayName || 'Unassigned';
      const epic = getEpicName(ticket);
      const dueDate = ticket.fields.duedate || null;

      if (assignee !== 'Unassigned') {
        uniqueAssignees.add(assignee);
      }

      totalStoryPoints += points;
      
      if (isCompleted) {
        completedStoryPoints += points;
      }

      if (isBug) {
        bugCount++;
        if (isCompleted) {
          completedBugCount++;
        }
      }

      // Check if overdue
      if (dueDate) {
        const dueDateObj = new Date(dueDate);
        dueDateObj.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dueDateObj < today && !isCompleted) {
          overdueTickets++;
        }
      }

      // Add ticket details for storage
      ticketDetails.push({
        ticketId: ticket.key,
        resourceName: assignee,
        storyPoints: points,
        storyPointsCompleted: isCompleted ? points : 0,
        epic: epic,
        date: dueDate,
        status: ticket.fields.status?.name || 'Unknown',
        issueType: ticket.fields.issuetype?.name || 'Unknown',
        summary: ticket.fields.summary || '',
        isCompleted: isCompleted,
        isBug: isBug
      });
    });

    const productivity = totalStoryPoints > 0 
      ? ((completedStoryPoints / totalStoryPoints) * 100).toFixed(1)
      : 0;

    return {
      sprintId: `sprint-${Date.now()}`,
      sprintName: config?.sprintName || `Sprint ${new Date().toISOString().split('T')[0]}`,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      totalStoryPoints,
      completedStoryPoints,
      velocity: completedStoryPoints,
      bugCount,
      completedBugCount,
      resourceCount: uniqueAssignees.size,
      totalTickets: ticketList.length,
      completedTickets: ticketList.filter(t => {
        const status = t.fields.status?.name?.toLowerCase() || '';
        return status.includes('done') || status.includes('complete');
      }).length,
      productivity: parseFloat(productivity),
      overdueTickets,
      ticketDetails: ticketDetails
    };
  };

  const handleFilterChange = (filter) => {
    if (!filter) {
      setActiveFilter({
        storyPoints: null,
        dueDate: null,
        assignees: [],
        epics: [],
        statuses: []
      });
      setFilteredTickets(tickets);
      return;
    }

    let newFilter = { ...activeFilter };

    if (filter.type === 'storyPoints') {
      newFilter.storyPoints = filter.value;
    } else if (filter.type === 'dueDate') {
      newFilter.dueDate = filter.value;
    } else if (filter.type === 'assignee') {
      const assignees = [...newFilter.assignees];
      const index = assignees.indexOf(filter.value);
      if (index > -1) {
        assignees.splice(index, 1);
      } else {
        assignees.push(filter.value);
      }
      newFilter.assignees = assignees;
    } else if (filter.type === 'epic') {
      const epics = [...newFilter.epics];
      const index = epics.indexOf(filter.value);
      if (index > -1) {
        epics.splice(index, 1);
      } else {
        epics.push(filter.value);
      }
      newFilter.epics = epics;
    } else if (filter.type === 'status') {
      const statuses = [...newFilter.statuses];
      const index = statuses.indexOf(filter.value);
      if (index > -1) {
        statuses.splice(index, 1);
      } else {
        statuses.push(filter.value);
      }
      newFilter.statuses = statuses;
    }

    setActiveFilter(newFilter);

    // Apply all filters
    let filtered = [...tickets];

    // Story points filter
    if (newFilter.storyPoints) {
      if (newFilter.storyPoints === 'with') {
        filtered = filtered.filter(t => {
          const fields = t.fields;
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
        });
      } else {
        filtered = filtered.filter(t => {
          const fields = t.fields;
          return !(fields.customfield_10058 ||
                   fields.customfield_10202 ||
                   fields.customfield_10005 || 
                   fields.customfield_10308 ||
                   fields.customfield_10016 || 
                   fields.customfield_10026 || 
                   fields.customfield_10036 ||
                   fields.customfield_10106 ||
                   fields.customfield_10002 ||
                   fields.customfield_10004 ||
                   fields.storyPoints);
        });
      }
    }

    // Due date filter
    if (newFilter.dueDate) {
      if (newFilter.dueDate === 'with') {
        filtered = filtered.filter(t => t.fields.duedate);
      } else {
        filtered = filtered.filter(t => !t.fields.duedate);
      }
    }

    // Assignee filter (multi-select)
    if (newFilter.assignees.length > 0) {
      filtered = filtered.filter(t => {
        const ticketAssignee = t.fields.assignee?.displayName || 'Unassigned';
        return newFilter.assignees.includes(ticketAssignee);
      });
    }

    // Epic filter (multi-select)
    if (newFilter.epics.length > 0) {
      filtered = filtered.filter(t => {
        const epic = t.fields.customfield_10014?.name || 
                     t.fields.customfield_10008?.name ||
                     t.fields.epic?.name ||
                     t.fields.parent?.fields?.summary ||
                     'No Epic';
        return newFilter.epics.includes(epic);
      });
    }

    // Status filter (multi-select)
    if (newFilter.statuses.length > 0) {
      filtered = filtered.filter(t => 
        newFilter.statuses.includes(t.fields.status?.name)
      );
    }

    setFilteredTickets(filtered);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>JIRA Dashboard</h1>
      </header>
      
      <main className="main">
        {tickets.length === 0 && <JiraConfig onSubmit={fetchTickets} />}
        
        {loading && <div className="loading">Loading tickets...</div>}
        {error && <div className="error">Error: {error}</div>}
        
        {tickets.length > 0 && (
          <>
            <Analytics tickets={filteredTickets} />
            <Charts tickets={filteredTickets} />
            <SprintTrends currentSprintData={currentSprintData} />
            <FilterCards 
              tickets={tickets}
              filteredTickets={filteredTickets}
              onFilterChange={handleFilterChange}
              activeFilter={activeFilter}
            />
            <TicketList tickets={filteredTickets} groupBy="status" />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
