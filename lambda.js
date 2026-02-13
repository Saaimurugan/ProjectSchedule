// AWS Lambda handler for JIRA API proxy

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Parse body - handle both direct invocation and API Gateway
    let body;
    if (typeof event.body === 'string') {
      body = JSON.parse(event.body);
    } else if (event.body) {
      body = event.body;
    } else {
      // Direct invocation - event itself is the body
      body = event;
    }

    const { domain, email, apiToken, jql } = body;

    console.log('Received request:', { domain, email: email ? 'present' : 'missing', apiToken: apiToken ? 'present' : 'missing', jql });

    if (!domain || !email || !apiToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: domain, email, apiToken',
          received: { domain: !!domain, email: !!email, apiToken: !!apiToken }
        })
      };
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
    
    const response = await fetch(
      `${domain}/rest/api/3/search/jql`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql: jql || 'sprint = "AIML Sprint 44" ORDER BY created DESC',
          maxResults: 100,
          fields: ['*all']
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: errorText })
      };
    }

    const data = await response.json();
    
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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
