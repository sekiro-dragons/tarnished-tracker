import { FormEvent, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Flame,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { getHelpReply } from '@/lib/help-assistant';

type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  href?: string;
  cta?: string;
};

const starterSuggestions = [
  'How do I create a bug?',
  'What does P0 mean?',
  'How do I use the board?',
  'How do I search?',
];

export function HelpAssistant() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const idRef = useRef(1);

  const initialMessage = useMemo<ChatMessage>(
    () => ({
      id: 0,
      role: 'assistant',
      text:
        'Greetings, Tarnished. I am the Guidance of Grace. Ask me how to use Tarnished Tracker.',
    }),
    [],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [suggestions, setSuggestions] =
    useState<string[]>(starterSuggestions);

  const ask = (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question) return;

    const reply = getHelpReply(question, location);

    const userId = idRef.current++;
    const assistantId = idRef.current++;

    setMessages((current) => [
      ...current,
      {
        id: userId,
        role: 'user',
        text: question,
      },
      {
        id: assistantId,
        role: 'assistant',
        text: reply.text,
        href: reply.href,
        cta: reply.cta,
      },
    ]);

    setSuggestions(reply.suggestions);
    setInput('');
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(input);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center border border-[hsl(var(--primary)/.6)] bg-black/90 text-[hsl(var(--primary))] shadow-[0_0_30px_rgba(197,168,101,0.25)] backdrop-blur-xl transition-all hover:scale-105 hover:bg-[hsl(var(--primary))] hover:text-black"
          aria-label="Open Guidance of Grace"
          title="Guidance of Grace"
        >
          <MessageCircle size={22} />
        </button>
      )}

      {open && (
        <section
          className="fixed bottom-4 right-4 z-[90] flex h-[min(620px,calc(100dvh-32px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden border border-[hsl(var(--primary)/.45)] bg-[hsl(var(--background)/.94)] shadow-[0_0_50px_rgba(197,168,101,0.18)] backdrop-blur-xl"
          aria-label="Guidance of Grace help assistant"
        >
          <header className="flex items-center gap-3 border-b border-[hsl(var(--border)/.6)] bg-black/30 px-4 py-4">
            <span className="flex h-9 w-9 items-center justify-center border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] shadow-[0_0_16px_rgba(197,168,101,0.18)]">
              <Flame size={18} />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-xl font-bold tracking-wide text-[hsl(var(--primary))]">
                Guidance of Grace
              </h2>
              <p className="text-[10px]  text-[hsl(var(--muted-foreground))]">
                Tarnished Tracker Guide
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
              aria-label="Close help assistant"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === 'user'
                    ? 'ml-10 border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.08)] p-3'
                    : 'mr-6 border border-[hsl(var(--border)/.55)] bg-black/20 p-3'
                }
              >
                <div className="mb-2 flex items-center gap-2">
                  {message.role === 'assistant' && (
                    <Sparkles
                      size={12}
                      className="text-[hsl(var(--primary))]"
                    />
                  )}
                  <span className="font-serif text-[14px] font-bold  text-[hsl(var(--muted-foreground))]">
                    {message.role === 'assistant'
                      ? 'Guidance'
                      : 'Tarnished'}
                  </span>
                </div>

                <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-[hsl(var(--foreground))]">
                  {message.text}
                </p>

                {message.role === 'assistant' &&
                  message.href &&
                  message.cta && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocation(message.href!);
                        setOpen(false);
                      }}
                      className="mt-3 flex items-center gap-2 text-[15px] font-serif font-bold  text-[hsl(var(--primary))] hover:brightness-125"
                    >
                      {message.cta}
                      <ArrowRight size={12} />
                    </button>
                  )}
              </div>
            ))}
          </div>

          <div className="border-t border-[hsl(var(--border)/.6)] bg-black/20 p-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {suggestions.slice(0, 3).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="shrink-0 border border-[hsl(var(--border)/.7)] bg-[hsl(var(--card)/.6)] px-3 py-1.5 text-[14px] font-serif font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.5)] hover:text-[hsl(var(--primary))]"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask how to use the realm..."
                className="min-w-0 flex-1 border border-[hsl(var(--border)/.7)] bg-black/30 px-3 py-2.5 text-lg font-serif text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground)/.55)] focus:border-[hsl(var(--primary)/.6)]"
              />

              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary))] hover:text-black disabled:opacity-40"
                aria-label="Send question"
              >
                <Send size={15} />
              </button>
            </form>

            <p className="mt-2 text-center text-[8px]  text-[hsl(var(--muted-foreground)/.65)]">
              Local help system · No external AI service
            </p>
          </div>
        </section>
      )}
    </>
  );
}
