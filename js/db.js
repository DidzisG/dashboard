// Database Sync Manager using LocalStorage

const STORAGE_KEY = 'aether_dashboard_state';

// Helper to get formatted dates relative to today
const getRelativeDate = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
};

const DEFAULT_STATE = {
  tasks: [
    { id: 't1', text: 'Design ergonomic command palette shortcut keys', completed: false, priority: 'high', dateCreated: getRelativeDate(0) },
    { id: 't2', text: 'Refactor dashboard glassmorphism CSS styling rules', completed: true, priority: 'medium', dateCreated: getRelativeDate(-1) },
    { id: 't3', text: 'Configure sound-effect trigger logic for toast notifications', completed: false, priority: 'low', dateCreated: getRelativeDate(0) },
    { id: 't4', text: 'Sync calendar event dates to auto-render correct checklists', completed: false, priority: 'medium', dateCreated: getRelativeDate(-2) }
  ],
  events: [
    { id: 'e1', title: 'Sprint review & alignment meeting', date: getRelativeDate(0), time: '14:30', type: 'meeting' },
    { id: 'e2', title: 'System security audit review', date: getRelativeDate(1), time: '10:00', type: 'deadline' },
    { id: 'e3', title: 'Aether API endpoint deployment', date: getRelativeDate(-1), time: '16:00', type: 'task' },
    { id: 'e4', title: 'Client interface walkthrough demo', date: getRelativeDate(2), time: '11:00', type: 'meeting' }
  ],
  emails: [
    {
      id: 'm1',
      sender: 'AWS Alerts',
      senderEmail: 'alerts@amazonaws.com',
      category: 'alert',
      subject: 'EC2 instance CPU load warning: 94%',
      body: 'Your production EC2 instance in eu-west-1 has exceeded its CPU thresholds. Active load reached 94.2% across all 4 worker threads.\n\nPlease inspect running processes, check web socket connections, and scale the instances if this load persists for more than 15 minutes.',
      time: '12:04 PM',
      read: false,
      date: getRelativeDate(0)
    },
    {
      id: 'm2',
      sender: 'Support Desk',
      senderEmail: 'support@acmecorp.com',
      category: 'support',
      subject: 'Client Portal database query latency',
      body: 'Hi Developer team,\n\nWe have received reports of significant lag on the client billing queries. Average response time for SELECT statements has climbed from 80ms to 2900ms over the past hour.\n\nCould you please check for unindexed queries, run an EXPLAIN ANALYZE on query #344, and verify index status?',
      time: '10:15 AM',
      read: false,
      date: getRelativeDate(0)
    },
    {
      id: 'm3',
      sender: 'GitHub',
      senderEmail: 'notifications@github.com',
      category: 'system',
      subject: '[PR Merged] Feature: Ergonomic command-palette keys',
      body: 'Pull request #42 has been successfully merged into main.\n\nAuthor: @dev-lead\nReviewers: @qa-verify\nCommits: 3\nFiles changed: 4 (+182, -34)\n\nDeploy is pending approval in Firebase App Hosting workflows.',
      time: 'Yesterday',
      read: true,
      date: getRelativeDate(-1)
    }
  ],
  notes: `# Fleet Notes

- Toggle cmd+k command palette to execute actions quickly.
- Convert emails to tasks with the "Convert to Task" button in the email view modal.
- Calendar events are marked with status dots on calendar dates.
- Keep tabs on simulated notifications coming in every few minutes.
`,
  notifications: [],
  settings: {
    theme: 'dark',
    sound: true
  }
};

export const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveState(DEFAULT_STATE);
      return JSON.parse(JSON.stringify(DEFAULT_STATE)); // deep copy
    }
    const state = JSON.parse(raw);
    
    // Fallback merge just in case some keys are missing
    const merged = { ...DEFAULT_STATE, ...state };
    merged.settings = { ...DEFAULT_STATE.settings, ...state.settings };
    merged.notifications = state.notifications || [];
    return merged;
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
};

export const saveState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
  }
};

export const updateField = (key, value) => {
  const state = loadState();
  state[key] = value;
  saveState(state);
  return state;
};
