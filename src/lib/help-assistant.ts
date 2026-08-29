export type HelpTopic = {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  href?: string;
  cta?: string;
  routeHints?: string[];
};

export type HelpReply = {
  text: string;
  suggestions: string[];
  href?: string;
  cta?: string;
};

const topics: HelpTopic[] = [
  {
    id: 'create-issue',
    title: 'Create an issue',
    keywords: [
      'create bug',
      'create issue',
      'new bug',
      'new issue',
      'report bug',
      'report issue',
      'declare foe',
      'add bug',
    ],
    answer:
      'Go to The Lands Between and choose “Declare Foe” (New Issue). Fill in the title, description, severity, priority, component, environment and any optional details, then choose “Declare Foe” again to save it.',
    href: '/',
    cta: 'Open issues',
    routeHints: ['/'],
  },
  {
    id: 'edit-issue',
    title: 'Edit an issue',
    keywords: [
      'edit bug',
      'edit issue',
      'change bug',
      'change issue',
      'amend record',
      'edit foe',
    ],
    answer:
      'Open the issue you want to change and choose “Edit Foe”. Update the issue fields, then save the edits. Changes are also recorded in the issue history where supported.',
    routeHints: ['/bugs/'],
  },
  {
    id: 'stages',
    title: 'Issue stages',
    keywords: [
      'status',
      'stage',
      'stages',
      'triage',
      'discovered',
      'in battle',
      'cursed',
      'roundtable',
      'communing',
      'felled',
      'workflow',
    ],
    answer:
      'The workflow is: Discovered = Triage, In Battle = In Progress, Cursed = Blocked, Roundtable = In Review, Communing = Verifying, and Felled = Closed. The board lets you move issues through these stages.',
    href: '/how-it-works',
    cta: 'Open guide',
  },
  {
    id: 'severity',
    title: 'Severity',
    keywords: [
      'severity',
      'threat level',
      'demigod',
      'great enemy',
      'great foe',
      'standard foe',
      'wandering',
      'critical',
      'major',
      'minor',
      'trivial',
    ],
    answer:
      'Severity describes impact. Demigod = Critical, Great Enemy = Major, Standard Foe = Minor, and Wandering = Trivial. Use Critical only when the failure has severe impact such as a major outage, data loss, or an unusable core function.',
  },
  {
    id: 'priority',
    title: 'Priority',
    keywords: [
      'priority',
      'p0',
      'p1',
      'p2',
      'p3',
      'urgent',
      'urgency',
      'which priority',
    ],
    answer:
      'Priority describes how urgently work should be scheduled. P0 is immediate/urgent, P1 is high, P2 is normal, and P3 is low. Severity and priority are related but not identical: a severe bug may sometimes be less urgent depending on context.',
  },
  {
    id: 'search',
    title: 'Search issues',
    keywords: [
      'search',
      'find bug',
      'find issue',
      'annals',
      'cmd k',
      'command k',
      'ctrl k',
      'command palette',
    ],
    answer:
      'Use Annals (Search) in the top bar or press Cmd+K on macOS / Ctrl+K on Windows or Linux. Type an issue key or title and select a result to open it.',
    href: '/',
    cta: 'Open issues',
  },
  {
    id: 'filters',
    title: 'Filter issues',
    keywords: [
      'filter',
      'filters',
      'filter status',
      'filter severity',
      'filter component',
      'show only',
    ],
    answer:
      'On The Lands Between page, open the filters and narrow issues by Battle State (status), Threat Level (severity), or Region (component). You can also use the text search field.',
    href: '/',
    cta: 'Open issue list',
  },
  {
    id: 'board',
    title: 'Board view',
    keywords: [
      'kanban',
      'board',
      'map view',
      'drag issue',
      'drag bug',
      'move issue',
      'move bug',
    ],
    answer:
      'On The Lands Between page, switch from Codex (List) to Map (Board). Drag an issue card to another column to change its workflow stage.',
    href: '/',
    cta: 'Open board page',
  },
  {
    id: 'assign',
    title: 'Assign an issue',
    keywords: [
      'assign',
      'assignee',
      'assign user',
      'assign person',
      'summon',
      'summoned',
      'owner bug',
    ],
    answer:
      'Open the issue and use its edit controls to choose the assignee. Tarnished Tracker calls the assignee the “Summoned” user.',
    routeHints: ['/bugs/'],
  },
  {
    id: 'comments',
    title: 'Comments',
    keywords: [
      'comment',
      'comments',
      'add comment',
      'transcribe',
      'finding',
      'fix proposed',
      'needs repro',
      'verified',
    ],
    answer:
      'Open an issue, write in the comment box, optionally choose a comment type such as Info, Fix Proposed, Needs Repro, or Verified, then choose “Transcribe”.',
    routeHints: ['/bugs/'],
  },
  {
    id: 'attachments',
    title: 'Attachments',
    keywords: [
      'attachment',
      'attachments',
      'upload',
      'file',
      'image',
      'vision',
      'add file',
      'screenshot',
    ],
    answer:
      'Attachments are called “Visions”. You can add files while declaring a new issue, and the issue detail page also contains attachment controls for an existing issue.',
    routeHints: ['/bugs/'],
  },
  {
    id: 'relations',
    title: 'Dependencies and duplicates',
    keywords: [
      'dependency',
      'dependencies',
      'depends on',
      'blocked by',
      'blocks',
      'duplicate',
      'relationship',
      'golden lineage',
      'link issues',
    ],
    answer:
      'Open an issue and use The Golden Lineage section. You can link another issue as a dependency or mark the current issue as a duplicate. Linked blockers and dependencies are displayed as a small relationship graph.',
    routeHints: ['/bugs/'],
  },
  {
    id: 'focus',
    title: 'Focus mode',
    keywords: [
      'focus',
      'focus mode',
      'traverse fog',
      'timer',
      'pomodoro',
      'boss battle',
      'branch name',
    ],
    answer:
      'On an issue, choose “Traverse Fog” (Focus). It opens the boss-battle focus view with a 25-minute timer and a generated Git branch-name command that you can copy.',
    routeHints: ['/bugs/'],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    keywords: [
      'dashboard',
      'statistics',
      'stats',
      'metrics',
      'runes records',
      'runes and records',
      'critical threats',
    ],
    answer:
      'Open “Runes & Records” from the navigation. The dashboard summarizes issue stages, critical threats, average open-issue age, closed issues, and high-severity foes for the current workspace.',
    href: '/dashboard',
    cta: 'Open dashboard',
  },
  {
    id: 'workspaces',
    title: 'Workspaces',
    keywords: [
      'workspace',
      'workspaces',
      'realm',
      'new realm',
      'create workspace',
      'create realm',
      'switch workspace',
      'switch realm',
    ],
    answer:
      'Use the Current Realm control in the sidebar to switch workspaces. Choose “Establish New Realm” to create another workspace and give it a short sigil/key.',
  },
  {
    id: 'reset',
    title: 'Reset local demo data',
    keywords: [
      'reset',
      'reset data',
      'delete all',
      'burn erdtree',
      'burn the erdtree',
      'clear demo',
    ],
    answer:
      '“Burn the Erdtree” resets Tarnished Tracker’s browser-local tracker data. Authentication is handled separately by Supabase, so resetting tracker data should not delete the Supabase account.',
  },
  {
    id: 'patch',
    title: 'Git patches',
    keywords: [
      'patch',
      'git patch',
      'diff',
      'incantation',
      'code patch',
      'code diff',
    ],
    answer:
      'An “Incantation” is Tarnished Tracker’s name for a Git patch/diff attached to an issue. Patches are supplied manually. This project does not generate patches with an AI service.',
    routeHints: ['/bugs/'],
  },
  {
    id: 'guide',
    title: 'How it works',
    keywords: [
      'help',
      'guide',
      'tutorial',
      'how does this work',
      'how it works',
      'tarnished guide',
      'documentation',
    ],
    answer:
      'The Tarnished Guide explains the tracker’s core workflow and Elden Ring terminology. I can also answer a specific question here.',
    href: '/how-it-works',
    cta: 'Open Tarnished Guide',
  },
  {
    id: 'logout',
    title: 'Log out',
    keywords: [
      'logout',
      'log out',
      'sign out',
      'sever connection',
      'leave account',
    ],
    answer:
      'Open your profile menu and choose “Sever Connection” (Logout). This signs out of the Supabase session without deleting the browser-local tracker data.',
  },
  {
    id: 'data-storage',
    title: 'Where data is stored',
    keywords: [
      'where data stored',
      'localstorage',
      'local storage',
      'database',
      'sync',
      'other device',
      'browser data',
    ],
    answer:
      'For now, authentication uses Supabase, but bugs, workspaces, comments and attachments remain in this browser’s localStorage. They do not automatically sync to another browser or device.',
  },
];

const DEFAULT_SUGGESTIONS = [
  'How do I create a bug?',
  'What does P0 mean?',
  'How do I use the board?',
  'How do I search?',
];

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'can',
  'do',
  'does',
  'for',
  'how',
  'i',
  'in',
  'is',
  'it',
  'me',
  'of',
  'on',
  'the',
  'to',
  'what',
  'where',
  'with',
]);

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function usefulTokens(value: string) {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function scoreTopic(query: string, topic: HelpTopic, currentPath: string) {
  const normalizedQuery = normalize(query);
  const queryTokens = new Set(usefulTokens(query));

  let score = 0;

  for (const keyword of topic.keywords) {
    const normalizedKeyword = normalize(keyword);

    if (!normalizedKeyword) continue;

    if (normalizedQuery === normalizedKeyword) {
      score += 30;
    } else if (normalizedQuery.includes(normalizedKeyword)) {
      score += 12;
    }

    const keywordTokens = usefulTokens(keyword);

    for (const token of keywordTokens) {
      if (queryTokens.has(token)) {
        score += 2;
      }
    }
  }

  if (
    topic.routeHints?.some(
      (hint) =>
        currentPath === hint ||
        (hint !== '/' && currentPath.startsWith(hint)),
    )
  ) {
    score += 1;
  }

  return score;
}

function makeSuggestions(bestTopic?: HelpTopic) {
  if (!bestTopic) return DEFAULT_SUGGESTIONS;

  const suggestions = topics
    .filter((topic) => topic.id !== bestTopic.id)
    .slice(0, 3)
    .map((topic) => topic.title);

  return suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS;
}

export function getHelpReply(
  userMessage: string,
  currentPath = '/',
): HelpReply {
  const query = normalize(userMessage);

  if (!query) {
    return {
      text: 'Ask me how to use Tarnished Tracker.',
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  if (/^(hi|hello|hey|yo|sup|greetings|hello there)$/.test(query)) {
    return {
      text:
        'Greetings, Tarnished. I am the Guidance of Grace. Ask me how to create, find, update, organize, or track issues in this realm.',
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  const ranked = topics
    .map((topic) => ({
      topic,
      score: scoreTopic(userMessage, topic, currentPath),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];

  // Require a meaningful match. This avoids confidently answering
  // unrelated questions.
  if (!best || best.score < 4) {
    return {
      text:
        'I could not find a reliable Tarnished Tracker help topic for that. Try asking about creating issues, severity, priority, searching, the board, comments, attachments, workspaces, focus mode, or the dashboard.',
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  return {
    text: best.topic.answer,
    suggestions: makeSuggestions(best.topic),
    href: best.topic.href,
    cta: best.topic.cta,
  };
}
