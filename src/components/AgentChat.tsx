import { useState, useEffect, useRef, useCallback } from "react";
import { createChat, sendMessage, pollMessages, closeChat, type A2HMessage, type A2HChatSession } from "../lib/a2h";

interface AgentChatProps {
  agentId: string;
  onClose?: () => void;
}

// Generate a temp ID for optimistic messages
let tempIdCounter = 0;
function genTempId(): string {
  return `temp-${Date.now()}-${++tempIdCounter}`;
}

interface TempMessage extends A2HMessage {
  _tempId?: string;
}

export function AgentChat({ agentId, onClose }: AgentChatProps) {
  const [chatSession, setChatSession] = useState<A2HChatSession | null>(null);
  const [messages, setMessages] = useState<TempMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatIdRef = useRef<string | null>(null);
  const sinceRef = useRef<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatIdForCleanup = useRef<string | null>(null);

  // Poll for new messages using recursive setTimeout (no stacking)
  const pollOnce = useCallback(async () => {
    const chatId = chatIdRef.current;
    if (!chatId) return;

    try {
      const newMessages = await pollMessages(chatId, sinceRef.current);
      for (const msg of newMessages) {
        if (msg.timestamp > sinceRef.current) {
          setMessages(prev => {
            // Dedup: remove optimistic temp message if server returns same content
            const existingTemp = prev.find(
              m => m._tempId && m.role === msg.role && m.content === msg.content
            );
            if (existingTemp) {
              return prev.filter(m => m !== existingTemp).concat(msg);
            }
            return [...prev, msg];
          });
          sinceRef.current = msg.timestamp;
        }
      }
      setIsPending(false);
    } catch (err) {
      console.error("Poll failed:", err);
      setIsPending(false);
    }

    // Schedule next poll only after this one completes
    pollTimerRef.current = setTimeout(pollOnce, 1000);
  }, []);

  // Initialize chat session on mount or agentId change
  useEffect(() => {
    let cancelled = false;

    // Close previous chat if agentId changed
    if (chatIdForCleanup.current) {
      closeChat(chatIdForCleanup.current).catch(() => {});
    }

    // Reset state for new agent
    setMessages([]);
    setIsPending(false);
    setIsInitializing(true);
    sinceRef.current = 0;
    chatIdRef.current = null;

    (async () => {
      try {
        const session = await createChat(agentId, "Lens chat");
        if (cancelled) return;
        setChatSession(session);
        chatIdRef.current = session.id;
        chatIdForCleanup.current = session.id;
        setIsInitializing(false);

        // Start polling
        pollOnce();
      } catch (err) {
        console.error("Failed to create chat:", err);
        if (!cancelled) setIsInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [agentId, pollOnce]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (chatIdForCleanup.current) {
        closeChat(chatIdForCleanup.current).catch(() => {});
      }
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (!chatIdRef.current || !input.trim() || isPending) return;

    const text = input.trim();
    setInput("");
    setIsPending(true);

    // Optimistically add human message with temp ID for dedup
    const tempId = genTempId();
    const humanMsg: TempMessage = {
      role: "human",
      content: text,
      timestamp: Date.now(),
      _tempId: tempId,
    };
    setMessages(prev => [...prev, humanMsg]);
    sinceRef.current = humanMsg.timestamp;

    try {
      await sendMessage(chatIdRef.current, text);
    } catch (err) {
      console.error("Failed to send message:", err);
      setIsPending(false);
    }
  }, [input, isPending]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-full text-dim font-mono text-xs">
        Initializing chat...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface font-mono text-xs">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {messages.map((msg, i) => (
          <div key={i} className="border-t border-border pt-1">
            <div className={`flex ${msg.role === "human" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-2 py-1 rounded-sm ${
                  msg.role === "human"
                    ? "bg-info text-bg"
                    : "bg-surface text-text"
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isPending && (
          <div className="border-t border-border pt-1">
            <div className="flex justify-start">
              <div className="px-2 py-1 text-dim animate-pulse">
                thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border p-2 flex gap-2">
        <textarea
          className="flex-1 bg-bg text-text border border-border rounded-sm px-2 py-1 resize-none focus:outline-none focus:border-info font-mono text-xs"
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Cmd+Enter to send)"
          disabled={isPending}
        />
        <button
          className="px-3 py-1 bg-info text-bg rounded-sm hover:bg-info/80 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-xs"
          onClick={handleSend}
          disabled={isPending || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
