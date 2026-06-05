# JIRA Dashboard - Technical Handoff Guide

## 🎯 QUICK REFERENCE FOR NEW DEVELOPER

### What This Project Does
A React-based JIRA analytics dashboard that displays:
- Real-time sprint progress and ticket status
- Team workload and developer performance
- Story points tracking (3/day target, 15/week goal)
- Historical sprint trends and analytics
- Smart filtering and data visualization

### Key Technology Stack
- **Frontend:** React 18, Vite, Recharts
- **API:** AWS Lambda (JIRA proxy)
- **State:** React useState hooks
- **Styling:** CSS (inline + separate files)

---

## 📁 PROJECT STRUCTURE

```
ProjectSchedule/
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite build configuration
├── index.html                # HTML entry point
├── src/
│   ├── main.jsx              # React app entry
│   ├── App.jsx               # Main app component (state + routing)
│   ├── App.css               # Main app styles
│   ├── index.css             # Global styles
│   └── components/
│       ├── JiraConfig.jsx          # Sprint detection + JQL input
│       ├── JiraConfig.css
│       ├── Analytics.jsx           # KPI cards + metrics
│       ├── Analytics.css
│       ├── Charts.jsx              # Data visualizations
│       ├── Charts.css
│       ├── FilterCards.jsx         # Multi-criteria filtering
│       ├── FilterCards.css
│       ├── TicketList.jsx          # Grouped ticket view
│       ├── TicketList.css
│       ├── SprintTrends.jsx        # Historical analysis
│       ├── SprintTrends.css
│       ├── ResourceQuality.jsx     # Developer workload
│       ├── ResourceQuality.css
│       ├── DeveloperAccordion.jsx  # Individual developer breakdown
│       ├── WeeklyProgress.jsx      # Story points tracker (3/15 goal)
│       └── [no CSS file - inline styles]
└── PROJECT_DOCUMENTATION.md  # This file
```

---

## 🔧 CORE ARCHITECTURE PATTERNS

### 1. State Management Pattern
```javascript
// In App.jsx
const [tickets, setTickets] = useState([]);        // Raw data from JIRA
const [filteredTickets, setFilteredTickets] = useState([]);  // After filters
const [activeFilter, setActiveFilter] = useState({   // Current filter selections
  storyPoints: null,
  dueDate: null,
  assignees: [],
  epics: [],
  statuses: []
});
```

**Pattern:**
- Fetch raw tickets → store in `tickets`
- Apply filters → create `filteredTickets`
- Pass `filteredTickets` to all child components
- Update state when filter changes

### 2. Data Fetching Pattern
```javascript
const fetchTickets = async (jiraConfig) => {
  setLoading(true);
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jql: jiraConfig.jql })
    });
    
    // Parse response (handle AWS Lambda wrapper)
    let data = await response.json();
    if (data.statusCode && data.body) {
      data = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
    }
    
    setTickets(data.issues);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

**Key Points:**
- AWS Lambda wraps response in statusCode + body
- Parse recursive due to JSON stringify in Lambda
- Always handle errors gracefully
- Set loading state during fetch

### 3. Filtering Pattern
```javascript
const handleFilterChange = (filter) => {
  // Build new filter object
  let newFilter = { ...activeFilter };
  
  // Apply specific filter logic
  if (filter.type === 'assignee') {
    // Toggle selection
    const idx = newFilter.assignees.indexOf(filter.value);
    if (idx > -1) newFilter.assignees.splice(idx, 1);
    else newFilter.assignees.push(filter.value);
  }
  
  setActiveFilter(newFilter);
  
  // Re-filter tickets
  let filtered = [...tickets];
  if (newFilter.assignees.length > 0) {
    filtered = filtered.filter(t => 
      newFilter.assignees.includes(t.fields.assignee?.displayName)
    );
  }
  // ... apply other filters ...
  setFilteredTickets(filtered);
};
```

### 4. Calculation Pattern
```javascript
// Used in multiple components
const calculateMetrics = (ticketList) => {
  const completed = ticketList.filter(t => 
    t.fields.status?.name?.toLowerCase().includes('done')
  ).length;
  
  const total = ticketList.length;
  
  return {
    completed,
    pending: total - completed,
    percentage: (completed / total * 100).toFixed(0)
  };
};
```

**Key Points:**
- Status check is case-insensitive
- Uses .includes() for flexibility
- Always default to 0 for empty arrays
- Return object with all needed metrics

---

## 🔌 API INTEGRATION

### API Endpoint
**File:** `src/App.jsx` and `src/components/JiraConfig.jsx`

```javascript
const API_ENDPOINT = 'https://kadj2jyknh.execute-api.us-east-1.amazonaws.com/dev/mps';
```

### Request Format
```javascript
{
  jql: "project = CSAIM AND sprint in openSprints()",
  maxResults: 100,
  fields: ['summary', 'assignee', 'status', 'customfield_10016']  // optional
}
```

### Response Format
```javascript
// Wrapped by AWS Lambda
{
  statusCode: 200,
  body: "{\"issues\": [...]}"  // JSON string, needs parsing
}

// Or direct response
{
  issues: [
    {
      key: "AIML-123",
      fields: {
        summary: "Implement feature X",
        assignee: { displayName: "John Smith" },
        status: { name: "In Progress" },
        customfield_10016: 5,  // story points
        duedate: "2026-06-05",
        customfield_10020: [{ name: "Sprint 45", state: "active" }]
      }
    }
  ]
}
```

### Common Field Mappings
```javascript
// Multiple possible field names for same data
story_points: t.fields?.customfield_10016 || t.fields?.storyPoints || 0
sprint: t.fields?.customfield_10020 || t.fields?.customfield_10010 || []
epic: t.fields?.customfield_10014?.name || 
      t.fields?.customfield_10008?.name || 
      t.fields?.epic?.name || 
      'No Epic'
assignee: t.fields?.assignee?.displayName || 'Unassigned'
status: t.fields?.status?.name || 'Unknown'
duedate: t.fields?.duedate || null
```

**Why Multiple Names?**
- Different JIRA instances use different field IDs
- Custom field IDs vary by configuration
- Fallback ensures compatibility

---

## 📊 KEY COMPONENTS EXPLAINED

### 1. WeeklyProgress.jsx - Story Points Tracker (MOST RECENT)

#### Three Views Available
```javascript
const [chartType, setChartType] = useState('storyPoints');  // NEW
// Other values: 'weekly', 'developer'
```

#### Story Points View Logic
```javascript
// Constants
const STORY_POINTS_PER_DAY = 3;
const STORY_POINTS_PER_WEEK = 15;

// Get tickets due on specific day
const getDayStoryPoints = (day, developer = null) => {
  const dayTickets = tickets.filter(t => {
    if (!isTicketDueOnDay(t, day)) return false;
    if (developer && t.fields.assignee?.displayName !== developer) return false;
    return true;
  });
  
  const completed = dayTickets.filter(t => isCompleted(t));
  const pending = dayTickets.filter(t => !isCompleted(t));
  
  return {
    completed: sum(completed story points),
    pending: sum(pending story points),
    total: completed + pending
  };
};

// Status determination
const isOnTrack = dayStats.total >= STORY_POINTS_PER_DAY;
const isComplete = dayStats.total >= STORY_POINTS_PER_DAY && dayStats.pending === 0;
```

#### Display Elements
1. **Developer Filter Buttons** - Select "All Team" or specific person
2. **Summary Cards** - Completed, Pending, Progress %
3. **Daily Table** - Mon-Fri with points breakdown
4. **Status Badges** - Visual feedback on progress
5. **Weekly Totals Row** - Summary and status

---

### 2. App.jsx - Main Component

#### Key Functions
```javascript
// Auto-detect active sprint on load
useEffect(() => {
  fetchSprintHistory();
  fetchAllEpics();
}, []);  // Runs once on mount

// Main data fetch
const fetchTickets = async (jiraConfig) => {
  // Makes API call and populates state
};

// Filter application
const handleFilterChange = (filter) => {
  // Updates activeFilter and filteredTickets
};
```

#### Component Hierarchy
```
<App>
  ├─ JiraConfig (if no tickets)
  ├─ Analytics
  ├─ Charts
  ├─ SprintTrends
  ├─ WeeklyProgress (passes filteredTickets)
  ├─ ResourceQuality
  ├─ DeveloperAccordion
  ├─ FilterCards (receives activeFilter)
  └─ TicketList
```

---

### 3. FilterCards.jsx - Multi-Filter System

#### Filter Logic
```javascript
// Filter application combines with AND between categories
// Example: (Epic1 OR Epic2) AND (Done OR InProgress) AND (Dev1 OR Dev2)

filtered = filtered.filter(t => {
  // Story Points
  if (filter.storyPoints === 'with') {
    return t.fields.customfield_10016 || t.fields.storyPoints;
  }
  // Assignees (OR logic within category)
  if (filter.assignees.length > 0) {
    return filter.assignees.includes(t.fields.assignee?.displayName);
  }
  // Status (OR logic within category)
  if (filter.statuses.length > 0) {
    return filter.statuses.includes(t.fields.status?.name);
  }
  return true;
});
```

#### Adding New Filter Type
1. Add state in App.jsx
2. Add filter option in FilterCards.jsx
3. Add filter logic in handleFilterChange()
4. Pass filter props to new component

---

## 🎨 STYLING APPROACH

### Global Styles
- **index.css** - CSS reset and typography
- **App.css** - Main layout grid

### Component Styles
- Each component has `ComponentName.css`
- Organized by BEM or utility classes
- Color variables for consistency

### Inline Styles
- WeeklyProgress.jsx uses inline styles
- Charts use Recharts default styling
- Provides easier customization

### Color Palette
```javascript
const colors = {
  completed: '#00875a',  // Green
  pending: '#ff991f',    // Orange
  total: '#0052cc',      // Blue
  background: '#f1f2f4',
  border: '#dfe1e6',
  text: '#172b4d'
};
```

---

## 🔄 COMMON WORKFLOWS

### Workflow 1: Adding New Metric to Analytics

**Step 1:** Calculate in App.jsx
```javascript
const overdueCount = tickets.filter(t => {
  const dueDate = new Date(t.fields.duedate);
  return dueDate < today && !isCompleted(t);
}).length;
```

**Step 2:** Pass to Analytics component
```javascript
<Analytics tickets={filteredTickets} overdueCount={overdueCount} />
```

**Step 3:** Display in Analytics.jsx
```javascript
<div className="metric-card">
  <h3>Overdue</h3>
  <p>{overdueCount}</p>
</div>
```

---

### Workflow 2: Modifying Status Calculation

**Files to Update:**
1. `src/App.jsx` - isCompleted logic
2. `src/components/Analytics.jsx` - metric calculation
3. `src/components/WeeklyProgress.jsx` - for story points
4. Any component that checks status

**Example:**
```javascript
// OLD
const isCompleted = status.includes('done');

// NEW - Add "completed" status
const isCompleted = status.includes('done') || status.includes('completed');
```

---

### Workflow 3: Adding New Chart Type

**Step 1:** Add new component `src/components/NewChart.jsx`
```javascript
import { BarChart, Bar } from 'recharts';

function NewChart({ tickets }) {
  // Calculate data
  // Render chart
}
export default NewChart;
```

**Step 2:** Import in App.jsx
```javascript
import NewChart from './components/NewChart';
```

**Step 3:** Add to render
```javascript
<NewChart tickets={filteredTickets} />
```

---

## 🐛 DEBUGGING TECHNIQUES

### 1. Console Logging
```javascript
console.log('Tickets loaded:', tickets.length);
console.log('Filtered tickets:', filteredTickets.length);
console.log('Active filters:', activeFilter);
```

### 2. React DevTools
- Install React DevTools browser extension
- Inspect component state
- Trace re-renders
- Profile performance

### 3. Network Debugging
- Open DevTools (F12)
- Go to Network tab
- Look for API requests
- Inspect request/response

### 4. Data Inspection
```javascript
// In browser console
// Access data from window
console.log(window.__debug_sprintHistory)
console.log(window.__debug_tickets)
```

### 5. Common Bugs
- **Status check case sensitivity** → Use `.toLowerCase()`
- **Array iteration on null** → Use optional chaining `?.`
- **Infinite loops** → Check dependencies in useEffect
- **Stale data** → Clear cache with Ctrl+F5

---

## 📈 PERFORMANCE TIPS

### 1. Optimize Filtering
```javascript
// BAD - Filter same data multiple times
const completed = tickets.filter(t => isCompleted(t)).length;
const pending = tickets.filter(t => !isCompleted(t)).length;

// GOOD - Single pass
const metrics = tickets.reduce((acc, t) => {
  if (isCompleted(t)) acc.completed++;
  else acc.pending++;
  return acc;
}, { completed: 0, pending: 0 });
```

### 2. Memoize Expensive Calculations
```javascript
import { useMemo } from 'react';

function Component({ tickets }) {
  const metrics = useMemo(() => {
    return calculateComplexMetrics(tickets);
  }, [tickets]);  // Only recalculate if tickets change
}
```

### 3. Limit Chart Data Points
```javascript
// Only show recent sprints
const recentSprints = sprintHistory.slice(-4);
```

### 4. Lazy Load Components
```javascript
const HeavyChart = React.lazy(() => import('./HeavyChart'));
```

---

## 📝 CODE STANDARDS

### Naming Conventions
- **Functions:** camelCase `calculateMetrics()`
- **Components:** PascalCase `WeeklyProgress`
- **Constants:** UPPER_CASE `STORY_POINTS_PER_DAY`
- **Files:** Match component name `WeeklyProgress.jsx`

### Code Comments
```javascript
// For complex logic, explain WHY not WHAT
// BAD
count++;  // increment count

// GOOD
// Skip weekends when counting business days
if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
```

### Error Handling
```javascript
try {
  const response = await fetch(API_ENDPOINT, {...});
  // ... process response
} catch (err) {
  console.error('Failed to fetch tickets:', err);
  setError('Unable to load tickets. Please try again.');
} finally {
  setLoading(false);
}
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Update API_ENDPOINT to production URL
- [ ] Change JIRA project name if needed
- [ ] Run `npm run build` successfully
- [ ] Test all components locally
- [ ] Verify all filters work
- [ ] Check story points calculations
- [ ] Test on different screen sizes
- [ ] Clear browser cache test
- [ ] Document any configuration changes
- [ ] Create .env file with constants
- [ ] Deploy dist/ folder
- [ ] Test live application
- [ ] Set up monitoring
- [ ] Create backup of configuration

---

## 📞 HANDOFF NOTES

### What Works Well
✅ Sprint detection is reliable
✅ Filtering system is flexible
✅ Charts render performance well
✅ Mobile responsive design
✅ Error handling is comprehensive

### Known Limitations
⚠️ Large datasets (1000+ tickets) slow down
⚠️ Custom JIRA fields may not align
⚠️ No offline mode
⚠️ No data persistence/caching
⚠️ Export to CSV not implemented

### Future Enhancements
- [ ] Add data export (CSV, PDF)
- [ ] Implement data caching
- [ ] Add team comparison mode
- [ ] Custom report generation
- [ ] Slack integration for alerts
- [ ] Email notifications
- [ ] Dark mode theme

### Testing Guide
```bash
# Test locally
npm run dev
# Access http://localhost:5173/

# Test build
npm run build
npm preview
# Access http://localhost:4173/

# Test with specific sprint
# Modify JQL in JiraConfig.jsx
```

---

**Document Version:** 1.0  
**For:** New Developer  
**Date:** June 2, 2026
