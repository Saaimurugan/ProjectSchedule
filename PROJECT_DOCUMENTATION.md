# JIRA Dashboard - Project Documentation

## 📋 TABLE OF CONTENTS
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Installation & Setup](#installation--setup)
5. [Component Overview](#component-overview)
6. [Features & Functionality](#features--functionality)
7. [Data Flow](#data-flow)
8. [User Guide](#user-guide)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## 1. PROJECT OVERVIEW

### Purpose
- **JIRA Dashboard** is a comprehensive project management and analytics tool built for tracking sprint progress, team performance, and story point completion
- Provides real-time insights into ticket status, developer productivity, resource allocation, and sprint trends
- Helps teams visualize workflow metrics and maintain accountability for sprint goals

### Key Objectives
- Track sprint progress with detailed analytics
- Monitor developer productivity and workload distribution
- Visualize story points completion (3 points/day, 15 points/week target)
- Identify bottlenecks and resource quality issues
- Provide trending analysis across multiple sprints
- Enable data-driven decision making for project managers

### Target Users
- Project Managers & Scrum Masters
- Development Team Leads
- Sprint Planning Teams
- Executive Stakeholders

---

## 2. SYSTEM ARCHITECTURE

### High-Level Architecture
```
┌─────────────────────────────────────────────┐
│          React Frontend (Vite)              │
│  (Dashboard UI with Real-time Data)         │
└──────────────┬──────────────────────────────┘
               │
               ├─ JIRA API (AWS Lambda Gateway)
               │  └─ Sprint Data, Tickets, Epics
               │
               ├─ Local State Management
               │  └─ Tickets, Filters, Analytics
               │
               └─ Real-time Updates
                  └─ Auto-refresh Sprint Detection
```

### Data Flow Architecture
1. **User Input** → JQL Query (JIRA Configuration)
2. **API Call** → AWS Lambda Endpoint
3. **Data Fetch** → JIRA Server Response
4. **State Management** → React useState hooks
5. **Filtering & Calculations** → Analytics Processing
6. **Component Rendering** → Dashboard Visualization

### State Management Structure
```javascript
Main App State:
├── tickets[] - All fetched JIRA tickets
├── filteredTickets[] - Tickets after filter application
├── loading - Loading state indicator
├── error - Error message display
├── config - JIRA configuration details
├── currentSprintData - Current sprint metrics
├── sprintHistory[] - Historical sprint data
├── allEpics[] - All project epics
└── activeFilter - Current filter selections
    ├── storyPoints
    ├── dueDate
    ├── assignees[]
    ├── epics[]
    └── statuses[]
```

---

## 3. TECHNOLOGY STACK

### Frontend Framework
- **React 18.2.0** - UI component library and state management
- **Vite 5.0.0** - Build tool and development server
- **React DOM 18.2.0** - React rendering library

### Data Visualization
- **Recharts 2.10.0** - Charts and graph rendering library
  - Bar charts for sprint progress
  - Line charts for trend analysis
  - Composed charts for multi-axis visualization
  - Pie charts for status breakdown

### Backend & APIs
- **Express.js 4.18.2** - Optional local server (for future backend features)
- **CORS 2.8.5** - Cross-origin resource sharing
- **AWS Lambda** - Serverless API gateway for JIRA calls

### Development Tools
- **@vitejs/plugin-react 4.2.1** - React plugin for Vite
- **ES6 Modules** - Modern JavaScript module system

---

## 4. INSTALLATION & SETUP

### Prerequisites
```
- Node.js (v16 or higher)
- npm (v8 or higher)
- Git
- Access to JIRA instance
- AWS Lambda endpoint configured
```

### Step-by-Step Installation

#### 1. Clone/Extract Project
```bash
cd ProjectSchedule
```

#### 2. Install Dependencies
```bash
npm install
```
This installs:
- React and React-DOM
- Vite and React plugin
- Recharts for visualizations
- Express and CORS (for future use)

#### 3. Configure API Endpoint
Update the API endpoint in `src/components/JiraConfig.jsx` and `src/App.jsx`:
```javascript
const API_ENDPOINT = 'https://kadj2jyknh.execute-api.us-east-1.amazonaws.com/dev/mps';
```

#### 4. Start Development Server
```bash
npm run dev
```
Output:
```
➜ Local:   http://localhost:5173/
➜ Network: http://192.168.62.95:5173/
```

#### 5. Build for Production
```bash
npm run build
```
Creates optimized build in `dist/` folder

---

## 5. COMPONENT OVERVIEW

### 5.1 JiraConfig Component
**File:** `src/components/JiraConfig.jsx`

**Purpose:**
- Initial JIRA connection and configuration
- Automatic sprint detection
- JQL query input and validation

**Features:**
- Auto-detects current/active sprint from JIRA
- Allows manual JQL query entry
- Displays sprint status with visual feedback
- "Fetch Tickets" button triggers data loading
- Handles API errors gracefully

**Key Functions:**
- `runDetection()` - Auto-detects active sprint
- `handleSubmit()` - Submits JQL and fetches tickets
- `handleRefresh()` - Manually refreshes sprint detection

**Display Elements:**
- Sprint auto-detection status badge
- JQL query input field
- Refresh button
- Fetch Tickets button

---

### 5.2 Analytics Component
**File:** `src/components/Analytics.jsx`

**Purpose:**
- Calculate and display overall sprint metrics
- Show key performance indicators (KPIs)
- Display sprint health and status summary

**Key Metrics Calculated:**
- **Total Tickets** - Count of all tickets in sprint
- **Completed Tickets** - Tickets marked as Done/Complete
- **Pending Tickets** - Remaining tickets to complete
- **Completion Rate** - Percentage of completed tickets
- **Story Points Total** - Sum of all ticket story points
- **Story Points Completed** - Sum of completed story points
- **Bug Count** - Number of bug-type tickets
- **Overdue Tickets** - Tickets past due date
- **Resource Count** - Number of active developers
- **Top Epic Concentration** - Most work-heavy epic
- **Days Remaining** - Business days left in sprint

**Display Format:**
- Large metric cards with color coding
- Green for completed
- Orange for pending
- Blue for total
- Red for overdue/risks

**KPI Cards Shown:**
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Completion  │  │Story Points  │  │  Bugs/Risk   │
│   65% ✓      │  │  45/80 ✓     │  │   3 Issues   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

### 5.3 Charts Component
**File:** `src/components/Charts.jsx`

**Purpose:**
- Visualize ticket distribution across different dimensions
- Provide quick visual insights into project status

**Chart Types:**

#### Status Distribution Pie Chart
- Shows tickets by status (To Do, In Progress, Done, etc.)
- Pie chart with percentages
- Color-coded by status

#### Assignee Distribution Bar Chart
- Horizontal bar chart
- Shows tickets assigned to each developer
- Sortable by ticket count
- Identifies workload imbalance

#### Epic Distribution
- Displays work distributed across epics
- Shows which epics have most tickets
- Helps identify project concentration areas

#### Due Date Status
- Categorizes tickets by due date (Overdue, Today, Tomorrow, Future)
- Visual timeline of upcoming deadlines
- Color coding:
  - Red = Overdue
  - Orange = Today
  - Yellow = Tomorrow
  - Green = Future

**Interactive Features:**
- Hover to see exact numbers
- Color-coded categories
- Responsive sizing

---

### 5.4 FilterCards Component
**File:** `src/components/FilterCards.jsx`

**Purpose:**
- Enable users to filter tickets by multiple criteria
- Dynamically update displayed data based on selections

**Available Filters:**

1. **Story Points Filter**
   - With Story Points: Show tickets with defined story points
   - Without Story Points: Show tickets without story points
   
2. **Due Date Filter**
   - With Due Date: Show tickets with defined due dates
   - Without Due Date: Show tickets without due dates

3. **Assignee Filter**
   - Multi-select dropdown
   - Show tickets assigned to selected developers
   - "All" or specific team members

4. **Epic Filter**
   - Multi-select epic selection
   - Filter by project epics
   - "All" or specific epics

5. **Status Filter**
   - Multi-select status filter
   - To Do, In Progress, In Review, Done, etc.
   - "All" or specific statuses

**Filter Application Logic:**
- All selected filters combine with AND logic
- Selected values within a category combine with OR logic
- Example: (Epic1 OR Epic2) AND (Done OR In Progress)

---

### 5.5 TicketList Component
**File:** `src/components/TicketList.jsx`

**Purpose:**
- Display detailed list of all tickets/issues
- Group tickets by specified dimension (status, assignee, epic, etc.)
- Provide quick access to ticket details

**Display Format:**
- **Grouped Layout** - Tickets organized in collapsible sections
- **Table View** - Column headers for sorting
- **Ticket Information Shown:**
  - Ticket Key (e.g., AIML-123)
  - Summary/Title
  - Assignee
  - Status
  - Story Points
  - Due Date
  - Epic
  - Issue Type
  - Priority

**Grouping Options:**
- By Status (To Do, In Progress, Done)
- By Assignee (Developer name)
- By Epic (Project epic)
- By Priority (Critical, High, Medium, Low)

**Color Coding:**
- Green = Done/Completed
- Orange = In Progress
- Gray = To Do/Blocked
- Red = Overdue

---

### 5.6 SprintTrends Component
**File:** `src/components/SprintTrends.jsx`

**Purpose:**
- Track sprint performance over multiple sprints
- Identify trends and patterns
- Compare current sprint to historical data

**Key Metrics:**
- **Velocity** - Story points completed per sprint
- **Burndown** - Tickets remaining over sprint duration
- **Completion Rate Trend** - How completion percentage changes across sprints
- **Sprint Duration** - Days in each sprint

**Visualizations:**
- **Line Chart** - Velocity trend over time
- **Comparison Chart** - Current sprint vs previous sprints
- **Burndown Curve** - Ideal vs actual completion

**Insights Provided:**
- Team velocity trends (increasing/decreasing)
- Sprint consistency indicators
- Predictability metrics
- Historical performance comparison

---

### 5.7 ResourceQuality Component
**File:** `src/components/ResourceQuality.jsx`

**Purpose:**
- Evaluate developer productivity and code quality
- Monitor resource allocation and workload

**Metrics Calculated:**
- **Tickets per Developer** - Workload distribution
- **Story Points per Developer** - Effort distribution
- **Completion Rate** - Individual developer completion percentage
- **Bug Assignment** - Bugs assigned to each developer
- **Quality Score** - Based on bug ratio and completion

**Displays:**
- Developer cards with metrics
- Workload balance visualization
- Quality indicators
- Performance trends

**Color Coding:**
- Green = Good quality (high completion, low bugs)
- Orange = Average
- Red = Issues (low completion or high bugs)

---

### 5.8 DeveloperAccordion Component
**File:** `src/components/DeveloperAccordion.jsx`

**Purpose:**
- Display detailed breakdown of each developer's work
- Show assigned tickets and progress per developer

**Features:**
- Expandable accordion for each developer
- Shows:
  - Assigned tickets list
  - Total story points assigned
  - Completed story points
  - Completion percentage
  - Epic distribution of their work
  - Due date breakdown

**Display Format:**
```
Developer: John Smith
├─ Total Tickets: 8
├─ Story Points: 21 (13 completed)
├─ Completion: 62%
├─ Epics:
│  ├─ Epic1: 5 tickets
│  └─ Epic2: 3 tickets
└─ Due Dates:
   ├─ Overdue: 1
   ├─ Today: 2
   └─ Future: 5
```

---

### 5.9 WeeklyProgress Component (Enhanced with Story Points)
**File:** `src/components/WeeklyProgress.jsx`

**Purpose:**
- Track weekly sprint progress with detailed story points breakdown
- Monitor daily goals and completion status
- Three views: Story Points (NEW), Weekly Overview, By Developer

#### View 1: Story Points Tracker (NEW)
**Target:** 3 story points/day = 15 story points/week

**Features:**
- **Developer Filter** - Filter by team member or "All Team"
- **Weekly Summary Cards:**
  - Completed (in green)
  - Pending (in orange)
  - Progress % (towards 15-point goal)

- **Daily Breakdown Table (Mon-Fri):**
  - Completed story points + ticket count
  - Pending story points + ticket count
  - Total story points
  - Target comparison (3 pts/day)
  - Status indicator:
    - ✓ Complete (green) - Met target with all done
    - On Track (yellow) - Met 3-point target
    - Behind (red) - Below target

- **Weekly Totals Row:**
  - Summary of entire week
  - Status badge for week completion

**Example Output:**
```
Day: Mon 2 Jun
├─ Completed: 5 (2 tickets)
├─ Pending: 1 (1 ticket)
├─ Total: 6 points
├─ Target: 3
└─ Status: ✓ Complete

...repeat for Tue-Fri...

Weekly Total:
├─ Completed: 13
├─ Pending: 2
├─ Total: 15 points
├─ Target: 15
└─ Status: On Track
```

#### View 2: Weekly Overview
- Composed bar chart showing completed vs pending tickets
- Stacked bars for each week
- Line overlay showing total ticket count
- Weekly statistics summary cards
- 4-week historical view

#### View 3: By Developer
- Developer comparison chart
- Shows completed tickets per developer per week
- Bar chart with different colors for each week
- Developer summary cards showing:
  - Total tickets
  - Completed count
  - Pending count

---

## 6. FEATURES & FUNCTIONALITY

### 6.1 Core Features

#### Sprint Data Fetching
- **Auto-Detection:** Automatically finds current active sprint
- **Manual Override:** Allow custom JQL queries
- **Real-time Update:** Fetches latest data from JIRA
- **Error Handling:** Graceful error messages for connection issues

#### Data Filtering
- **Multi-criteria Filtering:** Combine multiple filters simultaneously
- **Story Points Filter:** With/without story points
- **Date Filter:** With/without due dates
- **Assignee Filter:** Select specific developers
- **Epic Filter:** Filter by project epics
- **Status Filter:** Filter by ticket status
- **Filter Persistence:** Filters apply across all components

#### Analytics & Metrics
- **Completion Tracking:** Percentage complete, pending, and done
- **Story Point Metrics:** Total, completed, and pending story points
- **Resource Metrics:** Developer count, workload distribution
- **Time Metrics:** Days remaining, business days calculation
- **Quality Metrics:** Bug count, overdue tickets

#### Visualization
- **Bar Charts:** Status and assignee distribution
- **Pie Charts:** Status breakdown and proportions
- **Line Charts:** Trends over multiple sprints
- **Composed Charts:** Multiple data types on one chart
- **Tables:** Detailed tabular data view
- **Cards:** Summary metrics display

#### Sprint Trending
- **Historical Data:** Compare current sprint to past sprints
- **Velocity Tracking:** Story points completed over time
- **Burndown Curves:** Ideal vs actual completion rate
- **Consistency Metrics:** Sprint-to-sprint comparison

---

### 6.2 Advanced Features

#### Story Points Tracker (3/15 Daily/Weekly Goal)
- **Daily Targets:** Track 3 points/day completion
- **Weekly Goals:** 15 points/week target
- **Status Indicators:** Visual feedback on progress
- **Developer Breakdown:** Per-person daily tracking
- **Automatic Calculation:** Reads from JIRA customfield_10016

#### Resource Quality Analysis
- **Workload Balance:** Identifies overloaded/underutilized developers
- **Quality Scoring:** Bug ratio and completion metrics
- **Performance Trending:** Historical developer performance
- **Capacity Planning:** Identify resource constraints

#### Developer Accordion View
- **Individual Dashboards:** Each developer's detailed breakdown
- **Epic Distribution:** Work across different epics
- **Date Breakdown:** Due date categorization
- **Quick Access:** Expandable sections for easy navigation

#### Smart Data Parsing
- **Multiple Field Support:** Handles various JIRA field names
- **Custom Fields:** Supports customfield_10016 (story points)
- **Sprint Detection:** Finds active/closed/future sprints
- **Epic Resolution:** Multiple epic field lookup paths

---

## 7. DATA FLOW

### 7.1 Ticket Fetching Flow

```
User Input (JQL Query)
        ↓
JiraConfig Component
        ↓
Validate JQL + Detect Sprint
        ↓
API Call to AWS Lambda
        ↓
JIRA Server Returns Tickets
        ↓
Parse Response (Handle multiple formats)
        ↓
Store in App State (tickets[])
        ↓
Initialize Filtered Tickets
        ↓
Render All Components
```

### 7.2 Filtering Flow

```
User Selects Filters
        ↓
FilterCards Component
        ↓
Update activeFilter State
        ↓
Apply Filter Logic:
├─ Story Points Filter
├─ Due Date Filter
├─ Assignee Filter
├─ Epic Filter
└─ Status Filter
        ↓
Create Filtered Array (filteredTickets[])
        ↓
Update All Child Components
        ↓
Re-render with Filtered Data
```

### 7.3 Analytics Calculation Flow

```
Filtered Tickets Array
        ↓
Calculate Metrics:
├─ Count tickets by status
├─ Sum story points
├─ Count bugs
├─ Find overdue items
├─ Count unique assignees
└─ Find top epic
        ↓
Format for Display
        ↓
Pass to Components:
├─ Analytics (KPI cards)
├─ Charts (visualizations)
├─ SprintTrends (trends)
└─ WeeklyProgress (tables)
        ↓
Render Updated UI
```

---

## 8. USER GUIDE

### 8.1 Getting Started

#### Step 1: Start the Application
```bash
npm run dev
```
Access at `http://localhost:5173/`

#### Step 2: Connect to JIRA
1. The dashboard auto-detects the current sprint
2. Review the detected sprint name
3. Modify JQL query if needed (optional)
4. Click "Fetch Tickets" button

#### Step 3: Review Dashboard
Dashboard automatically displays:
- Analytics cards with key metrics
- Status distribution charts
- Assignee workload
- Ticket list grouped by status
- Developer accordion with details

---

### 8.2 Navigating Components

#### View 1: Analytics Overview
- **Top Section:** Key performance metrics
- **Purpose:** Get quick sprint health snapshot
- **Metrics:** Completion %, story points, bugs, resources

#### View 2: Charts
- **Status Distribution:** See work by status
- **Assignee Distribution:** Workload by person
- **Due Date Status:** Timeline of deadlines
- **Interactive:** Hover for exact numbers

#### View 3: Filters
- **Filter Cards:** Click to select criteria
- **Multi-select:** Choose multiple values
- **Real-time:** Updates apply immediately
- **Combination:** All filters work together

#### View 4: Ticket List
- **Grouped View:** Organized by dimension
- **Expandable:** Click sections to expand
- **Details:** Full ticket information
- **Sort:** Organized by selected grouping

#### View 5: Sprint Trends
- **Historical Data:** Previous sprints comparison
- **Velocity Chart:** Story points trend
- **Burndown:** Progress over sprint duration
- **Insights:** Team performance patterns

#### View 6: Resource Quality
- **Developer Cards:** Individual metrics
- **Quality Score:** Based on performance
- **Workload:** Ticket and story point count
- **Balance:** Identifies imbalance

#### View 7: Developer Accordion
- **Expandable Sections:** One per developer
- **Details:** Assigned tickets breakdown
- **Progress:** Personal completion %
- **Distribution:** Work across epics/dates

#### View 8: Weekly Progress
- **Story Points Tab:** NEW - Daily 3-point tracking
- **Weekly Tab:** 4-week overview
- **Developer Tab:** By-person breakdown

---

### 8.3 Using Story Points Tracker

#### Story Points Tab Usage

**Step 1: Select Developer**
- Click "All Team" to see combined view
- Click developer name to filter their story points

**Step 2: Review Summary Cards**
- **Completed:** Shows green story points done
- **Pending:** Shows orange story points remaining
- **Progress:** Percentage towards 15-point goal

**Step 3: Check Daily Breakdown**
- Review each day (Mon-Fri)
- See completed vs pending points
- Check status indicator
- Green bg = day complete
- Yellow bg = on track (≥3 points)
- White bg = behind (<3 points)

**Step 4: Analyze Weekly Total**
- Check if week will meet 15-point target
- Identify which days are behind
- Plan for catch-up if needed

---

### 8.4 Filtering Tickets

#### Multi-Filter Example

**Goal:** Find all In-Progress and Done tickets with story points for Epic-1

**Steps:**
1. Click "Story Points" → Select "With Story Points"
2. Click "Epic" → Select "Epic-1"
3. Click "Status" → Select "In Progress" and "Done"
4. Dashboard updates showing only matching tickets

**Result:**
- All other components update filtered data
- Charts show subset of data
- Ticket list shows matching tickets only
- Metrics recalculate based on filtered set

---

## 9. CONFIGURATION

### 9.1 API Configuration

#### AWS Lambda Endpoint
**File:** `src/App.jsx` and `src/components/JiraConfig.jsx`

```javascript
const API_ENDPOINT = 'https://kadj2jyknh.execute-api.us-east-1.amazonaws.com/dev/mps';
```

**Change by:**
1. Replace URL with your Lambda endpoint
2. Ensure Lambda returns JIRA ticket data
3. Test connection after change

#### JIRA Project Configuration
**File:** `src/components/JiraConfig.jsx`

```javascript
// Default JQL query
jql: 'project = CSAIM AND sprint in openSprints()'
```

**Modify:**
1. Change project name (CSAIM)
2. Adjust sprint filter as needed
3. Add additional JQL conditions

---

### 9.2 Story Points Configuration

#### Daily Target
**File:** `src/components/WeeklyProgress.jsx`

```javascript
const STORY_POINTS_PER_DAY = 3;
const STORY_POINTS_PER_WEEK = STORY_POINTS_PER_DAY * 5; // 15
```

**Change by:**
1. Update constant value
2. Automatically recalculates all thresholds
3. Status indicators adjust based on new target

#### Story Points Field Mapping
**File:** `src/components/WeeklyProgress.jsx`

```javascript
const getStoryPoints = (ticket) => {
  return ticket.fields?.customfield_10016 || 
         ticket.fields?.storyPoints || 0;
};
```

**Add Support for:**
1. Different field names
2. Custom fields
3. Fallback values

---

### 9.3 Custom Styling

#### Color Scheme
**File:** Various `.css` files

```css
/* Standard colors used */
--completed: #00875a (green)
--pending: #ff991f (orange)
--total: #0052cc (blue)
--background: #f1f2f4
--border: #dfe1e6
--text: #172b4d
```

**Change by:**
1. Modify color values in CSS files
2. Update inline styles in components
3. Maintain contrast for accessibility

#### Responsive Breakpoints
- Desktop: Full width layout
- Tablet: Adjusted grid columns
- Mobile: Single column stack

---

## 10. TROUBLESHOOTING

### 10.1 Common Issues & Solutions

#### Issue: "Detecting sprint..." hangs
**Cause:** API endpoint not responding
**Solution:**
1. Check internet connection
2. Verify AWS Lambda is running
3. Check Lambda CloudWatch logs
4. Verify JIRA project name in JQL

#### Issue: No tickets load
**Cause:** JIRA project/sprint not found
**Solution:**
1. Verify sprint exists in JIRA
2. Check project name spelling (case-sensitive)
3. Try manual JQL query
4. Check JIRA access permissions

#### Issue: Story points showing as 0
**Cause:** Field mapping incorrect
**Solution:**
1. Verify customfield_10016 exists in JIRA
2. Check if tickets have story points assigned
3. Inspect API response in browser console
4. Update field mapping if needed

#### Issue: Charts not rendering
**Cause:** Recharts library issue
**Solution:**
1. Clear browser cache
2. Reinstall dependencies: `npm install`
3. Rebuild project: `npm run build`
4. Check console for JavaScript errors

#### Issue: Filters not working
**Cause:** Invalid filter state
**Solution:**
1. Refresh page
2. Re-fetch tickets
3. Clear all filters and reapply
4. Check browser console for errors

#### Issue: Slow performance with many tickets
**Cause:** Too many tickets loaded
**Solution:**
1. Refine JQL query to limit results
2. Add sprint constraint to JQL
3. Filter to specific assignees
4. Limit to specific epics

---

### 10.2 Debug Mode

#### Enable Console Logging
**File:** `src/App.jsx`

```javascript
// Uncomment for debugging
console.log('tickets:', tickets);
console.log('filteredTickets:', filteredTickets);
console.log('activeFilter:', activeFilter);
```

#### Check API Response
Browser Console (F12):
```javascript
// See fetched data
window.__debug_sprintHistory
window.__debug_tickets
```

#### Browser DevTools Tips
1. Open DevTools: F12
2. Check Network tab for API calls
3. Check Console tab for errors
4. Check Application > Storage for cached data

---

### 10.3 Performance Optimization

#### For Large Datasets (1000+ tickets)

1. **Optimize JQL Query**
   ```javascript
   // Instead of
   'project = CSAIM'
   
   // Use
   'sprint = "Current Sprint" AND status != Closed'
   ```

2. **Implement Pagination**
   - Add maxResults parameter to API
   - Load tickets in batches

3. **Cache Data**
   - Store previous API responses
   - Reduce redundant calls

4. **Optimize Re-renders**
   - Use React.memo for components
   - Implement useMemo for calculations

---

### 10.4 Deployment

#### Build for Production
```bash
npm run build
```

**Output:** Optimized build in `dist/` folder

#### Deploy to Server
```bash
# Copy dist folder to web server
scp -r dist/ user@server:/var/www/jira-dashboard/

# Or use hosting service
npm run build
# Deploy dist/ folder to Vercel, Netlify, etc.
```

#### Environment Configuration
**Create `.env` file:**
```
VITE_API_ENDPOINT=https://your-api-endpoint.com/mps
VITE_JIRA_PROJECT=YOUR_PROJECT_NAME
```

**Update `src/App.jsx`:**
```javascript
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;
```

---

## 📊 SUMMARY OF KEY FEATURES

| Feature | Component | Purpose |
|---------|-----------|---------|
| Sprint Detection | JiraConfig | Auto-find active sprint |
| Ticket Fetching | App | Load tickets from JIRA |
| KPI Analytics | Analytics | Key metrics display |
| Status Visualization | Charts | Pie/bar charts for status |
| Smart Filtering | FilterCards | Multi-criteria filtering |
| Detailed List | TicketList | Grouped ticket view |
| Trend Analysis | SprintTrends | Historical comparison |
| Resource Analysis | ResourceQuality | Developer workload |
| Developer View | DeveloperAccordion | Individual breakdown |
| **Story Points Tracker** | **WeeklyProgress** | **3pts/day, 15pts/week target** |

---

## 🚀 QUICK START COMMANDS

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm preview
```

---

## 📞 SUPPORT & MAINTENANCE

### Regular Maintenance Tasks
- Update dependencies: `npm update`
- Clear cache if issues: Delete node_modules, run `npm install`
- Monitor API performance in AWS Lambda
- Review and optimize slow queries
- Update JIRA field mappings if structure changes

### When Transferring Project
1. Document API endpoint location
2. Note JIRA project name and access
3. Document any customizations made
4. Save configuration values (.env file)
5. Test on new environment before deployment

---

**Document Version:** 1.0  
**Last Updated:** June 2, 2026  
**Project:** JIRA Dashboard - MPS
