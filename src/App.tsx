import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, BarChart3, Bookmark, BookmarkCheck, Bug,
  Check, CheckCircle2, ChevronDown, CircleDot, CircleHelp, Clock3, Command, ExternalLink,
  GitBranch, Inbox, Layers3, Link2, ListFilter, LogOut, Menu, MessageCircle, MoreHorizontal,
  Paperclip, Plus, RefreshCw, Search, Settings2, ShieldAlert, SlidersHorizontal, Sparkles,
  Trash2, Users, X, Zap, Wand2, Terminal, Tag, Monitor, SearchIcon, Calendar, Hash, FileText, Code2, GitCommit,
  Skull, Flame, Swords, Castle, Crown, Ghost, Crosshair, Map, Eye, Copy, CheckCheck
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { OTPInput } from 'input-otp';
import { HelpAssistant } from '@/components/help-assistant';
import { getAuthRedirectUrl, supabase } from '@/lib/supabase';

// --- INJECT DARK MODE GLOBALLY ---
const GlobalStyles = () => (
  <style>{`
    html.dark {
      --background: 30 11% 7%;
      --foreground: 45 30% 80%;
      --card: 30 11% 10%;
      --card-foreground: 45 30% 85%;
      --popover: 30 11% 8%;
      --popover-foreground: 45 30% 85%;
      --primary: 43 45% 53%;
      --primary-foreground: 30 11% 7%;
      --secondary: 30 11% 15%;
      --secondary-foreground: 45 30% 85%;
      --muted: 30 11% 14%;
      --muted-foreground: 45 15% 55%;
      --accent: 43 45% 53%;
      --accent-foreground: 30 11% 7%;
      --destructive: 0 70% 40%;
      --destructive-foreground: 0 0% 98%;
      --border: 30 11% 18%;
      --sidebar: 30 11% 5%;
      --sidebar-foreground: 45 30% 75%;
      --sidebar-border: 30 11% 12%;
      --sidebar-accent: 30 11% 12%;
    }
    .erdtree-glow {
      box-shadow: 0 0 25px hsl(var(--primary) / 0.2);
      border: 1px solid hsl(var(--primary) / 0.4);
    }
    .erdtree-text {
      background: linear-gradient(to bottom, hsl(45 50% 90%), hsl(43 45% 53%));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  `}</style>
);

// --- ADVANCED ELDEN RING DATA MODELS ---
type Stage = 'Triage' | 'In Progress' | 'Blocked' | 'In Review' | 'Verifying' | 'Closed';
type Resolution = 'Fixed' | "Won't Fix" | 'Duplicate' | 'Not Reproducible' | 'Works as Intended' | null;
type Severity = 'Critical' | 'Major' | 'Minor' | 'Trivial';
type Priority = 'P0' | 'P1' | 'P2' | 'P3';
type CommentType = 'Info' | 'Fix Proposed' | 'Needs Repro' | 'Verified';
type Reproducibility = 'Always' | 'Sometimes' | 'Rarely' | 'Unable to Reproduce' | 'Not Tried';

type User = { id: string; name: string; username: string; role: string; email?: string; avatarUrl?: string; provider?: string };
type Product = { id: string; workspaceId: string; name: string; key: string; description: string };
type Component = { id: string; productId: string; name: string; color: string };
type Comment = { id: string; authorId: string; body: string; commentType: CommentType; createdAt: string };
type Attachment = { id: string; fileName: string; fileUrl: string; uploadedBy: string; createdAt: string };
type HistoryEntry = { id: string; fieldChanged: string; oldValue: string; newValue: string; changedBy: string; changedAt: string };
type Bug = {
  id: string; workspaceId: string; key: string; title: string; description: string; productId: string; componentId: string;
  stage: Stage; resolution: Resolution; severity: Severity; priority: Priority; assigneeId: string;
  reporterId: string; ccList: string[]; createdAt: string; updatedAt: string; comments: Comment[];
  attachments: Attachment[]; history: HistoryEntry[]; dependsOn: string[]; duplicateOf: string | null;
  environment: string; reproducibility: Reproducibility; tags: string[];
  storyPoints: number | null; dueDate: string | null; codePatch?: string;
};
type SavedFilter = { id: string; workspaceId: string; name: string; stage: Stage | 'All'; severity: Severity | 'All'; query: string };
type Workspace = { id: string; name: string; key: string; ownerId: string; memberIds: string[] };

type Store = {
  currentUserId: string | null; currentWorkspaceId: string | null;
  users: User[]; workspaces: Workspace[]; products: Product[]; components: Component[]; bugs: Bug[]; savedFilters: SavedFilter[];
};

const now = () => new Date().toISOString();
const relativeDate = (value: string) => {
  const hours = Math.floor((Date.now() - new Date(value).getTime()) / 3600000);
  if (hours < 1) return 'just now'; if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24); return days < 7 ? `${days}d ago` : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
};
const compactDate = (value: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const seedStore = (): Store => ({ currentUserId: null, currentWorkspaceId: null, users: [], workspaces: [], products: [], components: [], bugs: [], savedFilters: [] });

const STORAGE_KEY = 'tarnished-tracker-v4'; 
const loadStore = (): Store => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...seedStore(), ...parsed, users: parsed.users || [], workspaces: parsed.workspaces || [], products: parsed.products || [], components: parsed.components || [], bugs: parsed.bugs || [], savedFilters: parsed.savedFilters || [] };
    }
  } catch { /* fallback to seed */ }
  return seedStore();
};

type WorkspaceContextValue = {
  store: Store; updateStore: (updater: (current: Store) => Store) => void; resetDemo: () => void;
  logout: () => Promise<void>; switchWorkspace: (workspaceId: string) => void; createWorkspace: (name: string, key: string) => string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
function useWorkspace() { const value = useContext(WorkspaceContext); if (!value) throw new Error('Workspace context is unavailable'); return value; }

// --- ELDEN RING LORE MAPPINGS ---
const stageMeta: Record<Stage, { label: string; tint: string; icon: typeof Map }> = {
  Triage: { label: 'Discovered', tint: '#8a8a8a', icon: Map },
  'In Progress': { label: 'In Battle', tint: '#c5a865', icon: Swords }, 
  Blocked: { label: 'Cursed', tint: '#8a1a1a', icon: Skull }, 
  'In Review': { label: 'Roundtable', tint: '#4a6583', icon: Castle }, 
  Verifying: { label: 'Communing', tint: '#6b8a7a', icon: Eye },
  Closed: { label: 'Felled', tint: '#555555', icon: Crown },
};
const stages: Stage[] = ['Triage', 'In Progress', 'Blocked', 'In Review', 'Verifying', 'Closed'];

const severityMeta: Record<Severity, { label: string; tint: string; mark: string }> = { 
  Critical: { label: 'Demigod', tint: '#8a1a1a', mark: 'X' }, 
  Major: { label: 'Great Enemy', tint: '#a85c32', mark: 'V' }, 
  Minor: { label: 'Standard Foe', tint: '#c5a865', mark: 'III' }, 
  Trivial: { label: 'Wandering', tint: '#666666', mark: 'I' } 
};
const resolutionOptions: Exclude<Resolution, null>[] = ['Fixed', "Won't Fix", 'Duplicate', 'Not Reproducible', 'Works as Intended'];
const envOptions = ['Limgrave (Prod)', 'Caelid (Staging)', 'Liurnia (Dev)', 'PlayStation', 'Xbox', 'PC'];
const reproOptions: Reproducibility[] = ['Always', 'Sometimes', 'Rarely', 'Unable to Reproduce', 'Not Tried'];
const storyPointOptions = [1, 2, 3, 5, 8, 13, 21];

const BUG_TEMPLATE = `**Tale of the Foe:**\n1. \n2. \n3. \n\n**Prophecy (Expected):**\n\n**Curse (Actual):**\n`;
const FEATURE_TEMPLATE = `**Lord's Decree:**\nAs a [role], I seek [feature] so that [benefit].\n\n**Rites of Passage:**\n- [ ] Rite 1\n- [ ] Rite 2\n`;

function Avatar({ user, size = 'sm' }: { user?: User; size?: 'sm' | 'md' }) {
  const initials = user?.name.split(' ').map((part) => part[0]).join('').slice(0, 2) ?? '?';

  const sizeClass = size === 'md' ? 'h-9 w-9 text-sm' : 'h-6 w-6 text-[10px]';

  return (
    <span
      title={user?.name}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-[hsl(var(--primary)/.15)] border border-[hsl(var(--primary)/.3)] font-serif font-bold text-[hsl(var(--primary))] ${sizeClass}`}
    >
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}

function StageBadge({ stage, compact = false }: { stage: Stage; compact?: boolean }) {
  const meta = stageMeta[stage]; const Icon = meta.icon;
  return <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[15px] font-bold tracking-wide  font-serif ${compact ? 'px-1.5 py-0.5' : ''}`} style={{ color: meta.tint, borderColor: `${meta.tint}40`, backgroundColor: `${meta.tint}10` }}><Icon size={compact ? 12 : 14} />{meta.label}</span>;
}
function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = severityMeta[severity];
  return <span className="inline-flex items-center gap-1.5 text-[15px] font-bold  font-serif" style={{ color: meta.tint }}><span className="font-mono text-[9px]">{meta.mark}</span>{meta.label}</span>;
}
function PriorityPill({ priority }: { priority: Priority }) {
  const colors: Record<Priority, string> = { P0: '#8a1a1a', P1: '#a85c32', P2: '#c5a865', P3: '#4a6583' };
  return <span className="font-serif text-[15px] font-bold" style={{ color: colors[priority] }}>{priority === 'P0' ? 'Urgent' : priority}</span>;
}

// ==========================================
// COMMAND PALETTE (CMD+K)
// ==========================================
function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { store } = useWorkspace();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((open) => !open); } };
    document.addEventListener('keydown', down); return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;
  const currentWs = store.workspaces.find((ws) => ws.id === store.currentWorkspaceId);
  const wsBugs = store.bugs.filter((b) => b.workspaceId === currentWs?.id);
  const results = wsBugs.filter(b => `${b.key} ${b.title}`.toLowerCase().includes(search.toLowerCase())).slice(0, 5);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--card)/.9)] backdrop-blur-xl shadow-[0_0_50px_rgba(197,168,101,0.15)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center border-b border-[hsl(var(--border)/.5)] px-4 py-3"><SearchIcon size={18} className="text-[hsl(var(--primary))]" /><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search the annals of history..." className="flex-1 bg-transparent px-3 py-1 text-sm font-serif outline-none placeholder:text-[hsl(var(--muted-foreground))]" /><kbd className="bg-[hsl(var(--muted))] px-1.5 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">ESC</kbd></div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {results.length === 0 ? <p className="p-4 text-center text-xs font-serif text-[hsl(var(--muted-foreground))]">No records found in the Lands Between.</p> : (
            results.map(bug => <button key={bug.id} onClick={() => { setLocation(`/bugs/${bug.id}`); setOpen(false); }} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[hsl(var(--muted)/.5)]"><span className="font-mono text-xs font-bold text-[hsl(var(--primary))]">{bug.key}</span><span className="truncate text-sm font-semibold font-serif">{bug.title}</span><StageBadge stage={bug.stage} compact /></button>)
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// NEW ISSUE MODAL (DECLARE FOE)
// ==========================================
function NewBugModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { store, updateStore } = useWorkspace();
  const currentWs = store.workspaces.find((ws) => ws.id === store.currentWorkspaceId) || store.workspaces[0];
  const wsProduct = store.products.find((p) => p.workspaceId === currentWs?.id);
  const wsComponents = store.components.filter(c => c.productId === wsProduct?.id);
  
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [severity, setSeverity] = useState<Severity>('Minor'); const [priority, setPriority] = useState<Priority>('P2'); const [componentId, setComponentId] = useState(wsComponents[0]?.id ?? ''); const [assigneeId, setAssigneeId] = useState(''); const [environment, setEnvironment] = useState('Limgrave (Prod)'); const [reproducibility, setReproducibility] = useState<Reproducibility>('Not Tried'); const [tagsStr, setTagsStr] = useState(''); const [storyPoints, setStoryPoints] = useState<number | ''>(''); const [dueDate, setDueDate] = useState(''); const [draftAttachments, setDraftAttachments] = useState<{name: string, url: string}[]>([]); const [codePatch, setCodePatch] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    Array.from(files).forEach(file => { const reader = new FileReader(); reader.onload = () => { setDraftAttachments(prev => [...prev, { name: file.name, url: String(reader.result) }]); }; reader.readAsDataURL(file); });
  };

  const submitAction = () => {
    if (!title.trim() || !wsProduct) return;
    const id = uid('bug'); const wsBugs = store.bugs.filter((b) => b.workspaceId === currentWs?.id); const nextNumber = Math.max(...wsBugs.map((bug) => Number(bug.key.split('-')[1]) || 0), 100) + 1;
    const tagsArray = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const finalAttachments: Attachment[] = draftAttachments.map(a => ({ id: uid('attachment'), fileName: a.name, fileUrl: a.url, uploadedBy: store.currentUserId ?? 'u1', createdAt: now() }));
    const bug: Bug = { id, workspaceId: currentWs?.id ?? 'ws1', key: `${currentWs?.key ?? 'FOE'}-${nextNumber}`, title: title.trim(), description: description.trim() || 'No lore provided.', productId: wsProduct.id, componentId: componentId || wsComponents[0]?.id, stage: 'Triage', resolution: null, severity, priority, assigneeId, reporterId: store.currentUserId ?? 'u1', ccList: [], createdAt: now(), updatedAt: now(), comments: [], history: [], dependsOn: [], duplicateOf: null, environment, reproducibility, tags: tagsArray, storyPoints: storyPoints === '' ? null : Number(storyPoints), dueDate: dueDate || null, attachments: finalAttachments, codePatch: codePatch.trim() || undefined };
    updateStore((current) => ({ ...current, bugs: [bug, ...(current.bugs || [])] })); onCreated(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--card)/.95)] backdrop-blur-xl shadow-[0_0_50px_rgba(197,168,101,0.15)]">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-6 py-4">
          <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Skull size={18} /></span><div><p className="font-serif text-[15px] font-bold  text-[hsl(var(--muted-foreground))]">Realm of {currentWs?.key}</p><h2 className="text-2xl font-serif font-bold text-[hsl(var(--primary))] erdtree-text">Declare Great Foe <span className="text-[10px] text-[hsl(var(--muted-foreground))] tracking-normal">(New Issue)</span></h2></div></div>
          <div className="border border-[hsl(var(--border)/.5)] bg-[hsl(var(--muted)/.35)] px-3 py-2 text-[15px] font-serif font-bold  text-[hsl(var(--muted-foreground))]">
            Scribe Manual
            <span className="ml-2 font-sans normal-case tracking-normal opacity-70">(Issue Report)</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)] hover:text-[hsl(var(--primary))] transition-colors"><X size={20} /></button>
        </div>

        <div className="flex min-h-[500px] flex-col md:flex-row">
            <>
              <div className="flex flex-1 flex-col overflow-y-auto border-r border-[hsl(var(--border)/.5)] p-5">
                <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Name of the Foe..." className="mb-4 w-full bg-transparent font-serif text-2xl font-bold tracking-tight outline-none placeholder:text-[hsl(var(--muted-foreground)/.4)] text-[hsl(var(--primary))] erdtree-text" />
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[hsl(var(--border)/.5)] pb-3"><span className="text-[15px] font-bold  text-[hsl(var(--muted-foreground))] mr-2 font-serif">Sacred Texts:</span><button onClick={() => setDescription(BUG_TEMPLATE)} className="flex items-center gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.5)] px-2 py-1 text-[15px] font-bold font-serif text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))] transition-colors"><Skull size={12}/> Anomaly Report</button><button onClick={() => setDescription(FEATURE_TEMPLATE)} className="flex items-center gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.5)] px-2 py-1 text-[15px] font-bold font-serif text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))] transition-colors"><FileText size={12}/> Lord's Decree</button></div>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Inscribe the lore of this encounter, the rites to reproduce it, and the curse it brings upon the realm..." className="mb-4 min-h-[120px] w-full flex-1 resize-none bg-transparent font-serif text-xl leading-relaxed outline-none placeholder:text-[hsl(var(--muted-foreground)/.4)] text-[hsl(var(--foreground)/.9)]" />
                <div className="mt-auto space-y-4 border-t border-[hsl(var(--border)/.5)] pt-4">
                  <div><label className="mb-1.5 flex items-center gap-1.5 text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]"><Code2 size={12}/> Optional: Incantation (Git Patch)</label><textarea value={codePatch} onChange={e => setCodePatch(e.target.value)} placeholder="@@ -1,3 +1,4 @@... inscribe the spell here" className="h-16 w-full resize-none border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] p-2 font-mono text-[10px] outline-none placeholder:text-[hsl(var(--muted-foreground)/.3)] text-[hsl(var(--primary))]" /></div>
                  <div><p className="mb-2 text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]">Visions <span className="tracking-normal font-sans normal-case opacity-70">(Attachments)</span></p><div className="flex flex-wrap gap-2 mb-2">
                    {draftAttachments.map((a, i) => (<div key={i} className="group relative flex h-14 w-14 items-center justify-center overflow-hidden border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--muted)/.5)]">{a.url.startsWith('data:image') ? <img src={a.url} alt="preview" className="h-full w-full object-cover" /> : <FileText size={20} className="text-[hsl(var(--primary))]" />}<button onClick={() => setDraftAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 bg-black/80 p-0.5 text-[hsl(var(--primary))] opacity-0 transition-opacity group-hover:opacity-100 border border-[hsl(var(--primary))]"><X size={10} /></button></div>))}
                    <label className="flex h-14 w-14 cursor-pointer flex-col items-center justify-center border border-dashed border-[hsl(var(--primary)/.4)] bg-[hsl(var(--background)/.5)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.1)] transition-colors"><Plus size={16} /><input type="file" multiple onChange={handleFileUpload} className="hidden" /></label>
                  </div></div>
                </div>
              </div>
              <div className="w-full shrink-0 overflow-y-auto bg-[hsl(var(--background)/.3)] p-5 md:w-[300px] border-l border-[hsl(var(--border)/.5)]">
                <h3 className="mb-4 text-lg font-bold  font-serif text-[hsl(var(--primary))]">Attributes</h3>
                <div className="space-y-4">
                  <div><label className="mb-1 block text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]">Summoned <span className="tracking-normal font-sans normal-case opacity-70">(Assignee)</span></label><select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-2 py-1.5 text-lg font-serif font-bold shadow-sm outline-none text-[hsl(var(--foreground))]"><option value="">No summon sign</option>{(store.users || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-2"><div><label className="mb-1 block text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]">Threat <span className="block tracking-normal font-sans normal-case opacity-70">(Severity)</span></label><select value={severity} onChange={e => setSeverity(e.target.value as Severity)} className="w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-2 py-1.5 text-base font-serif font-bold shadow-sm outline-none">{Object.keys(severityMeta).map((v) => <option key={v}>{severityMeta[v as Severity].label}</option>)}</select></div><div><label className="mb-1 block text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]">Urgency <span className="block tracking-normal font-sans normal-case opacity-70">(Priority)</span></label><select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-2 py-1.5 text-base font-serif font-bold shadow-sm outline-none">{['P0', 'P1', 'P2', 'P3'].map((v) => <option key={v}>{v === 'P0' ? 'Urgent' : v}</option>)}</select></div></div>
                  <div><label className="mb-1 block text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]">Region <span className="tracking-normal font-sans normal-case opacity-70">(Component)</span></label><select value={componentId} onChange={e => setComponentId(e.target.value)} className="w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-2 py-1.5 text-lg font-serif font-bold shadow-sm outline-none">{wsComponents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  
                  <div className="my-4 h-px bg-[hsl(var(--border)/.5)]" />
                  <h3 className="mb-4 text-lg font-bold  font-serif text-[hsl(var(--primary))]">Lore & Conditions</h3>
                  
                  <div className="grid grid-cols-2 gap-2"><div><label className="mb-1 flex items-center gap-1.5 text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]"><Hash size={10}/> Yield <span className="tracking-normal font-sans normal-case opacity-70">(Points)</span></label><select value={storyPoints} onChange={e => setStoryPoints(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-2 py-1.5 text-base font-serif font-bold shadow-sm outline-none"><option value="">None</option>{storyPointOptions.map((v) => <option key={v} value={v}>{v}</option>)}</select></div><div><label className="mb-1 flex items-center gap-1.5 text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]"><Calendar size={10}/> Day <span className="tracking-normal font-sans normal-case opacity-70">(Due)</span></label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-2 py-1.5 text-base font-serif font-bold shadow-sm outline-none" /></div></div>
                  <div><label className="mb-1 flex items-center gap-1.5 text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]"><Monitor size={10}/> Realm <span className="tracking-normal font-sans normal-case opacity-70">(Env)</span></label><select value={environment} onChange={e => setEnvironment(e.target.value)} className="w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-2 py-1.5 text-lg font-serif font-bold shadow-sm outline-none">{envOptions.map((v) => <option key={v}>{v}</option>)}</select></div>
                  <div><label className="mb-1 block text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]">Manifestation <span className="tracking-normal font-sans normal-case opacity-70">(Repro)</span></label><select value={reproducibility} onChange={e => setReproducibility(e.target.value as Reproducibility)} className="w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-2 py-1.5 text-base font-serif font-bold shadow-sm outline-none">{reproOptions.map((v) => <option key={v}>{v}</option>)}</select></div>
                  <div><label className="mb-1 flex items-center gap-1.5 text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]"><Tag size={10}/> Sigils <span className="tracking-normal font-sans normal-case opacity-70">(Tags)</span></label><input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="e.g. magic, combat" className="w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-2 py-1.5 text-base font-serif font-bold shadow-sm outline-none text-[hsl(var(--primary))]" /></div>
                </div>
              </div>
            </>
        </div>

        <div className="flex items-center justify-between border-t border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-6 py-4">
          <p className="text-[15px] font-serif text-[hsl(var(--muted-foreground))]">The scrolls accept ancient Markdown formatting.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="border border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] px-5 py-2 text-lg font-bold font-serif hover:bg-[hsl(var(--muted)/.5)] hover:text-[hsl(var(--primary))] transition-colors">Flee</button>
            <button onClick={submitAction} disabled={!title.trim()} className="bg-[hsl(var(--primary))] px-6 py-2 text-lg font-bold font-serif text-black shadow-[0_0_15px_rgba(197,168,101,0.4)] hover:brightness-125 disabled:opacity-50 transition-all">Declare Foe</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ELDEN RING FOCUS MODE (BOSS BATTLE)
// ==========================================
function ZenModeOverlay({ bug, onClose }: { bug: Bug, onClose: () => void }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    else if (timeLeft === 0) setIsActive(false);
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const minutes = Math.floor(timeLeft / 60); const seconds = String(timeLeft % 60).padStart(2, '0');
  const branchName = `git checkout -b slay/${bug.key}-${bug.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

  const copyBranch = () => { navigator.clipboard.writeText(branchName); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#000000] text-white p-6 animate-in fade-in duration-1000 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[hsl(var(--primary)/.05)] via-black to-black opacity-60"></div>
      
      <button onClick={onClose} className="absolute top-8 right-8 p-3 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors z-10"><X size={32} /></button>
      
      <div className="text-center w-full max-w-2xl z-10">
        <h3 className="font-serif text-[18px] tracking-[0.3em] uppercase text-[hsl(var(--destructive))] mb-12 drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]">Enemy Felled... Soon</h3>
        <h1 className="text-8xl font-serif font-bold tracking-widest mb-8 text-[hsl(var(--primary))] drop-shadow-[0_0_30px_rgba(197,168,101,0.3)]">{minutes}:{seconds}</h1>
        <button onClick={toggleTimer} className={`mb-16 flex mx-auto items-center gap-3 border border-[hsl(var(--primary))] px-8 py-3.5 text-sm font-serif font-bold uppercase tracking-wider transition-all ${isActive ? 'bg-black text-[hsl(var(--primary))]' : 'bg-[hsl(var(--primary))] text-black shadow-[0_0_30px_rgba(197,168,101,0.5)] hover:bg-[hsl(var(--primary)/.9)]'}`}>
          {isActive ? <><Clock3 size={18}/> Pause Combat</> : <><Swords size={18}/> Enter the Arena</>}
        </button>

        <div className="text-left bg-black/50 border border-[hsl(var(--border))] p-10 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-6"><span className="font-mono text-sm font-bold text-[hsl(var(--destructive))]">{bug.key}</span><h2 className="text-2xl font-serif font-bold tracking-wide text-white">{bug.title}</h2></div>
          <div className="bg-black border border-[hsl(var(--primary)/.3)] p-5 flex items-center justify-between group cursor-pointer hover:border-[hsl(var(--primary))] transition-colors" onClick={copyBranch}>
            <code className="text-sm text-[hsl(var(--primary))] font-mono flex-1 truncate mr-4">{branchName}</code>
            <button className="text-[hsl(var(--muted-foreground))] group-hover:text-white transition-colors">{copied ? <CheckCheck size={20} className="text-[hsl(var(--primary))]"/> : <Copy size={20}/>}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- APP ENTRY / AUTH / SHELL / ROUTES ---

function AuthScreen() {
  const [isSignup, setIsSignup] = useState(false);
  const [step, setStep] = useState<'identity' | 'otp'>('identity');

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;

    const timer = window.setInterval(() => {
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendIn]);

  const requestOtp = async () => {
    setError('');
    setNotice('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Offer an email address to the Erdtree.');
      return;
    }

    if (isSignup && (!name.trim() || !username.trim())) {
      setError('The runes are incomplete. Enter a name and alias.');
      return;
    }

    setLoading(true);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: isSignup,
        emailRedirectTo: getAuthRedirectUrl(),
        data: isSignup
          ? {
              name: name.trim(),
              username: username.trim(),
            }
          : undefined,
      },
    });

    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setStep('otp');
    setOtp('');
    setResendIn(60);
    setNotice(`A sign-in sigil was sent to ${normalizedEmail}.`);
  };

  const verifyOtp = async () => {
    setError('');
    setNotice('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the full six-digit sigil.');
      return;
    }

    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: 'email',
    });

    setLoading(false);

    if (verifyError) {
      setError('The Grace rejects this sigil. It may be invalid or expired.');
      return;
    }

    // AppProvider listens for Supabase auth-state changes.
    // Do not manually fake currentUserId here.
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    setError('');
    setNotice('');
    setLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });

    // Normally the browser redirects before this matters.
    if (oauthError) {
      setLoading(false);
      setError(oauthError.message);
    }
  };

  const switchMode = () => {
    setIsSignup((value) => !value);
    setStep('identity');
    setName('');
    setUsername('');
    setEmail('');
    setOtp('');
    setError('');
    setNotice('');
    setResendIn(0);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-cover bg-top bg-no-repeat transition-opacity duration-1000"
        style={{
          backgroundImage: `url('/tree-bg.jpg')`,
          opacity: 0.55,
        }}
      />

      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-black/60 to-[#0a0a0a] pointer-events-none" />

      <div className="w-full max-w-sm border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--background)/.7)] backdrop-blur-md p-8 sm:p-10 shadow-[0_0_50px_rgba(197,168,101,0.15)] z-10 relative">
        <div className="flex flex-col items-center text-center mb-8">
          <span className="flex h-16 w-16 items-center justify-center border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] erdtree-glow mb-5">
            <Castle size={32} strokeWidth={1.5} />
          </span>

          <h1 className="text-2xl font-serif font-bold uppercase tracking-widest text-[hsl(var(--primary))] erdtree-text">
            Tarnished Tracker
          </h1>

          <p className="mt-2 font-serif text-[15px]  tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
            The Lands Between
          </p>
        </div>

        <h2 className="mb-6 text-center font-serif text-[27px] tracking-wide text-white">
          {step === 'otp'
            ? 'Receive Guidance (Verify OTP)'
            : isSignup
              ? 'Arise, Tarnished (Sign Up)'
              : 'Touch Grace (Sign In)'}
        </h2>

        {error && (
          <div className="mb-5 border border-[hsl(var(--destructive)/.5)] bg-[hsl(var(--destructive)/.1)] p-3 text-center text-lg font-bold text-[hsl(var(--destructive))] font-serif">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.08)] p-3 text-center text-lg font-serif text-[hsl(var(--primary))]">
            {notice}
          </div>
        )}

        {step === 'identity' ? (
          <>
            <div className="space-y-4">
              {isSignup && (
                <>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder="Given Name (e.g. Melina)"
                    className="block w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] px-2 py-2.5 text-xl font-serif text-center outline-none transition-colors focus:border-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground)/.5)] text-white"
                  />

                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    placeholder="Alias (Username)"
                    className="block w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] px-2 py-2.5 text-xl font-serif text-center outline-none transition-colors focus:border-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground)/.5)] text-white"
                  />
                </>
              )}

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="Gracebound Email"
                className="block w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] px-2 py-2.5 text-xl font-serif text-center outline-none transition-colors focus:border-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground)/.5)] text-white"
              />

              <button
                type="button"
                onClick={() => void requestOtp()}
                disabled={loading}
                className="mt-5 w-full border border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)] py-3.5 text-lg font-serif font-bold  text-[hsl(var(--primary))] transition-all hover:bg-[hsl(var(--primary))] hover:text-black shadow-[0_0_15px_rgba(197,168,101,0.2)] disabled:opacity-50"
              >
                {loading ? 'Seeking Grace...' : 'Send Email Sigil (OTP)'}
              </button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[hsl(var(--border)/.6)]" />
              <span className="text-[9px]  text-[hsl(var(--muted-foreground))]">
                or
              </span>
              <div className="h-px flex-1 bg-[hsl(var(--border)/.6)]" />
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => void signInWithProvider('google')}
                disabled={loading}
                className="w-full border border-[hsl(var(--border))] bg-black/30 px-4 py-3 text-lg font-serif font-bold tracking-wide text-white transition-colors hover:border-[hsl(var(--primary)/.5)] hover:text-[hsl(var(--primary))] disabled:opacity-50"
              >
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => void signInWithProvider('github')}
                disabled={loading}
                className="w-full border border-[hsl(var(--border))] bg-black/30 px-4 py-3 text-lg font-serif font-bold tracking-wide text-white transition-colors hover:border-[hsl(var(--primary)/.5)] hover:text-[hsl(var(--primary))] disabled:opacity-50"
              >
                Continue with GitHub
              </button>
            </div>
          </>
        ) : (
          <div>
            <p className="mb-5 text-center font-serif text-lg leading-relaxed text-[hsl(var(--muted-foreground))]">
              Enter the six-digit code sent to
              <br />
              <span className="text-[hsl(var(--primary))]">{email}</span>
            </p>

            <OTPInput
              maxLength={6}
              value={otp}
              onChange={setOtp}
              containerClassName="flex justify-center gap-2"
              render={({ slots }) => (
                <>
                  {slots.map((slot, index) => (
                    <div
                      key={index}
                      className={`flex h-12 w-10 items-center justify-center border bg-black/40 font-mono text-lg ${
                        slot.isActive
                          ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))] shadow-[0_0_12px_rgba(197,168,101,0.15)]'
                          : 'border-[hsl(var(--border))] text-white'
                      }`}
                    >
                      {slot.char ?? ''}
                    </div>
                  ))}
                </>
              )}
            />

            <button
              type="button"
              onClick={() => void verifyOtp()}
              disabled={loading || otp.length !== 6}
              className="mt-6 w-full border border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)] py-3.5 text-lg font-serif font-bold  text-[hsl(var(--primary))] transition-all hover:bg-[hsl(var(--primary))] hover:text-black shadow-[0_0_15px_rgba(197,168,101,0.2)] disabled:opacity-50"
            >
              {loading ? 'Communing...' : 'Verify Grace'}
            </button>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('identity');
                  setOtp('');
                  setError('');
                  setNotice('');
                }}
                className="text-[15px] font-serif font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
              >
                Change email
              </button>

              <button
                type="button"
                onClick={() => void requestOtp()}
                disabled={loading || resendIn > 0}
                className="text-[15px] font-serif font-bold text-[hsl(var(--primary))] disabled:text-[hsl(var(--muted-foreground))]"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}

        {step === 'identity' && (
          <div className="mt-8 border-t border-[hsl(var(--border)/.5)] pt-6 text-center">
            <button
              type="button"
              onClick={switchMode}
              className="font-serif text-lg font-bold tracking-wide text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
            >
              {isSignup
                ? 'Already bear the mark? Touch Grace.'
                : 'Maidenless? Seek the Erdtree.'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const { store, resetDemo, logout, switchWorkspace, createWorkspace } = useWorkspace();

  const currentUser = store.users.find((user) => user.id === store.currentUserId);
  const currentWorkspace = store.workspaces.find((ws) => ws.id === store.currentWorkspaceId) || store.workspaces[0];
  const userWorkspaces = store.workspaces.filter((ws) => ws.memberIds.includes(currentUser?.id ?? ''));

  const nav = [
    { href: '/', label: 'The Lands Between', en: 'All Issues', icon: Map },
    { href: '/dashboard', label: 'Runes & Records', en: 'Dashboard', icon: Activity },
    { href: '/how-it-works', label: 'Tarnished Guide', en: 'How it Works', icon: FileText },
  ];

  return <div className="app-noise min-h-[100dvh] bg-[hsl(var(--background))] transition-colors duration-300">
    <CommandPalette />
    
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-[hsl(var(--border)/.5)] bg-[hsl(var(--sidebar)/.8)] backdrop-blur-xl px-5 py-6 text-[hsl(var(--sidebar-foreground))] transition-transform duration-200 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between px-1">
        <Link href="/" className="flex items-center gap-3 text-[hsl(var(--sidebar-foreground))] no-underline">
          <span className="flex h-8 w-8 items-center justify-center border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Castle size={18} /></span>
          <span><span className="block text-[14px] font-serif font-bold tracking-wider erdtree-text">Erdtree Order</span></span>
        </Link>
        <button onClick={() => setMobileOpen(false)} className="md:hidden text-[hsl(var(--muted-foreground))]"><X size={20} /></button>
      </div>

      <div className="relative mt-10">
        <p className="mb-2 px-1 font-serif text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Current Realm <span className="font-sans tracking-normal opacity-70">(Workspace)</span></p>
        <button onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)} className="flex w-full items-center gap-3 border border-[hsl(var(--sidebar-border)/.5)] bg-[hsl(var(--sidebar-accent)/.5)] p-3 text-left hover:border-[hsl(var(--primary)/.5)] transition-all">
          <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_8px_currentColor]" />
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-serif font-bold text-[hsl(var(--foreground))]">{currentWorkspace?.name ?? 'Select Realm'}</p></div>
          <ChevronDown size={14} className="text-[hsl(var(--muted-foreground))]" />
        </button>
        {workspaceMenuOpen && (
          <div className="absolute left-0 top-16 z-50 w-full border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--sidebar))] p-2 shadow-2xl text-[hsl(var(--foreground))]">
            <div className="space-y-1">{userWorkspaces.map((ws) => <button key={ws.id} onClick={() => { switchWorkspace(ws.id); setWorkspaceMenuOpen(false); }} className={`flex w-full items-center justify-between px-3 py-2 text-xs font-serif font-bold transition-colors ${ws.id === currentWorkspace?.id ? 'bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]' : 'hover:bg-[hsl(var(--muted))]'}`}><span className="truncate">{ws.name}</span></button>)}</div>
            <button onClick={() => { setCreateWsOpen(true); setWorkspaceMenuOpen(false); }} className="mt-2 flex w-full items-center gap-2 border-t border-[hsl(var(--border))] px-3 pt-3 text-xs font-serif font-bold text-[hsl(var(--primary))] hover:brightness-125"><Plus size={14} /> Establish New Realm</button>
          </div>
        )}
      </div>

      <nav className="mt-8 space-y-1" aria-label="Main navigation">
        <p className="mb-3 px-1 font-serif text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Journey</p>
        {nav.map(({ href, label, en, icon: Icon }) => (
          <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-3 text-[13px] font-serif font-bold no-underline transition-all ${location === href ? 'bg-[hsl(var(--primary)/.1)] border-l-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)] hover:text-[hsl(var(--foreground))] border-l-2 border-transparent'}`}>
            <Icon size={16} /><span>{label} <span className="block text-[9px] font-sans font-normal opacity-70 tracking-normal text-[hsl(var(--muted-foreground))]">({en})</span></span>
            {href === '/' && <span className={`ml-auto px-1.5 py-0.5 font-mono text-[9px] font-bold ${location === href ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{store.bugs.filter((b) => b.workspaceId === currentWorkspace?.id && b.stage !== 'Closed').length}</span>}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-[hsl(var(--border)/.5)] pt-6">
        <div className="flex items-center gap-3 px-1">
          <Avatar user={currentUser} />
          <div className="min-w-0"><p className="truncate text-xs font-serif font-bold">{currentUser?.name}</p><p className="truncate font-mono text-[9px] text-[hsl(var(--muted-foreground))]">@{currentUser?.username}</p></div>
          <button onClick={() => setProfileOpen(!profileOpen)} className="ml-auto text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"><MoreHorizontal size={18} /></button>
        </div>
        
        {/* CLEANED UP RESET BUTTON TO PREVENT WEIRD WRAPPING */}
        <button onClick={resetDemo} className="mt-6 flex w-full items-center gap-3 px-1 text-left font-serif text-[10px] font-bold tracking-widest text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors uppercase">
          <RefreshCw size={14} className="shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span>Burn the Erdtree</span>
            <span className="font-sans normal-case tracking-normal opacity-70 text-[9px]">(Reset DB)</span>
          </div>
        </button>
      </div>
    </aside>

    {mobileOpen && <button onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm md:hidden" />}
    
    <main className="relative min-h-[100dvh] md:pl-[260px]">
      {/* LOCAL ELDEN RING BACKGROUND VIA PUBLIC FOLDER FOR WORKSPACE */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none md:left-[260px] bg-cover bg-top bg-no-repeat transition-opacity duration-1000"
        style={{ backgroundImage: `url('/erdtree-bg.jpg')`, opacity: 0.4 }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none md:left-[260px] bg-gradient-to-b from-black/50 via-[hsl(var(--background)/.7)] to-[hsl(var(--background))]"></div>

      <header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.6)] px-6 backdrop-blur-xl md:px-10">
        <button onClick={() => setMobileOpen(true)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] md:hidden"><Menu size={20} /></button>
        <div className="hidden items-center gap-2 text-[11px] font-serif font-bold tracking-widest text-[hsl(var(--muted-foreground))] uppercase md:flex"><Map size={14} className="mr-1"/> <span className="text-[hsl(var(--primary))]">{currentWorkspace?.name ?? 'Realm'}</span><span className="text-[hsl(var(--border))]">/</span><span className="text-[hsl(var(--foreground))]">{location === '/' ? 'The Lands Between' : location.slice(1).split('/')[0]}</span></div>
        <div className="relative ml-auto flex items-center gap-4">
          <div className="hidden items-center gap-2 border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.5)] backdrop-blur-md px-3 py-1.5 text-[11px] font-serif font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.5)] cursor-pointer transition-colors sm:flex" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}><Search size={14} className="text-[hsl(var(--primary))]"/><span>Annals <span className="font-sans tracking-normal opacity-70 normal-case">(Search)</span></span><kbd className="ml-2 bg-[hsl(var(--background)/.5)] px-1.5 py-0.5 font-mono text-[9px] text-[hsl(var(--primary))] border border-[hsl(var(--border)/.5)]">⌘K</kbd></div>
          <button onClick={() => setProfileOpen(!profileOpen)} className="rounded-full ring-1 ring-[hsl(var(--border))] hover:ring-[hsl(var(--primary))] transition-all"><Avatar user={currentUser} /></button>
          {profileOpen && (
            <div className="absolute right-0 top-12 z-30 w-64 border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--sidebar))] p-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[hsl(var(--border))]"><Avatar user={currentUser} size="md" /><div className="min-w-0"><p className="truncate text-sm font-serif font-bold">{currentUser?.name}</p><p className="truncate font-mono text-[10px] text-[hsl(var(--muted-foreground))]">@{currentUser?.username}</p></div></div>
              <button onClick={logout} className="flex w-full items-center gap-2 px-2 py-2 text-xs font-serif font-bold uppercase tracking-widest text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)] transition-colors"><LogOut size={14} /> Sever Connection <span className="font-sans normal-case tracking-normal opacity-70">(Logout)</span></button>
            </div>
          )}
        </div>
      </header>
      <div className="page-enter relative z-10 pt-4">{children}</div>
    </main>

    {createWsOpen && <CreateWorkspaceModal onClose={() => setCreateWsOpen(false)} onCreate={(name, key) => { createWorkspace(name, key); setCreateWsOpen(false); }} />}

      <HelpAssistant />
    </div>;
}

function CreateWorkspaceModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, key: string) => void }) {
  const [name, setName] = useState(''); const [key, setKey] = useState('');
  const handleSubmit = (e: FormEvent) => { e.preventDefault(); if (!name.trim() || !key.trim()) return; onCreate(name.trim(), key.trim().toUpperCase()); };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-md border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--card)/.9)] backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(197,168,101,0.15)]">
        <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-serif font-bold erdtree-text">Discover New Realm <span className="text-xs font-sans tracking-normal opacity-70 text-[hsl(var(--muted-foreground))]">(New Workspace)</span></h2><button type="button" onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"><X size={20} /></button></div>
        <div className="space-y-5">
          <label className="block text-xs font-serif font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-2">Realm Name<input value={name} onChange={(e) => { setName(e.target.value); if (!key) setKey(e.target.value.slice(0, 3).toUpperCase()); }} placeholder="e.g. Limgrave" className="mt-2 block w-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] px-3 py-3 text-sm font-sans outline-none focus:border-[hsl(var(--primary))] text-[hsl(var(--foreground))]" /></label>
          <label className="block text-xs font-serif font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-2">Sigil Prefix<input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} maxLength={5} placeholder="e.g. LMG" className="mt-2 block w-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] px-3 py-3 text-sm font-mono outline-none focus:border-[hsl(var(--primary))] text-[hsl(var(--foreground))]" /></label>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-serif font-bold uppercase tracking-widest hover:text-[hsl(var(--primary))] transition-colors">Flee <span className="font-sans normal-case tracking-normal opacity-70">(Cancel)</span></button>
          <button type="submit" disabled={!name || !key} className="bg-[hsl(var(--primary))] px-6 py-2.5 text-xs font-serif font-bold uppercase tracking-widest text-black shadow-[0_0_15px_rgba(197,168,101,0.3)] hover:brightness-125 disabled:opacity-50 transition-all">Establish</button>
        </div>
      </form>
    </div>
  );
}

function AppProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(loadStore);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store]);

  const updateStore = (updater: (current: Store) => Store) => setStore((current) => updater(current));
  const resetDemo = () => { setStore(seedStore()); localStorage.removeItem(STORAGE_KEY); };

  const login = (username: string, pass: string) => {
    const found = (store.users || []).find((u) => (u.username || '').toLowerCase() === username.toLowerCase() && u.password === pass);
    if (found) {
      const userWorkspaces = (store.workspaces || []).filter((ws) => ws.memberIds.includes(found.id));
      setStore((curr) => ({ ...curr, currentUserId: found.id, currentWorkspaceId: userWorkspaces[0]?.id || curr.workspaces?.[0]?.id || null }));
      return true;
    }
    return false;
  };

  const signup = (name: string, username: string, pass: string) => {
    if ((store.users || []).some(u => (u.username || '').toLowerCase() === username.toLowerCase())) return false; 
    const newUser: User = { id: uid('user'), name, username, role: 'Tarnished', password: pass };
    const newWsKey = name.length >= 3 ? name.slice(0, 3).toUpperCase() : 'RLM';
    const newWorkspace: Workspace = { id: uid('ws'), name: `Realm of ${name}`, key: newWsKey, ownerId: newUser.id, memberIds: [newUser.id] };
    const newProduct: Product = { id: uid('prod'), workspaceId: newWorkspace.id, name: `Golden Order`, key: newWsKey, description: 'Default Product' };
    const newComp: Component = { id: uid('comp'), productId: newProduct.id, name: 'The Lands Between', color: '#c5a865' };
    setStore((curr) => ({ ...curr, currentUserId: newUser.id, currentWorkspaceId: newWorkspace.id, users: [...(curr.users || []), newUser], workspaces: [...(curr.workspaces || []), newWorkspace], products: [...(curr.products || []), newProduct], components: [...(curr.components || []), newComp] }));
    return true;
  };

  const logout = () => setStore((curr) => ({ ...curr, currentUserId: null }));
  const switchWorkspace = (workspaceId: string) => setStore((curr) => ({ ...curr, currentWorkspaceId: workspaceId }));
  const createWorkspace = (name: string, key: string) => {
    const wsId = uid('ws'); const newWs: Workspace = { id: wsId, name, key, ownerId: store.currentUserId ?? 'u1', memberIds: [store.currentUserId ?? 'u1'] };
    const newProd: Product = { id: uid('prod'), workspaceId: wsId, name: `${name} Domain`, key, description: 'Primary component' }; const newComp: Component = { id: uid('comp'), productId: newProd.id, name: 'Capital', color: '#c5a865' };
    setStore((curr) => ({ ...curr, currentWorkspaceId: wsId, workspaces: [...(curr.workspaces || []), newWs], products: [...(curr.products || []), newProd], components: [...(curr.components || []), newComp] }));
    return wsId;
  };

  if (!store.currentUserId) return <WorkspaceContext.Provider value={{ store, updateStore, resetDemo, login, signup, logout, switchWorkspace, createWorkspace }}><GlobalStyles/><AuthScreen /></WorkspaceContext.Provider>;
  return <WorkspaceContext.Provider value={{ store, updateStore, resetDemo, login, signup, logout, switchWorkspace, createWorkspace }}><GlobalStyles/>{children}</WorkspaceContext.Provider>;
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-serif text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--primary))] mb-2">{eyebrow}</p><h1 className="text-3xl font-serif font-bold tracking-wide text-[hsl(var(--foreground))] erdtree-text">{title}</h1>{description && <p className="mt-3 max-w-2xl text-[13px] font-serif leading-relaxed text-[hsl(var(--muted-foreground))]">{description}</p>}</div>{action}</div>;
}

function BugRow({ bug, onOpen }: { bug: Bug; onOpen?: () => void }) {
  const { store } = useWorkspace();
  const assignee = (store.users || []).find((user) => user.id === bug.assigneeId);
  const component = (store.components || []).find((item) => item.id === bug.componentId);
  return <button onClick={onOpen} className="group grid w-full grid-cols-[minmax(0,1fr)_100px_100px_100px_70px_32px] items-center gap-4 border-b border-[hsl(var(--border)/.5)] px-5 py-4 text-left transition-all last:border-0 hover:bg-[hsl(var(--muted)/.6)]">
    <div className="min-w-0"><div className="flex min-w-0 items-center gap-3"><span className="font-mono text-[11px] font-bold text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">{bug.key}</span><span className="truncate text-xl font-serif font-bold text-[hsl(var(--foreground))]">{bug.title}</span>{bug.dependsOn?.length > 0 && <Link2 size={12} className="shrink-0 text-[hsl(var(--primary))]" />}</div><div className="mt-2 flex items-center gap-2 font-mono text-[9px]  tracking-wider text-[hsl(var(--muted-foreground))]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: component?.color }} />{component?.name}<span className="text-[hsl(var(--border))]">·</span>{relativeDate(bug.updatedAt)}</div></div>
    <div className="flex gap-1.5 overflow-hidden">{(bug.tags || []).slice(0,2).map(t => <span key={t} className="truncate border border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] px-1.5 py-0.5 text-[9px] font-bold  tracking-wider text-[hsl(var(--primary))]">{t}</span>)}</div>
    <StageBadge stage={bug.stage} compact /><SeverityBadge severity={bug.severity} /><PriorityPill priority={bug.priority} /><Avatar user={assignee} />
  </button>;
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center border border-dashed border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.3)] px-5 py-24 text-center"><span className="mb-6 flex h-16 w-16 items-center justify-center border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.05)] text-[hsl(var(--primary))] shadow-inner"><Ghost size={28} /></span><h3 className="text-[27px] font-serif font-bold text-[hsl(var(--primary))]">{title}</h3><p className="mt-3 max-w-sm font-serif text-[19px] leading-relaxed text-[hsl(var(--muted-foreground))]">{description}</p>{action && <div className="mt-8">{action}</div>}</div>;
}

function WorkspacePage() {
  const { store, updateStore } = useWorkspace();
  const [location, setLocation] = useLocation();
  const initialParams = useMemo(() => new URLSearchParams(location.split('?')[1] ?? ''), [location]);
  const [query, setQuery] = useState(initialParams.get('q') ?? '');
  const [stageFilter, setStageFilter] = useState<Stage | 'All'>((initialParams.get('stage') as Stage | 'All') || 'All');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>((initialParams.get('severity') as Severity | 'All') || 'All');
  const [componentFilter, setComponentFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  const currentWs = store.workspaces.find((ws) => ws.id === store.currentWorkspaceId) || store.workspaces[0];
  const workspaceBugs = useMemo(() => (store.bugs || []).filter((b) => b.workspaceId === currentWs?.id), [store.bugs, currentWs]);

  const filtered = useMemo(() => workspaceBugs.filter((bug) => {
    const text = `${bug.key} ${bug.title} ${bug.description} ${(bug.tags||[]).join(' ')}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (stageFilter === 'All' || bug.stage === stageFilter) && (severityFilter === 'All' || bug.severity === severityFilter) && (componentFilter === 'All' || bug.componentId === componentFilter);
  }), [workspaceBugs, query, stageFilter, severityFilter, componentFilter]);
  
  const activeCount = [query, stageFilter !== 'All' ? stageFilter : '', severityFilter !== 'All' ? severityFilter : '', componentFilter !== 'All' ? componentFilter : ''].filter(Boolean).length;

  const updateBugStage = (bugId: string, newStage: Stage) => {
    const bug = store.bugs.find(b => b.id === bugId);
    if (!bug || bug.stage === newStage) return;
    updateStore((current) => ({
      ...current, bugs: current.bugs.map((item) => item.id === bugId ? { ...item, stage: newStage, resolution: newStage === 'Closed' ? item.resolution ?? 'Fixed' : null, updatedAt: now(), history: [{ id: uid('history'), fieldChanged: 'stage', oldValue: bug.stage, newValue: newStage, changedBy: current.currentUserId ?? 'u1', changedAt: now() }, ...(item.history || [])] } : item)
    }));
    setToast(`${bug.key} moved to ${stageMeta[newStage].label}`);
    window.setTimeout(() => setToast(''), 2200);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-10 lg:px-12 relative z-10">
      <SectionHeader eyebrow={`Realm · ${currentWs?.name ?? ''}`} title="The Lands Between" description="Track the great foes that plague this realm. Slay them to restore the Golden Order." action={<div className="flex items-center gap-3"><Link href="/dashboard" className="hidden items-center gap-2 border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md px-4 py-2.5 text-lg font-serif font-bold  text-[hsl(var(--muted-foreground))] no-underline hover:bg-[hsl(var(--muted)/.8)] hover:text-[hsl(var(--primary))] sm:inline-flex transition-colors"><Activity size={14} /> Runes & Records</Link><button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-[hsl(var(--primary))] px-6 py-2.5 text-lg font-serif font-bold  text-black shadow-[0_0_15px_rgba(197,168,101,0.3)] transition-transform hover:brightness-125"><Swords size={14} /> Declare Foe <span className="font-sans normal-case tracking-normal opacity-70 text-[9px]">(New Issue)</span></button></div>} />
      
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[{ label: 'Active Foes', value: workspaceBugs.filter((b) => b.stage !== 'Closed').length, note: 'roaming the lands', color: '#c5a865' }, { label: 'Cursed (Blocked)', value: workspaceBugs.filter((b) => b.stage === 'Blocked').length, note: 'requires cleansing', color: '#8a1a1a' }, { label: 'Roundtable', value: workspaceBugs.filter((b) => b.stage === 'In Review').length, note: 'seeking counsel', color: '#4a6583' }, { label: 'Felled Recently', value: workspaceBugs.filter((b) => b.stage === 'Closed' && new Date(b.updatedAt).getTime() > Date.now() - 30 * 86400000).length, note: 'victories claimed', color: '#555555' }].map((stat, index) => <div key={stat.label} className={`border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-5 shadow-sm transition-transform hover:-translate-y-1 hover:border-[hsl(var(--primary)/.4)] ${index === 0 ? 'sm:col-span-1' : ''}`}><div className="flex items-center justify-between"><p className="text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]">{stat.label}</p><span className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ background: stat.color, color: stat.color }} /></div><p className="mt-4 font-serif text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">{stat.value}</p><p className="mt-2 text-[15px] font-serif italic text-[hsl(var(--muted-foreground))]">{stat.note}</p></div>)}
      </div>
      
      <div className="mb-6 flex flex-col gap-3 border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-3 shadow-sm sm:flex-row sm:items-center">
        {/* CLEANER SEARCH BAR FIX */}
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--primary))]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SEARCH BY SIGIL, NAME, LORE..." className="h-12 w-full bg-[hsl(var(--background)/.5)] pl-12 pr-4 text-lg font-serif font-bold tracking-wider outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))]/50 border border-[hsl(var(--border)/.5)] focus:border-[hsl(var(--primary)/.5)] text-[hsl(var(--foreground))]" />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto">
          {/* TALLER BUTTONS FOR PROPORTION FIX */}
          <div className="hidden h-12 items-center gap-2 sm:flex">
            <button onClick={() => { setStageFilter('All'); setSeverityFilter('Critical'); setComponentFilter('All'); }} className="h-full border border-[#8a1a1a]/30 bg-[#8a1a1a]/10 px-4 text-[15px] font-bold font-serif  text-[#8a1a1a] hover:bg-[#8a1a1a]/20 transition-colors">Demigods</button>
            <button onClick={() => { setStageFilter('All'); setSeverityFilter('All'); setComponentFilter('All'); setQuery(store.currentUserId || ''); }} className="h-full border border-[hsl(var(--primary))/30] bg-[hsl(var(--primary))/10] px-4 text-[15px] font-bold font-serif  text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/20] transition-colors">My Battles</button>
          </div>
          
          <span className="hidden h-8 w-px bg-[hsl(var(--border))] sm:block" />
          
          <div className="flex h-12 items-center border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] p-1">
            <button onClick={() => setViewMode('list')} className={`flex h-full items-center gap-2 px-4 text-[15px] font-serif font-bold  transition-all ${viewMode === 'list' ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm border border-[hsl(var(--border)/.5)]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border border-transparent'}`}><ListFilter size={14} /> Codex <span className="font-sans normal-case opacity-70 tracking-normal text-[9px] hidden xl:inline">(List)</span></button>
            <button onClick={() => setViewMode('board')} className={`flex h-full items-center gap-2 px-4 text-[15px] font-serif font-bold  transition-all ${viewMode === 'board' ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm border border-[hsl(var(--border)/.5)]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border border-transparent'}`}><Layers3 size={14} /> Map <span className="font-sans normal-case opacity-70 tracking-normal text-[9px] hidden xl:inline">(Board)</span></button>
          </div>
          
          <span className="hidden h-8 w-px bg-[hsl(var(--border))] sm:block" />
          
          <button onClick={() => setShowFilters(!showFilters)} className={`flex h-12 shrink-0 items-center gap-2 border px-4 text-[15px] font-serif font-bold  transition-colors ${showFilters || activeCount ? 'bg-[hsl(var(--primary)/.1)] border-[hsl(var(--primary)/.5)] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border)/.5)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.8)] hover:text-[hsl(var(--foreground))]'}`}><SlidersHorizontal size={14} /> Divination {activeCount > 0 && <span className="bg-[hsl(var(--primary))] px-1.5 py-0.5 text-black">{activeCount}</span>}</button>
          {activeCount > 0 && <button onClick={() => { setQuery(''); setStageFilter('All'); setSeverityFilter('All'); setComponentFilter('All'); }} className="shrink-0 text-[15px] font-bold  text-[hsl(var(--primary))] hover:underline font-serif">Clear</button>}
        </div>
      </div>
      
      {showFilters && <div className="mb-6 grid grid-cols-1 gap-4 border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-6 sm:grid-cols-3"><label className="text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]">Battle State <span className="tracking-normal font-sans opacity-70">(Status)</span><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as Stage | 'All')} className="mt-3 block w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-3 py-3 text-lg font-serif font-bold outline-none shadow-sm focus:border-[hsl(var(--primary))]"><option>All</option>{stages.map((stage) => <option key={stage}>{stageMeta[stage].label}</option>)}</select></label><label className="text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]">Threat Level <span className="tracking-normal font-sans opacity-70">(Severity)</span><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as Severity | 'All')} className="mt-3 block w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-3 py-3 text-lg font-serif font-bold outline-none shadow-sm focus:border-[hsl(var(--primary))]"><option>All</option>{Object.keys(severityMeta).map((severity) => <option key={severity}>{severityMeta[severity as Severity].label}</option>)}</select></label><label className="text-[15px] font-bold  font-serif text-[hsl(var(--muted-foreground))]">Region <span className="tracking-normal font-sans opacity-70">(Component)</span><select value={componentFilter} onChange={(event) => setComponentFilter(event.target.value)} className="mt-3 block w-full border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-3 py-3 text-lg font-serif font-bold outline-none shadow-sm focus:border-[hsl(var(--primary))]"><option value="All">All</option>{store.components.filter(c => c.productId === (store.products.find(p => p.workspaceId === currentWs?.id)?.id)).map((component) => <option key={component.id} value={component.id}>{component.name}</option>)}</select></label></div>}
      
      {viewMode === 'list' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md shadow-sm"><div className="flex items-center justify-between border-b border-[hsl(var(--border)/.5)] px-5 py-4 bg-[hsl(var(--background)/.5)]"><div className="flex items-center gap-3"><Crosshair size={18} className="text-[hsl(var(--primary))]" /><span className="text-xl font-serif font-bold  ">Known Foes</span></div><span className="font-mono text-[10px]  font-bold text-[hsl(var(--muted-foreground))]">{filtered.length} Discovered</span></div>{filtered.length === 0 ? <div className="p-8"><EmptyState title="No foes found" description="The lands are quiet. Declare a foe to begin the hunt." action={<button onClick={() => setShowNew(true)} className="mt-6 border border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)] px-8 py-3 text-lg font-serif font-bold  text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-black transition-all"><Swords size={14} className="inline mr-2" /> Declare Foe</button>} /></div> : <div>{filtered.map((bug) => <BugRow key={bug.id} bug={bug} onOpen={() => setLocation(`/bugs/${bug.id}`)} />)}</div>}</div>
          <aside className="space-y-6">
            <div className="border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-6 shadow-sm"><div className="flex items-center gap-3"><Map size={18} className="text-[hsl(var(--primary))]" /><h2 className="text-xl font-serif font-bold  text-[hsl(var(--foreground))]">The Path</h2></div><p className="mt-3 text-lg font-serif leading-relaxed text-[hsl(var(--muted-foreground))]">Guide the foe through the rites of battle. Only when its resolution is certain may it be Felled.</p><div className="mt-6 space-y-3">{stages.slice(0, 5).map((stage, index) => <div key={stage} className="flex items-center gap-4 border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] p-3"><span className="flex h-7 w-7 items-center justify-center font-serif text-base font-bold text-black" style={{ background: stageMeta[stage].tint }}>{index + 1}</span><span className="text-lg font-serif font-bold ">{stageMeta[stage].label}</span>{index < 4 && <ArrowRight size={14} className="ml-auto text-[hsl(var(--muted-foreground))]" />}</div>)}</div></div>
            <div className="border border-[hsl(var(--destructive)/.5)] bg-[hsl(var(--destructive)/.05)] backdrop-blur-md p-6 shadow-[0_0_30px_rgba(138,26,26,0.1)]"><div className="flex items-center justify-between"><p className="font-serif text-[15px] font-bold  text-[hsl(var(--destructive))]">Destined Death</p><Skull size={18} className="text-[hsl(var(--destructive))]" /></div><p className="mt-5 font-serif text-4xl font-bold  text-[hsl(var(--foreground))]">{workspaceBugs.filter((bug) => bug.stage === 'Blocked').length === 0 ? 'No Curses.' : `${workspaceBugs.filter((bug) => bug.stage === 'Blocked').length} Cursed.`}</p><p className="mt-3 font-serif text-lg leading-relaxed text-[hsl(var(--muted-foreground))]">Foes marked as Cursed (Blocked) halt the progression of the Golden Order. Cleanse them immediately.</p></div>
          </aside>
        </div>
      ) : (
        <KanbanBoard bugs={filtered} onMove={updateBugStage} />
      )}

      {toast && <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 border border-[hsl(var(--primary))] bg-black px-6 py-3.5 text-lg font-serif font-bold  text-[hsl(var(--primary))] shadow-[0_0_30px_rgba(197,168,101,0.2)]"><Flame size={16} />{toast}</div>}
      {showNew && <NewBugModal onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); setLocation(`/bugs/${id}`); }} />}
    </div>
  );
}

function BugDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { store, updateStore } = useWorkspace();
  const [, setLocation] = useLocation();
  const bug = (store.bugs || []).find((item) => item.id === id);
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState('');
  const [commentType, setCommentType] = useState<CommentType>('Info');
  const [showRelation, setShowRelation] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<'story' | 'diff'>('story');
  
  const [zenMode, setZenMode] = useState(false);

  if (!bug) return <div className="mx-auto max-w-2xl px-5 py-20 relative z-10"><EmptyState title="Foe not found" description="It may have been vanquished or belongs to another realm." /></div>;
  
  const reporter = store.users.find((user) => user.id === bug.reporterId);
  const assignee = store.users.find((user) => user.id === bug.assigneeId);
  const component = store.components.find((item) => item.id === bug.componentId);
  const dependencies = store.bugs.filter(b => bug.dependsOn?.includes(b.id));
  const blockers = store.bugs.filter(b => b.dependsOn?.includes(bug.id));

  const updateBug = (patch: Partial<Bug>, field?: string, oldValue?: string, newValue?: string) => updateStore((current) => ({ ...current, bugs: current.bugs.map((item) => item.id === bug.id ? { ...item, ...patch, updatedAt: now(), history: field ? [{ id: uid('history'), fieldChanged: field, oldValue: oldValue ?? '', newValue: newValue ?? '', changedBy: current.currentUserId ?? 'u1', changedAt: now() }, ...(item.history || [])] : item.history } : item) }));
  const move = (direction: -1 | 1) => { const index = stages.indexOf(bug.stage); const next = stages[Math.max(0, Math.min(stages.length - 1, index + direction))]; if (next === bug.stage) return; updateBug({ stage: next, resolution: next === 'Closed' ? bug.resolution ?? 'Fixed' : null }, 'stage', bug.stage, next); setToast(`Advanced to ${stageMeta[next].label}`); window.setTimeout(() => setToast(''), 2200); };
  const addComment = () => { if (!comment.trim()) return; const entry: Comment = { id: uid('comment'), authorId: store.currentUserId ?? 'u1', body: comment.trim(), commentType, createdAt: now() }; updateBug({ comments: [...(bug.comments||[]), entry] }); setComment(''); setToast('Lore transcribed'); window.setTimeout(() => setToast(''), 2200); };
  const addAttachment = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const attachment: Attachment = { id: uid('attachment'), fileName: file.name, fileUrl: String(reader.result), uploadedBy: store.currentUserId ?? 'u1', createdAt: now() }; updateStore((current) => ({ ...current, bugs: current.bugs.map((item) => item.id === bug.id ? { ...item, attachments: [...(item.attachments||[]), attachment], updatedAt: now() } : item) })); setToast('Vision recorded'); window.setTimeout(() => setToast(''), 2200); }; reader.readAsDataURL(file); };

  const renderDiffLine = (line: string, idx: number) => {
    if (line.startsWith('+')) return <div key={idx} className="bg-[#c5a865]/10 px-4 py-0.5 text-[#c5a865]"><span className="mr-4 inline-block w-4 select-none opacity-50">+</span>{line.substring(1)}</div>;
    if (line.startsWith('-')) return <div key={idx} className="bg-[#8a1a1a]/10 px-4 py-0.5 text-[#8a1a1a]"><span className="mr-4 inline-block w-4 select-none opacity-50">-</span>{line.substring(1)}</div>;
    if (line.startsWith('@@')) return <div key={idx} className="bg-[hsl(var(--border))] px-4 py-1.5 text-xs text-[hsl(var(--muted-foreground))]">{line}</div>;
    return <div key={idx} className="px-4 py-0.5 text-[hsl(var(--foreground)/.7)]"><span className="mr-4 inline-block w-4 select-none opacity-0"> </span>{line}</div>;
  };

  return <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-10 lg:px-12 relative z-10">
    {zenMode && <ZenModeOverlay bug={bug} onClose={() => setZenMode(false)} />}
    
    <div className="mb-6 flex items-center justify-between"><button onClick={() => setLocation('/')} className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"><ArrowLeft size={15} /> Flee Battle</button><div className="flex items-center gap-3">
      <button onClick={() => setZenMode(true)} className="flex items-center gap-2 border border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)] px-5 py-2.5 text-xs font-serif font-bold uppercase tracking-widest text-[hsl(var(--primary))] shadow-[0_0_15px_rgba(197,168,101,0.2)] transition-all hover:bg-[hsl(var(--primary))] hover:text-black"><Swords size={14}/> Traverse Fog <span className="font-sans normal-case tracking-normal opacity-70 text-[9px]">(Focus)</span></button>
      <button onClick={() => setEditing(!editing)} className="flex items-center gap-2 border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md px-5 py-2.5 text-xs font-serif font-bold uppercase tracking-widest hover:bg-[hsl(var(--muted)/.8)] transition-colors"><Settings2 size={14} /> {editing ? 'Seal Edits' : 'Edit Foe'}</button>
    </div></div>
    
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <div className="mb-8"><div className="flex items-start gap-4"><div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] shadow-inner"><Skull size={24} /></div><div className="min-w-0 flex-1"><h1 className="text-4xl font-serif font-bold leading-tight tracking-wide text-[hsl(var(--primary))] erdtree-text">{bug.title}</h1><div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]"><span>{bug.key}</span><span>/</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ background: component?.color, color: component?.color }} />{component?.name}</span><span>/</span><span>{relativeDate(bug.updatedAt)}</span></div><p className="mt-6 whitespace-pre-wrap border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-6 text-[14px] font-serif leading-relaxed text-[hsl(var(--foreground))]">{bug.description}</p></div></div></div>
        
        {/* Stage Progress Bar */}
        <div className="mb-10 border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-6 py-4"><div className="flex items-center gap-3"><span className="font-serif text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Battle State</span><StageBadge stage={bug.stage} /></div><div className="flex items-center gap-2"><button onClick={() => move(-1)} disabled={bug.stage === stages[0]} className="border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] disabled:opacity-30 transition-colors"><ArrowLeft size={14} /></button><button onClick={() => move(1)} disabled={bug.stage === stages[stages.length - 1]} className="border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] disabled:opacity-30 transition-colors"><ArrowRight size={14} /></button></div></div><div className="flex items-center gap-2 overflow-x-auto px-6 py-5">{stages.map((stage, index) => <div key={stage} className="flex min-w-max items-center gap-2">{<button onClick={() => updateBug({ stage, resolution: stage === 'Closed' ? bug.resolution ?? 'Fixed' : null }, 'stage', bug.stage, stage)} className={`flex items-center gap-2 border px-4 py-2 text-[11px] font-serif font-bold uppercase tracking-widest transition-all ${stage === bug.stage ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] shadow-sm' : 'border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]'}`}><span className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ background: stageMeta[stage].tint, color: stageMeta[stage].tint }} />{stageMeta[stage].label}</button>}{index < stages.length - 1 && <ArrowRight size={14} className="text-[hsl(var(--border))] mx-1" />}</div>)}</div>{bug.stage === 'Closed' && <div className="flex flex-wrap items-center gap-4 border-t border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.5)] px-6 py-4"><span className="font-serif text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Resolution</span><select value={bug.resolution ?? 'Fixed'} onChange={(event) => updateBug({ resolution: event.target.value as Resolution }, 'resolution', bug.resolution ?? '', event.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-[11px] font-serif font-bold uppercase tracking-widest outline-none shadow-sm focus:border-[hsl(var(--primary))]">{resolutionOptions.map((value) => <option key={value}>{value}</option>)}</select></div>}</div>
        
        {/* Story vs Code Tabs */}
        <div className="mb-6 flex gap-1 border-b border-[hsl(var(--border)/.5)]">
          <button onClick={() => setActiveTab('story')} className={`flex items-center gap-2 px-6 py-3 text-xs font-serif font-bold uppercase tracking-widest transition-all ${activeTab === 'story' ? 'border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/.05)]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.5)]'}`}><MessageCircle size={16}/> Scribe's Tale <span className="font-sans normal-case tracking-normal opacity-70 text-[9px]">(Comments)</span></button>
          <button onClick={() => setActiveTab('diff')} className={`flex items-center gap-2 px-6 py-3 text-xs font-serif font-bold uppercase tracking-widest transition-all ${activeTab === 'diff' ? 'border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/.05)]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.5)]'}`}><Code2 size={16}/> Incantation <span className="font-sans normal-case tracking-normal opacity-70 text-[9px]">(Code Patch)</span></button>
        </div>

        {activeTab === 'story' ? (
          <section className="mb-7">
            <div className="space-y-4">{(!bug.comments || bug.comments.length === 0) ? <EmptyState title="No lore recorded" description="Be the first to inscribe the history of this foe." action={null} /> : bug.comments.map((item) => { const author = store.users.find((user) => user.id === item.authorId); return <div key={item.id} className="border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-6 shadow-sm"><div className="flex items-center gap-3"><Avatar user={author} /><span className="text-sm font-serif font-bold text-[hsl(var(--primary))]">{author?.name}</span><span className="border border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] px-2 py-1 font-serif text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{item.commentType}</span><span className="ml-auto font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{relativeDate(item.createdAt)}</span></div><p className="mt-5 pl-[52px] text-[14px] font-serif leading-relaxed text-[hsl(var(--foreground))]">{item.body}</p></div>; })}</div>
            <div className="mt-6 border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-5 shadow-sm"><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Inscribe your findings, a strategy, or a warning..." rows={4} className="focus-ring block w-full resize-none bg-transparent px-2 font-serif text-[14px] outline-none placeholder:text-[hsl(var(--muted-foreground))]" /><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border)/.5)] pt-5"><select value={commentType} onChange={(event) => setCommentType(event.target.value as CommentType)} className="border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2.5 text-[11px] font-serif font-bold uppercase tracking-widest outline-none shadow-sm">{['Info', 'Fix Proposed', 'Needs Repro', 'Verified'].map((value) => <option key={value}>{value}</option>)}</select><button onClick={addComment} disabled={!comment.trim()} className="flex items-center gap-2 bg-[hsl(var(--primary))] px-6 py-2.5 text-xs font-serif font-bold uppercase tracking-widest text-black shadow-[0_0_15px_rgba(197,168,101,0.2)] disabled:opacity-50 hover:brightness-125 transition-all"><FileText size={14} /> Transcribe</button></div></div>
          </section>
        ) : (
          <section className="mb-7">
            {bug.codePatch ? (
              <div className="overflow-hidden border border-[hsl(var(--border))] bg-black shadow-xl">
                <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[#111] px-5 py-4 text-xs font-mono font-bold text-[hsl(var(--primary))]"><Code2 size={16} /> diff --git a/src/spell.ts b/src/spell.ts</div>
                <div className="overflow-x-auto py-4 font-mono text-[12px] leading-loose tracking-wide text-zinc-300">
                  {bug.codePatch.split('\n').map((line, idx) => renderDiffLine(line, idx))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 border border-dashed border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.05)] text-center backdrop-blur-md">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] erdtree-glow"><Code2 size={32} /></div>
                <h3 className="font-serif font-bold text-2xl mb-3 text-[hsl(var(--primary))] erdtree-text">No Incantation Present</h3>
                <p className="text-xl font-serif text-[hsl(var(--muted-foreground))] max-w-md">No Git patch has been attached to this foe. Incantations are supplied manually; the Guidance of Grace is the site-help assistant and does not generate code fixes.</p>
              </div>
            )}
          </section>
        )}

        {editing && <EditPanel bug={bug} onSave={(patch) => { updateBug(patch, 'issue details', bug.title, patch.title ?? bug.title); setEditing(false); setToast('Records amended'); window.setTimeout(() => setToast(''), 2200); }} />}
      </div>

      <aside className="space-y-6">
        {/* Metadata Sidebar */}
        <div className="border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-6 shadow-sm"><h2 className="mb-6 text-xs font-serif font-bold uppercase tracking-widest text-[hsl(var(--primary))]">Attributes</h2><div className="space-y-5"><DetailRow label="Threat Level (Severity)"><SeverityBadge severity={bug.severity} /></DetailRow><DetailRow label="Urgency (Priority)"><PriorityPill priority={bug.priority} /></DetailRow><DetailRow label="Summoned (Assignee)"><div className="flex items-center gap-3"><Avatar user={assignee} /> <span className="text-sm font-serif font-bold">{assignee?.name ?? 'No Summon Sign'}</span></div></DetailRow><DetailRow label="Discoverer (Reporter)"><div className="flex items-center gap-3"><Avatar user={reporter} /> <span className="text-sm font-serif font-bold">{reporter?.name}</span></div></DetailRow><div className="my-4 h-px bg-[hsl(var(--border)/.5)]" /><DetailRow label="Runes Yielded (Points)"><span className="inline-flex items-center justify-center border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.1)] px-3 py-1.5 font-mono text-[11px] font-bold text-[hsl(var(--primary))] shadow-sm">{bug.storyPoints ? `${bug.storyPoints} Runes` : 'None'}</span></DetailRow><DetailRow label="Fated Day (Due Date)"><span className="text-[12px] font-serif font-bold">{bug.dueDate ? compactDate(bug.dueDate) : 'Undated'}</span></DetailRow><DetailRow label="Realm (Environment)"><span className="flex items-center gap-2 text-[12px] font-serif font-bold"><Castle size={14} className="text-[hsl(var(--primary))]"/>{bug.environment || 'Unknown'}</span></DetailRow><DetailRow label="Manifestation (Repro)"><span className="text-[12px] font-serif font-bold">{bug.reproducibility || 'Not Tried'}</span></DetailRow><DetailRow label="Sigils (Tags)"><div className="flex flex-wrap gap-2 mt-2">{(bug.tags||[]).length===0?<span className="text-[11px] font-serif font-bold text-[hsl(var(--muted-foreground))]">None</span>:(bug.tags||[]).map(t=><span key={t} className="border border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--primary))] shadow-sm">{t}</span>)}</div></DetailRow></div></div>
        
        {/* VISUAL DEPENDENCY TREE */}
        <div className="border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6"><h2 className="text-xs font-serif font-bold uppercase tracking-widest text-[hsl(var(--primary))]">The Golden Lineage <span className="font-sans normal-case tracking-normal opacity-70 text-[9px]">(Graph)</span></h2><button onClick={() => setShowRelation(!showRelation)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"><Plus size={16} /></button></div>
          <div className="flex flex-col items-center gap-1.5">
            {dependencies.map(b => (
              <div key={`dep-${b.id}`} className="flex flex-col items-center w-full">
                <Link href={`/bugs/${b.id}`} className="w-full border border-[hsl(var(--destructive)/.5)] bg-[hsl(var(--destructive)/.1)] px-4 py-3 text-center text-[11px] font-serif font-bold uppercase tracking-widest text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.2)] transition-all shadow-sm"><ShieldAlert size={14} className="inline mr-2 mb-0.5"/> Blocks this: {b.key}</Link>
                <div className="h-6 w-px bg-gradient-to-b from-[hsl(var(--destructive))] to-[hsl(var(--primary))] my-1"></div>
              </div>
            ))}
            <div className="w-full border border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.15)] px-4 py-3.5 text-center text-[12px] font-serif font-bold uppercase tracking-widest text-[hsl(var(--primary))] shadow-[0_0_15px_rgba(197,168,101,0.2)]"><Skull size={16} className="inline mr-2 mb-0.5"/>{bug.key} (Current)</div>
            {blockers.map(b => (
              <div key={`blk-${b.id}`} className="flex flex-col items-center w-full">
                <div className="h-6 w-px bg-gradient-to-t from-[hsl(var(--accent))] to-[hsl(var(--primary))] my-1"></div>
                <Link href={`/bugs/${b.id}`} className="w-full border border-[hsl(var(--accent)/.5)] bg-[hsl(var(--accent)/.1)] px-4 py-3 text-center text-[11px] font-serif font-bold uppercase tracking-widest text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/.2)] transition-all shadow-sm"><AlertCircle size={14} className="inline mr-2 mb-0.5"/> Blocked by this: {b.key}</Link>
              </div>
            ))}
            {dependencies.length === 0 && blockers.length === 0 && !showRelation && <p className="text-[11px] font-serif font-bold text-[hsl(var(--muted-foreground))] text-center mt-3">No lineage linked.</p>}
          </div>
          {showRelation && <RelationshipForm bug={bug} onDone={() => setShowRelation(false)} />}
        </div>
        
        {/* ATTACHMENT VIEWER */}
        <div className="border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-6 shadow-sm"><div className="flex items-center justify-between mb-5"><h2 className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-widest text-[hsl(var(--primary))]"><Eye size={16} /> Visions <span className="font-sans normal-case tracking-normal opacity-70 text-[9px]">(Media)</span></h2><label className="cursor-pointer p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"><Plus size={16} /><input type="file" onChange={addAttachment} className="hidden" /></label></div>{(!bug.attachments || bug.attachments.length === 0) ? <p className="mt-2 text-[11px] font-serif leading-5 text-[hsl(var(--muted-foreground))] font-bold">No visions recorded.</p> : <div className="mt-4 grid grid-cols-2 gap-3">{bug.attachments.map((item) => <a key={item.id} href={item.fileUrl} target="_blank" rel="noreferrer" className="group relative block aspect-square overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--muted))] shadow-sm transition-transform hover:border-[hsl(var(--primary))]">{item.fileUrl.startsWith('data:image') ? <img src={item.fileUrl} alt="attachment" className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /> : <div className="flex h-full items-center justify-center"><FileText size={28} className="text-[hsl(var(--primary))]" /></div>}<div className="absolute inset-x-0 bottom-0 bg-black/80 pt-6 pb-3 px-3 opacity-0 transition-opacity group-hover:opacity-100"><p className="truncate text-[10px] font-serif font-bold tracking-widest text-[hsl(var(--primary))]">{item.fileName}</p></div></a>)}</div>}</div>
        
        <div className="border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-6 shadow-sm"><h2 className="mb-6 flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-widest text-[hsl(var(--primary))]"><Clock3 size={16} /> Annals of Time <span className="font-sans normal-case tracking-normal opacity-70 text-[9px]">(History)</span></h2>{(!bug.history || bug.history.length === 0) ? <p className="text-[11px] font-serif font-bold text-[hsl(var(--muted-foreground))]">No history recorded.</p> : <div className="space-y-5">{bug.history.slice(0, 5).map((entry) => <div key={entry.id} className="relative pl-6 text-[12px] font-serif before:absolute before:left-0 before:top-1.5 before:h-2 before:w-2 before:rotate-45 before:bg-[hsl(var(--primary))] before:shadow-[0_0_8px_hsl(var(--primary))]"><p className="font-bold text-[hsl(var(--foreground))]">{entry.fieldChanged} <span className="font-normal text-[hsl(var(--muted-foreground))]">altered</span></p><p className="mt-1 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{entry.oldValue || 'void'} → {entry.newValue}</p></div>)}</div>}</div>
      </aside>
    </div>
    {toast && <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 border border-[hsl(var(--primary))] bg-black px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-widest text-[hsl(var(--primary))] shadow-[0_0_30px_rgba(197,168,101,0.3)]"><Check size={16} className="text-[hsl(var(--primary))]" />{toast}</div>}
  </div>;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) { return <div><p className="mb-2 font-serif text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{label}</p>{children}</div>; }

function EditPanel({ bug, onSave }: { bug: Bug; onSave: (patch: Partial<Bug>) => void }) {
  const { store } = useWorkspace();
  const [title, setTitle] = useState(bug.title); const [description, setDescription] = useState(bug.description); const [severity, setSeverity] = useState(bug.severity); const [priority, setPriority] = useState(bug.priority); const [assigneeId, setAssigneeId] = useState(bug.assigneeId);
  const submitAction = () => { onSave({ title: title.trim() || bug.title, description: description.trim() || bug.description, severity, priority, assigneeId }); };
  return <div className="mb-8 border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.05)] p-6 shadow-sm"><div className="mb-6 flex items-center gap-3"><Settings2 size={18} className="text-[hsl(var(--primary))]" /><h2 className="text-sm font-serif font-bold uppercase tracking-widest text-[hsl(var(--primary))]">Amend Records <span className="font-sans normal-case tracking-normal opacity-70 text-[9px]">(Edit)</span></h2></div><div className="space-y-5"><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm font-serif font-bold outline-none focus:border-[hsl(var(--primary))] text-[hsl(var(--foreground))]" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full resize-none border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm font-serif outline-none focus:border-[hsl(var(--primary))] text-[hsl(var(--foreground))]" /><div className="grid grid-cols-3 gap-4"><select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} className="border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-xs font-serif font-bold outline-none">{Object.keys(severityMeta).map((v) => <option key={v}>{v}</option>)}</select><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-xs font-serif font-bold outline-none">{['P0', 'P1', 'P2', 'P3'].map((v) => <option key={v}>{v}</option>)}</select><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-xs font-serif font-bold outline-none"><option value="">No summon</option>{(store.users || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div></div><div className="mt-6 flex justify-end"><button onClick={submitAction} className="bg-[hsl(var(--primary))] px-6 py-2.5 text-xs font-serif font-bold uppercase tracking-widest text-black shadow-md hover:brightness-125 transition-all">Seal Edits <span className="font-sans normal-case tracking-normal opacity-70">(Save)</span></button></div></div>;
}

function RelationshipForm({ bug, onDone }: { bug: Bug; onDone: () => void }) {
  const { store, updateStore } = useWorkspace();
  const candidates = (store.bugs||[]).filter((item) => item.workspaceId === bug.workspaceId && item.id !== bug.id);
  const [target, setTarget] = useState(candidates[0]?.id ?? ''); const [kind, setKind] = useState<'dependsOn' | 'duplicateOf'>('dependsOn');
  const submitAction = () => { updateStore((current) => ({ ...current, bugs: current.bugs.map((item) => item.id === bug.id ? { ...item, dependsOn: kind === 'dependsOn' ? [...(item.dependsOn||[]), target] : item.dependsOn, duplicateOf: kind === 'duplicateOf' ? target : item.duplicateOf, updatedAt: now() } : item) })); onDone(); };
  return <div className="mt-5 border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5"><select value={kind} onChange={(e) => setKind(e.target.value as 'dependsOn' | 'duplicateOf')} className="mb-3 block w-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2.5 text-[11px] font-serif font-bold uppercase tracking-widest outline-none"><option value="dependsOn">Blocks this</option><option value="duplicateOf">Duplicate of</option></select><select value={target} onChange={(e) => setTarget(e.target.value)} className="block w-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2.5 text-[11px] font-serif font-bold uppercase tracking-widest outline-none">{candidates.map((item) => <option key={item.id} value={item.id}>{item.key} · {item.title}</option>)}</select><div className="mt-4 flex justify-end gap-3"><button onClick={onDone} className="px-4 py-2 text-[10px] font-serif font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Flee</button><button onClick={submitAction} className="bg-[hsl(var(--primary))] px-5 py-2 text-[10px] font-serif font-bold uppercase tracking-widest text-black shadow-sm hover:brightness-125">Forge Link</button></div></div>;
}

function DashboardPage() {
  const { store } = useWorkspace();
  const currentWs = store.workspaces.find((ws) => ws.id === store.currentWorkspaceId) || store.workspaces[0];
  const workspaceBugs = (store.bugs || []).filter((b) => b.workspaceId === currentWs?.id);
  const open = workspaceBugs.filter((bug) => bug.stage !== 'Closed');
  const maxStage = Math.max(...stages.map((stage) => workspaceBugs.filter((bug) => bug.stage === stage).length), 1);
  const avgAge = open.length ? Math.round(open.reduce((sum, bug) => sum + (Date.now() - new Date(bug.createdAt).getTime()) / 86400000, 0) / open.length) : 0;

  return <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-10 lg:px-12 relative z-10"><SectionHeader eyebrow={`Records of ${currentWs?.name ?? ''}`} title="Runes & Records" description="Behold the state of the Golden Order. Seek the imbalances and cleanse them." action={<button onClick={() => window.location.reload()} className="flex items-center gap-2 border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md px-5 py-2.5 text-xs font-serif font-bold uppercase tracking-widest shadow-sm hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors"><RefreshCw size={14}/> Divining <span className="font-sans text-[9px] tracking-normal normal-case opacity-70">(Refresh)</span></button>} />
    <div className="grid gap-6 md:grid-cols-[1.25fr_.75fr]"><div className="border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-8 shadow-sm"><h2 className="mb-8 text-base font-serif font-bold tracking-wide uppercase text-[hsl(var(--primary))] erdtree-text">State of the Realm</h2><div className="space-y-6">{stages.map((stage) => { const count = workspaceBugs.filter((bug) => bug.stage === stage).length; const meta = stageMeta[stage]; return <div key={stage}><div className="mb-2.5 flex justify-between text-[12px]"><span className="flex items-center gap-3 font-serif font-bold uppercase tracking-wider text-[hsl(var(--foreground))]"><span className="h-3 w-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ background: meta.tint, color: meta.tint }} />{meta.label}</span><span className="font-serif font-bold text-[hsl(var(--muted-foreground))]">{count} Foes</span></div><div className="h-3 overflow-hidden bg-[hsl(var(--background)/.5)] border border-[hsl(var(--border)/.5)]"><div className="h-full transition-all duration-1000 ease-out" style={{ width: `${(count / maxStage) * 100}%`, background: meta.tint }} /></div></div>; })}</div></div><div className="border border-[hsl(var(--primary)/.5)] bg-black/80 backdrop-blur-xl p-10 shadow-[0_0_40px_rgba(197,168,101,0.15)] relative overflow-hidden"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[hsl(var(--primary)/.1)] rounded-full blur-[60px] pointer-events-none"></div><p className="relative z-10 font-serif text-[11px] font-bold uppercase tracking-[0.3em] text-[hsl(var(--primary))]">Impending Doom</p><p className="relative z-10 mt-6 text-8xl font-serif font-bold tracking-tighter text-[hsl(var(--foreground))] drop-shadow-md">{open.filter((bug) => bug.priority === 'P0' || bug.stage === 'Blocked').length}</p><p className="relative z-10 mt-4 text-sm font-serif font-bold tracking-widest uppercase text-[hsl(var(--destructive))]">Critical Threats</p><p className="relative z-10 mt-10 border-t border-[hsl(var(--border))] pt-6 text-[13px] font-serif leading-relaxed text-[hsl(var(--muted-foreground))]">These foes pose an immediate threat to the Erdtree. They carry the mark of Destined Death or block the path of other champions.</p></div></div>
    <div className="mt-6 grid gap-6 sm:grid-cols-3">
      <div className="border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-8 shadow-sm"><div className="flex items-center justify-between"><p className="text-[11px] font-serif font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Age of Conflict</p><Clock3 size={20} className="text-[hsl(var(--primary))]" /></div><p className="mt-5 font-serif text-5xl font-bold tracking-tight text-[hsl(var(--foreground))]">{avgAge} <span className="text-xl text-[hsl(var(--muted-foreground))]">Days</span></p><p className="mt-3 text-[11px] font-serif italic text-[hsl(var(--muted-foreground))]">average time foes roam unchecked</p></div>
      <div className="border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-8 shadow-sm"><div className="flex items-center justify-between"><p className="text-[11px] font-serif font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Victories (Monthly)</p><Crown size={20} className="text-[hsl(var(--primary))]" /></div><p className="mt-5 font-serif text-5xl font-bold tracking-tight text-[hsl(var(--foreground))]">{workspaceBugs.filter((bug) => bug.stage === 'Closed').length}</p><p className="mt-3 text-[11px] font-serif italic text-[hsl(var(--muted-foreground))]">foes felled and recorded</p></div>
      <div className="border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-8 shadow-sm"><div className="flex items-center justify-between"><p className="text-[11px] font-serif font-bold uppercase tracking-widest text-[hsl(var(--destructive))]">Demigods & Great Foes</p><Skull size={20} className="text-[hsl(var(--destructive))]" /></div><p className="mt-5 font-serif text-5xl font-bold tracking-tight text-[hsl(var(--foreground))]">{workspaceBugs.filter((bug) => bug.severity === 'Critical' || bug.severity === 'Major').length}</p><p className="mt-3 text-[11px] font-serif italic text-[hsl(var(--muted-foreground))]">high threat targets active</p></div>
    </div>
  </div>;
}

function SavedPage() {
  return <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-10 lg:px-12 relative z-10"><SectionHeader eyebrow="Graces Discovered" title="Sites of Grace" description="Fast travel to the specific slices of the realm you monitor most often." /><EmptyState title="No Graces Discovered Yet" description="The map remains shrouded in fog. Seek out the monoliths to save your views." /></div>;
}

function HowItWorksPage() {
  const model = [{ number: 'I', title: 'The Path is Absolute', body: 'Discovered, In Battle, Cursed, Roundtable, Communing, and Felled describe the foe’s current position. Curses (blockers) are stages of war, not side notes.', color: '#8a1a1a' }, { number: 'II', title: 'Resolution is History', body: 'A resolution only manifests after a foe is Felled. "Works as Intended" or "Not Reproducible" are the tales told to the Two Fingers.', color: '#c5a865' }, { number: 'III', title: 'Threat vs Urgency', body: 'Threat (Severity) describes the danger to the Golden Order. Urgency (Priority) dictates when you shall strike. A minor rat can be urgent if it blocks a door.', color: '#4a6583' }];
  return <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-10 lg:px-12 relative z-10"><SectionHeader eyebrow="Wisdom of the Two Fingers" title="Tarnished Guide" description="Heed these words, for the realm is unforgiving and the systems strict." action={<Link href="/" className="flex items-center gap-2 border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md px-5 py-2.5 text-xs font-serif font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors"><ArrowLeft size={14} /> Return to Map <span className="font-sans normal-case tracking-normal opacity-70 text-[9px]">(Back)</span></Link>} /><div className="mt-10 grid gap-6 md:grid-cols-3">{model.map((item) => <article key={item.number} className="border border-[hsl(var(--border)/.5)] bg-[hsl(var(--card)/.6)] backdrop-blur-md p-8 shadow-sm hover:border-[hsl(var(--primary)/.5)] transition-colors"><div className="flex justify-between items-center"><span className="font-serif text-2xl font-bold" style={{ color: item.color }}>{item.number}</span><span className="h-3 w-3 rotate-45 border" style={{ background: item.color, borderColor: item.color, boxShadow: `0 0 10px ${item.color}` }} /></div><h3 className="mt-8 font-serif text-xl font-bold tracking-wide text-[hsl(var(--foreground))]">{item.title}</h3><p className="mt-4 font-serif text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">{item.body}</p></article>)}</div></div>;
}

function KanbanBoard({ bugs, onMove }: { bugs: Bug[]; onMove: (bugId: string, newStage: Stage) => void }) {
  const { store } = useWorkspace();
  const [, setLocation] = useLocation();

  return (
    <div className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto pb-10 pt-2 scrollbar-thin relative z-10">
      {stages.map((stage) => {
        const stageBugs = bugs.filter((b) => b.stage === stage);
        const meta = stageMeta[stage];
        return (
          <div key={stage} className="flex w-[320px] shrink-0 snap-center flex-col border border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.6)] backdrop-blur-md p-3 shadow-sm" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const bugId = e.dataTransfer.getData('text/plain'); if (bugId) onMove(bugId, stage); }}>
            <div className="mb-4 flex items-center justify-between px-2 pt-2 border-b border-[hsl(var(--border)/.5)] pb-3"><div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ background: meta.tint, color: meta.tint }} /><span className="font-serif text-[13px] font-bold uppercase tracking-widest text-[hsl(var(--foreground))]">{meta.label}</span></div><span className="font-serif text-[14px] font-bold text-[hsl(var(--muted-foreground))]">{stageBugs.length}</span></div>
            <div className="flex flex-col gap-3">
              {stageBugs.map((bug) => {
                const assignee = (store.users || []).find((u) => u.id === bug.assigneeId);
                return (
                  <div key={bug.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', bug.id)} onClick={() => setLocation(`/bugs/${bug.id}`)} className="group cursor-grab border border-[hsl(var(--border))] bg-[hsl(var(--card)/.9)] backdrop-blur-md p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[hsl(var(--primary))] hover:shadow-[0_5px_20px_rgba(197,168,101,0.1)] active:cursor-grabbing relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ background: severityMeta[bug.severity].tint }}></div>
                    <div className="mb-3 flex justify-between gap-3 items-start"><span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">{bug.key}</span><Avatar user={assignee} /></div>
                    <p className="font-serif text-[15px] font-bold leading-snug tracking-wide text-[hsl(var(--foreground))] mb-4">{bug.title}</p>
                    <div className="flex flex-wrap gap-2 overflow-hidden mb-4">{(bug.tags || []).slice(0,3).map(t => <span key={t} className="truncate border border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{t}</span>)}</div>
                    <div className="flex items-center justify-between border-t border-[hsl(var(--border)/.5)] pt-3"><SeverityBadge severity={bug.severity} /><PriorityPill priority={bug.priority} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Router() {
  return <Switch><Route path="/" component={WorkspacePage} /><Route path="/bugs/:id" component={BugDetailPage} /><Route path="/dashboard" component={DashboardPage} /><Route path="/saved" component={SavedPage} /><Route path="/how-it-works" component={HowItWorksPage} /><Route component={NotFound} /></Switch>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

const queryClient = new QueryClient();
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppProvider><WorkspaceShell><RoutedErrorBoundary><Router /></RoutedErrorBoundary></WorkspaceShell></AppProvider></WouterRouter></TooltipProvider></QueryClientProvider>;
}

export default App;