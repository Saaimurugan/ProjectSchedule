# JIRA Dashboard - Quick Start Guide for New Developer

## ⚡ Get Running in 5 Minutes

### Prerequisites
- Node.js v16+
- npm v8+
- Git

### Installation
```bash
cd ProjectSchedule
npm install
npm run dev
```

**Result:** Dashboard opens at `http://localhost:5173/`

---

## 📖 In 10 Minutes: Understand What It Does

### The Core Idea
- **Problem:** Jira is hard to visualize. Teams need quick insights into sprint progress.
- **Solution:** Real-time analytics dashboard pulling from Jira API
- **Key Feature (NEW):** Story points tracker with 3/day, 15/week targets

### Five Main Screens

| Screen | Shows | Purpose |
|--------|-------|---------|
| **Analytics** | KPI cards | Quick health snapshot |
| **Charts** | Pie/bar charts | Visual breakdown by status/assignee |
| **Filters** | Filter controls | Multi-criteria filtering |
| **Weekly Progress** | Daily table | Story points tracking (3pts/day) |
| **Ticket List** | All tickets | Detailed list grouped by status |

### Real User Flow
1. Click "Fetch Tickets" → Loads sprint data
2. See dashboard fills with charts/metrics
3. Click filters to narrow view
4. Switch to "Story Points" tab to see daily targets
5. Review "By Developer" tab for team breakdown

---

## 🔧 Under the Hood (5 Key Files)

### 1. `src/App.jsx` - The Brain
- Fetches tickets from Jira API
- Manages all state (tickets, filters, loading)
- Passes data to child components
- Handles filter changes

**Key Concept:** State flows DOWN, callbacks flow UP

### 2. `src/components/JiraConfig.jsx` - The Gateway
- Auto-detects current sprint
- Takes JQL query input
- Has "Fetch Tickets" button
- Handles API connection

### 3. `src/components/WeeklyProgress.jsx` - The NEW Feature ⭐
- **Story Points Tracker**
- Shows 3pts/day and 15pts/week targets
- Three views: Story Points (NEW), Weekly, By Developer
- Color codes: Green (complete), Yellow (on-track), White (behind)

### 4. `src/components/FilterCards.jsx` - The Filter System
- Story Points, Due Date, Assignee, Epic, Status
- Multi-select support
- Updates all charts instantly

### 5. `src/components/Analytics.jsx` - The Summary
- Calculates key metrics
- Shows completion %, story points, bugs, resources
- Large metric cards at top

---

## 🎯 How Data Flows (The Pipeline)

```
┌─────────────────┐
│  User Clicks    │
│  Fetch Tickets  │
└────────┬────────┘
         ↓
┌─────────────────────────┐
│  App.jsx fetchTickets() │
│  Calls AWS Lambda API   │
└────────┬────────────────┘
         ↓
┌──────────────────────┐
│  JIRA Server Returns │
│  Raw Ticket Objects  │
└────────┬─────────────┘
         ↓
┌───────────────────────┐
│  Parse Response       │
│  Handle Lambda Wrap   │
│  Store in State       │
└────────┬──────────────┘
         ↓
┌──────────────────────────┐
│  All Components Render   │
│  With Filtered Data      │
└─────────────────────────┘
```

---

## 🎨 Common Task: Add a New Metric

### Task: Show average story points per developer

#### Step 1: Calculate in App.jsx
```javascript
const avgStoryPointsPerDev = {};
filteredTickets.forEach(t => {
  const dev = t.fields.assignee?.displayName || 'Unassigned';
  avgStoryPointsPerDev[dev] = (avgStoryPointsPerDev[dev] || 0) + 
                              (t.fields.customfield_10016 || 0);
});
```

#### Step 2: Pass to ResourceQuality component
```javascript
<ResourceQuality 
  tickets={filteredTickets} 
  avgStoryPoints={avgStoryPointsPerDev}
/>
```

#### Step 3: Display in component
```javascript
Object.entries(avgStoryPoints).map(([dev, points]) => (
  <div key={dev}>
    <p>{dev}: {points} points avg</p>
  </div>
))
```

**Done!** New metric appears in dashboard.

---

## 🐛 Troubleshooting Guide

### Problem: "Detecting sprint..." spins forever
```
❌ FIX: Check AWS Lambda is running
❌ FIX: Verify JIRA project name in JiraConfig.jsx
❌ FIX: Check your internet connection
```

### Problem: No charts appear
```
❌ FIX: Clear cache (Ctrl+Shift+Del)
❌ FIX: npm install (reinstall dependencies)
❌ FIX: Check browser console for errors (F12)
```

### Problem: Story points showing 0
```
❌ FIX: Check customfield_10016 exists in JIRA
❌ FIX: Verify tickets have story points assigned
❌ FIX: Update field mapping in WeeklyProgress.jsx
```

### Problem: Filters don't work
```
❌ FIX: Refresh page
❌ FIX: Clear all filters and reapply
❌ FIX: Check console for JavaScript errors
```

---

## 🧪 Quick Testing Checklist

After any change:
```
□ Can you fetch tickets? (click button)
□ Do charts render? (look at page)
□ Do filters work? (click filter options)
□ Can you view story points? (click Story Points tab)
□ Does developer filter work? (select developer)
□ Mobile responsive? (F12 → toggle device)
```

---

## 🚀 Before You Deploy

```bash
# 1. Test locally
npm run dev

# 2. Build for production
npm run build

# 3. Test build locally
npm preview

# 4. Check for errors
npm run build 2>&1 | grep error

# 5. Deploy dist/ folder to server
# Upload dist/ contents to web server
```

---

## 📊 Component Dependency Map

```
App.jsx (Main)
├─ JiraConfig (input)
├─ Analytics (metrics)
├─ Charts (visualizations)
├─ SprintTrends (history)
├─ WeeklyProgress (story points) ← NEW
├─ ResourceQuality (workload)
├─ DeveloperAccordion (by person)
├─ FilterCards (controls)
└─ TicketList (details)

Data flows: App → Child Components
Events flow: Child → App callbacks
```

---

## 🔑 Key Files to Know

| File | Purpose | When to Edit |
|------|---------|--------------|
| `src/App.jsx` | Main logic | Add metrics, state |
| `src/components/WeeklyProgress.jsx` | Story points | Change 3/15 targets |
| `src/components/FilterCards.jsx` | Filters | Add filter types |
| `package.json` | Dependencies | Add libraries |
| `vite.config.js` | Build config | Change build settings |

---

## 🌐 API Integration

### Endpoint Location
**File:** `src/App.jsx` line ~29

```javascript
const API_ENDPOINT = 'https://kadj2jyknh.execute-api.us-east-1.amazonaws.com/dev/mps';
```

### Change API Endpoint
1. Update URL above
2. Test "Fetch Tickets" works
3. Check browser Network tab for request/response

### Response Structure
```javascript
{
  statusCode: 200,
  body: JSON.stringify({
    issues: [
      {
        key: "AIML-123",
        fields: {
          summary: "Task name",
          status: { name: "In Progress" },
          customfield_10016: 5,  // story points
          duedate: "2026-06-05",
          assignee: { displayName: "John" }
        }
      }
    ]
  })
}
```

---

## 🎓 Learning Resources

### To Understand React
- State: `const [state, setState] = useState([])`
- Components: Functions returning JSX
- Props: Data passed to components
- Hooks: useState, useEffect, useMemo

### To Understand Recharts
- Import from `recharts`
- Use ResponsiveContainer for sizing
- Pass `data` prop with array
- Add charts (Bar, Line, Pie, etc.)

### To Understand This App
1. Read `PROJECT_DOCUMENTATION.md` (comprehensive)
2. Read `TECHNICAL_HANDOFF.md` (technical deep-dive)
3. Read code comments in components
4. Add `console.log()` to trace execution

---

## ✅ Checklist Before Handing Off to Someone Else

```
□ Created PROJECT_DOCUMENTATION.md
□ Created TECHNICAL_HANDOFF.md
□ Tested all features work
□ Documented API endpoint location
□ Noted JIRA project name
□ Explained story points target (3/day, 15/week)
□ Showed how to add new metric
□ Verified filters work
□ Tested on mobile view
□ Cleared any debug code/console.logs
□ Built production version
□ Tested build works
```

---

## 📞 Quick Reference

**Start dev server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Test production build:**
```bash
npm preview
```

**Clear cache and reinstall:**
```bash
rm -rf node_modules
npm install
```

**Update dependencies:**
```bash
npm update
```

---

## 🎯 Your First Task: Make a Change

### Task: Change the weekly story point target to 20

#### Step 1: Open WeeklyProgress.jsx
```bash
Open: src/components/WeeklyProgress.jsx
```

#### Step 2: Find the constant (around line 20)
```javascript
const STORY_POINTS_PER_DAY = 3;
const STORY_POINTS_PER_WEEK = STORY_POINTS_PER_DAY * 5; // 15
```

#### Step 3: Change it
```javascript
const STORY_POINTS_PER_WEEK = 20;  // Changed to 20
```

#### Step 4: Test
- Refresh browser (npm run dev running)
- Go to Story Points tab
- See new target of 20 reflected

**Congratulations!** You've made your first change. 🎉

---

## 💡 Pro Tips

1. **Use React DevTools** - Install browser extension for component inspection
2. **Console is your friend** - `console.log()` everything while learning
3. **Read error messages** - They usually tell you exactly what's wrong
4. **Commit frequently** - Small commits are easier to debug
5. **Test in production** - What works locally might fail in deployment

---

## 📅 Next Steps

1. **Week 1:** Understand components and data flow
2. **Week 2:** Make small improvements (UI tweaks, new metrics)
3. **Week 3:** Add a new feature (new chart, new filter)
4. **Week 4:** Optimize performance if needed

---

## 🆘 When You're Stuck

1. **Read the error** - Browser console (F12)
2. **Check documentation** - Open PROJECT_DOCUMENTATION.md
3. **Search the code** - Find similar patterns
4. **Google the error** - Stack Overflow often has answers
5. **Add debug logs** - Trace execution step by step

---

**Good luck! You've got this! 🚀**

Questions? Check PROJECT_DOCUMENTATION.md or TECHNICAL_HANDOFF.md

---

Document Version: 1.0 | Created: June 2, 2026 | For: New Developer
