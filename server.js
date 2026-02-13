import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/jira/search', async (req, res) => {
  const { domain, email, apiToken, jql } = req.body;

  try {
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    
    // First, get field metadata to find story points field
    const fieldsResponse = await fetch(`${domain}/rest/api/3/field`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });
    
    const fields = await fieldsResponse.json();
    console.log('All fields from JIRA:', fields.filter(f => f.name?.toLowerCase().includes('story') || f.name?.toLowerCase().includes('point')));
    
    const storyPointsField = fields.find(f => 
      f.name?.toLowerCase().includes('story point') || 
      f.name?.toLowerCase() === 'story points' ||
      f.name === 'Story Points'
    );
    
    console.log('Story Points Field:', storyPointsField);
    
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
      return res.status(response.status).json({ error: errorText });
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
        console.log('Detected possible story points field from data:', possibleField, '=', firstTicket.fields[possibleField]);
        data.storyPointsFieldId = possibleField;
        data.storyPointsFieldName = 'Story Points (detected)';
      }
    }
    
    console.log('Sending story points field:', data.storyPointsFieldId);
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
