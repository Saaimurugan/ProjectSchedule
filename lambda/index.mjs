// AWS Lambda handler for JIRA API proxy and Sprint Data Management 
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'JiraSprintData';

export const handler = async (event) => {
  // Get credentials from environment variables
  const domain = process.env.JIRA_DOMAIN || 'https://mpscentral.atlassian.net';
  const email = process.env.JIRA_EMAIL || 'johnpeter.r@mpslimited.com';
  const apiToken = process.env.JIRA_API_TOKEN;

  // Get JQL from request body
  const jql = event["jql"];

  console.log('Received request with JQL:', jql);

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // If no JQL provided, just return sprint history (page load scenario)
  if (!jql || jql.trim() === '') {
    console.log('No JQL provided, returning sprint history only');
    try {
      const historyParams = {
        TableName: TABLE_NAME,
        Limit: 100
      };
      const historyResult = await docClient.send(new ScanCommand(historyParams));
      const sortedSprints = (historyResult.Items || [])
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          issues: [],
          sprintHistory: sortedSprints
        })
      };
    } catch (error) {
      console.error('Error fetching sprint history:', error);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          issues: [],
          sprintHistory: []
        })
      };
    }
  }

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
  // First, get field metadata to find story points field
  const fieldsResponse = await fetch(`${domain}/rest/api/3/field`, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    },
  });
  
  const fields = await fieldsResponse.json();
  
  const storyPointsField = fields.find(f => 
    f.name?.toLowerCase().includes('story point') || 
    f.name?.toLowerCase() === 'story points' ||
    f.name === 'Story Points'
  );
  
  // Fetch all results with pagination (v3 uses nextPageToken, not startAt)
  let allIssues = [];
  let nextPageToken = undefined;
  let totalResults = 0;
  const maxResultsPerPage = 100;
  
  while (true) {
    const payload = {
      jql: jql,
      maxResults: maxResultsPerPage,
      fields: ['*all']
    };
    if (nextPageToken) payload.nextPageToken = nextPageToken;

    const pageResponse = await fetch(
      `${domain}/rest/api/3/search/jql`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!pageResponse.ok) {
      const errorText = await pageResponse.text();
      return {
        statusCode: pageResponse.status,
        headers,
        body: JSON.stringify({ error: errorText })
      };
    }

    const pageData = await pageResponse.json();
    allIssues = allIssues.concat(pageData.issues || []);
    totalResults = pageData.total || allIssues.length;

    if (pageData.isLast || !pageData.nextPageToken || allIssues.length >= 1000) break;
    nextPageToken = pageData.nextPageToken;
  }

  const response = {
    ok: true,
    json: async () => ({ issues: allIssues, total: totalResults })
  };

  if (!response.ok) {
    const errorText = await response.text();
    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify({ error: errorText })
    };
  }

  const data = await response.json();
  
  // Validate: In Progress tickets with no update for 24+ hours must have comments
  const commentValidation = [];
  const now = new Date();

  for (const ticket of allIssues) {
    const status = ticket.fields?.status?.name?.toLowerCase() || '';
    const isInProgress = status.includes('in progress');
    
    if (isInProgress) {
      const updatedDate = new Date(ticket.fields?.updated);
      const hoursSinceUpdated = (now - updatedDate) / (1000 * 60 * 60);
      
      if (hoursSinceUpdated >= 24) {
        const commentTotal = ticket.fields?.comment?.total || 
                             ticket.fields?.comment?.comments?.length || 0;
        
        if (commentTotal === 0) {
          commentValidation.push({
            ticketKey: ticket.key,
            assignee: ticket.fields?.assignee?.displayName || 'Unassigned',
            summary: ticket.fields?.summary || '',
            hoursSinceUpdated: Math.floor(hoursSinceUpdated),
            status: ticket.fields?.status?.name,
            violation: 'No comment found — comment is mandatory for In Progress tickets not updated for 24+ hours'
          });
        }
      }
    }
  }

  data.commentValidation = commentValidation;

  // Add story points field info to response
  if (storyPointsField) {
    data.storyPointsFieldId = storyPointsField.id;
    data.storyPointsFieldName = storyPointsField.name;
  } else if (data.issues && data.issues.length > 0) {
    // Fallback: Try to detect story points field from actual data
    const firstTicket = data.issues[0];
    const possibleField = Object.keys(firstTicket.fields).find(key => {
      const value = firstTicket.fields[key];
      return key.startsWith('customfield') && typeof value === 'number' && value > 0 && value < 100;
    });
    
    if (possibleField) {
      data.storyPointsFieldId = possibleField;
      data.storyPointsFieldName = 'Story Points (detected)';
    }
  }
  
  // Automatically save sprint data to DynamoDB after fetching tickets
  if (data.issues && data.issues.length > 0) {
    try {
      console.log('Auto-saving sprint data to DynamoDB...');
      const sprintData = calculateSprintData(data.issues, storyPointsField?.id);
      await autoSaveSprintData(sprintData);
      console.log('Sprint data auto-saved successfully');
      
      // Fetch and include sprint history in response
      try {
        const historyParams = {
          TableName: TABLE_NAME,
          Limit: 100
        };
        const historyResult = await docClient.send(new ScanCommand(historyParams));
        const sortedSprints = (historyResult.Items || [])
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 10);
        
        data.sprintHistory = sortedSprints;
        console.log('Sprint history included in response');
      } catch (historyError) {
        console.error('Error fetching sprint history:', historyError);
        data.sprintHistory = [];
      }
    } catch (error) {
      console.error('Error auto-saving sprint data:', error);
      // Don't fail the main request if auto-save fails
    }
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(data)
  };
}

// Calculate sprint data from tickets
function calculateSprintData(tickets, storyPointsFieldId) {
  const getStoryPointValue = (ticket) => {
    const fields = ticket.fields;
    const fieldsToCheck = [
      storyPointsFieldId,
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
      if (fieldName && fields[fieldName] !== null && fields[fieldName] !== undefined) {
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

  let totalStoryPoints = 0;
  let completedStoryPoints = 0;
  let bugCount = 0;
  let completedBugCount = 0;
  let overdueTickets = 0;
  const uniqueAssignees = new Set();
  const ticketDetails = [];

  tickets.forEach(ticket => {
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

  const today = new Date().toISOString().split('T')[0];
  
  return {
    sprintId: `sprint-${today}`,
    sprintName: `Sprint ${today}`,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    totalStoryPoints,
    completedStoryPoints,
    velocity: completedStoryPoints,
    bugCount,
    completedBugCount,
    resourceCount: uniqueAssignees.size,
    totalTickets: tickets.length,
    completedTickets: tickets.filter(t => {
      const status = t.fields.status?.name?.toLowerCase() || '';
      return status.includes('done') || status.includes('complete');
    }).length,
    productivity: parseFloat(productivity),
    overdueTickets,
    ticketDetails: ticketDetails
  };
}

// Auto-save sprint data (only once per day)
async function autoSaveSprintData(sprintData) {
  const today = new Date().toISOString().split('T')[0];
  const dailySprintId = `sprint-${today}`;
  
  // Check if data already exists for today
  try {
    const checkParams = {
      TableName: TABLE_NAME,
      Key: {
        sprintId: dailySprintId
      }
    };
    
    const existingData = await docClient.send(new GetCommand(checkParams));
    
    if (existingData.Item) {
      console.log('Sprint data already exists for today, skipping auto-save');
      return;
    }
  } catch (error) {
    // Item doesn't exist, proceed with save
    console.log('No existing data for today, proceeding with auto-save');
  }
  
  // Save the data
  const params = {
    TableName: TABLE_NAME,
    Item: {
      sprintId: dailySprintId,
      sprintName: sprintData.sprintName,
      timestamp: new Date().toISOString(),
      date: today,
      startDate: sprintData.startDate,
      endDate: sprintData.endDate,
      totalStoryPoints: sprintData.totalStoryPoints,
      completedStoryPoints: sprintData.completedStoryPoints,
      velocity: sprintData.velocity,
      bugCount: sprintData.bugCount,
      completedBugCount: sprintData.completedBugCount,
      resourceCount: sprintData.resourceCount,
      totalTickets: sprintData.totalTickets,
      completedTickets: sprintData.completedTickets,
      productivity: sprintData.productivity,
      overdueTickets: sprintData.overdueTickets,
      ticketDetails: sprintData.ticketDetails || []
    }
  };

  await docClient.send(new PutCommand(params));
  console.log('Sprint data auto-saved successfully');
}
