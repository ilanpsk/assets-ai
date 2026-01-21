import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { 
  X, Send, Loader2, Minimize2, Maximize2, Bot, Trash2, 
  Paperclip, Upload, FileText, GripVertical, Zap, 
  Cpu, Database, CheckCircle2, Clock
} from 'lucide-react';
import { sendMessage } from '@/api/ai';
import { uploadImportFile } from '@/api/imports';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: { name: string; size?: number }[];
}

interface ThinkingStep {
  id: number;
  label: string;
  status: 'pending' | 'active' | 'complete';
  icon: React.ReactNode;
}

const MIN_WIDTH = 400;
const MIN_HEIGHT = 450;
const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 680;

export default function AIChat() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canAttach = user?.roles?.includes('admin') || user?.roles?.includes('it');
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('nexus_ai_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
    return [{
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your **Nexus AI Assistant**. I can help you manage assets, run reports, answer questions, and more. How can I assist you today?',
      timestamp: new Date(),
    }];
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  
  // Draggable window state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const windowStartPos = useRef({ x: 0, y: 0 });
  
  // Resizable window state
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const sizeStart = useRef({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your **Nexus AI Assistant**. I can help you manage assets, run reports, answer questions, and more. How can I assist you today?',
      timestamp: new Date(),
    }]);
    setConversationId(undefined);
    setLastJobId(null);
  };

  // Reset position when chat is opened
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Snap to corner when minimized
  useEffect(() => {
    if (isMinimized) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isMinimized]);

  useEffect(() => {
    localStorage.setItem('nexus_ai_chat_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages, isOpen]);

  // Dragging logic - only when not minimized
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMinimized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDraggingWindow(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    windowStartPos.current = { x: position.x, y: position.y };
    e.preventDefault();
  }, [position, isMinimized]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingWindow) {
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;
      setPosition({
        x: windowStartPos.current.x + deltaX,
        y: windowStartPos.current.y + deltaY
      });
    }
    if (isResizing) {
      // Resize from top-left corner (since window is positioned from bottom-right)
      const deltaX = resizeStartPos.current.x - e.clientX;
      const deltaY = resizeStartPos.current.y - e.clientY;
      const newWidth = Math.max(MIN_WIDTH, sizeStart.current.width + deltaX);
      const newHeight = Math.max(MIN_HEIGHT, sizeStart.current.height + deltaY);
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDraggingWindow, isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingWindow(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDraggingWindow || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingWindow, isResizing, handleMouseMove, handleMouseUp]);

  // Resize handle mouse down
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    sizeStart.current = { width: size.width, height: size.height };
  }, [size]);

  const handleFileSelect = (file: File) => {
    setAttachedFile(file);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const result = await uploadImportFile(file);
      return result.job_id;
    } catch (error) {
      console.error("Upload failed", error);
      throw error;
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const simulateThinking = () => {
    const steps: ThinkingStep[] = [
      { id: 1, label: 'Understanding request', status: 'active', icon: <Zap className="h-3 w-3" /> },
      { id: 2, label: 'Querying knowledge', status: 'pending', icon: <Database className="h-3 w-3" /> },
      { id: 3, label: 'Processing data', status: 'pending', icon: <Cpu className="h-3 w-3" /> },
      { id: 4, label: 'Formulating response', status: 'pending', icon: <CheckCircle2 className="h-3 w-3" /> },
    ];
    setThinkingSteps(steps);

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps.length) {
        clearInterval(interval);
        return;
      }
      setThinkingSteps(prev => prev.map((step, idx) => ({
        ...step,
        status: idx < currentStep ? 'complete' : idx === currentStep ? 'active' : 'pending'
      })));
    }, 800);

    return () => clearInterval(interval);
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !attachedFile) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      attachments: attachedFile ? [{ name: attachedFile.name, size: attachedFile.size }] : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setAttachedFile(null);
    setIsLoading(true);
    
    const cleanup = simulateThinking();

    try {
      let contextMessage = userMsg.content;
      
      if (attachedFile) {
        try {
          const jobId = await handleFileUpload(attachedFile);
          setLastJobId(jobId);
          contextMessage = `I have uploaded a file named "${attachedFile.name}" (Job ID: ${jobId}). ${inputValue}`;
        } catch (e) {
          const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Sorry, failed to upload the attached file. Please try again.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          setIsLoading(false);
          setThinkingSteps([]);
          return;
        }
      } else if (lastJobId) {
        contextMessage = `${inputValue}\n\n[System Context: Active Job ID: ${lastJobId}]`;
      }

      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await sendMessage(contextMessage, conversationId, history);
      setConversationId(response.conversation_id);
      
      if (response.refresh_needed) {
        queryClient.invalidateQueries({ queryKey: ['assets'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['asset-sets'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: any) {
      let errorMessage = 'Sorry, I encountered an error processing your request.';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'object' && detail.message) {
          errorMessage = detail.message;
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      cleanup?.();
      setIsLoading(false);
      setThinkingSteps([]);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-2xl shadow-2xl bg-gradient-to-br from-cyan-500 via-cyan-600 to-teal-600 hover:from-cyan-400 hover:via-cyan-500 hover:to-teal-500 border border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/30 z-50 group"
        onClick={() => setIsOpen(true)}
      >
        <div className="relative">
          <Bot className="h-7 w-7 text-white" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-400 rounded-full border-2 border-cyan-600 animate-pulse" />
        </div>
      </Button>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: isMinimized ? '288px' : `${size.width}px`,
        height: isMinimized ? '56px' : `${size.height}px`,
        maxHeight: isMinimized ? '56px' : '90vh',
      }}
      className={cn(
        "fixed right-6 bottom-6 z-50 transition-all",
        (isDraggingWindow || isResizing) ? "transition-none" : "duration-300",
        isDraggingWindow && "cursor-grabbing"
      )}
    >
      <Card 
        className={cn(
          "h-full flex flex-col border-0 shadow-2xl overflow-hidden bg-gradient-to-b from-background to-background/95 dark:from-zinc-900 dark:to-zinc-950 rounded-2xl relative",
          !isMinimized && "ring-1 ring-border/50 dark:ring-white/10",
          isDragging && "ring-2 ring-cyan-500 bg-cyan-500/5"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Resize handle - top left corner */}
        {!isMinimized && (
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50 group"
            onMouseDown={handleResizeMouseDown}
          >
            <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-muted-foreground/30 group-hover:border-cyan-500 transition-colors rounded-tl" />
          </div>
        )}

        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-2xl">
            <div className="flex flex-col items-center animate-bounce">
              <Upload className="h-12 w-12 text-cyan-500 mb-3" />
              <p className="text-lg font-semibold text-cyan-500">Drop file to upload</p>
            </div>
          </div>
        )}

        {/* Header - Draggable Area */}
        <div 
          className={cn(
            "flex flex-row items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-600 via-cyan-700 to-teal-700 dark:from-cyan-700 dark:via-cyan-800 dark:to-teal-800 select-none",
            !isMinimized && "cursor-grab",
            isDraggingWindow && "cursor-grabbing"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-3">
            {!isMinimized && <GripVertical className="h-4 w-4 text-white/40 hidden sm:block" />}
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/10">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">Nexus AI</h3>
                <span className="px-1.5 py-0.5 bg-white/15 rounded text-[9px] font-semibold text-cyan-100 uppercase tracking-wider">Beta</span>
              </div>
              {!isMinimized && <p className="text-[11px] text-cyan-100/80 font-medium">Asset Intelligence Assistant</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isMinimized && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                onClick={handleClear}
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setPosition({ x: 0, y: 0 });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {!isMinimized && (
          <>
            {/* Messages Area */}
            <CardContent className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex w-full animate-in slide-in-from-bottom-3 duration-300",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Message Content - No avatars */}
                  <div className={cn(
                    "flex flex-col gap-1 max-w-[85%]",
                    msg.role === 'user' && "items-end"
                  )}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm shadow-sm",
                        msg.role === 'user'
                          ? "bg-cyan-600 text-white rounded-br-md"
                          : "bg-muted/60 text-foreground rounded-bl-md border border-border/50"
                      )}
                    >
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2.5 space-y-1.5">
                          {msg.attachments.map((att, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-black/10 dark:bg-white/10 rounded-lg px-3 py-2 text-xs">
                              <FileText className="h-4 w-4 opacity-70" />
                              <span className="font-medium truncate max-w-[180px]">{att.name}</span>
                              {att.size && <span className="opacity-60">({(att.size / 1024).toFixed(1)} KB)</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({children}) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({children}) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-1">{children}</ol>,
                          li: ({children}) => <li className="leading-relaxed">{children}</li>,
                          a: ({children, href}) => <a href={href} className={cn(msg.role === 'user' ? 'text-cyan-200 hover:text-white underline' : 'text-cyan-600 hover:text-cyan-700 underline')} target="_blank" rel="noopener noreferrer">{children}</a>,
                          code: ({children, className}) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                            ) : (
                              <code className="block bg-black/10 dark:bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2">{children}</code>
                            );
                          },
                          strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                          h1: ({children}) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-bold mb-1.5 mt-2 first:mt-0">{children}</h3>,
                          table: ({children}) => <div className="overflow-x-auto my-2"><table className="min-w-full text-xs border-collapse">{children}</table></div>,
                          th: ({children}) => <th className="border border-border/50 px-2 py-1 bg-muted/50 font-semibold text-left">{children}</th>,
                          td: ({children}) => <td className="border border-border/50 px-2 py-1">{children}</td>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {/* Timestamp */}
                    <div className={cn(
                      "flex items-center gap-1 text-[10px] text-muted-foreground px-1",
                      msg.role === 'user' && "justify-end"
                    )}>
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Thinking State */}
              {isLoading && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="max-w-[85%]">
                    <div className="bg-muted/60 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                        <span className="text-sm font-medium text-foreground">Thinking...</span>
                      </div>
                      <div className="space-y-2">
                        {thinkingSteps.map((step) => (
                          <div 
                            key={step.id}
                            className={cn(
                              "flex items-center gap-2 text-xs transition-all duration-300",
                              step.status === 'pending' && "text-muted-foreground/50",
                              step.status === 'active' && "text-cyan-500",
                              step.status === 'complete' && "text-green-500"
                            )}
                          >
                            <div className={cn(
                              "h-5 w-5 rounded flex items-center justify-center transition-colors",
                              step.status === 'pending' && "bg-muted/50",
                              step.status === 'active' && "bg-cyan-500/20",
                              step.status === 'complete' && "bg-green-500/20"
                            )}>
                              {step.status === 'complete' ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : step.status === 'active' ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                step.icon
                              )}
                            </div>
                            <span className={cn(
                              step.status === 'active' && "font-medium"
                            )}>{step.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input Area */}
            <CardFooter className="p-4 bg-muted/20 border-t border-border/50 flex flex-col gap-2">
              {attachedFile && (
                <div className="w-full flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-cyan-500" />
                    <span className="truncate max-w-[280px] font-medium text-foreground">{attachedFile.name}</span>
                    <span className="text-xs text-muted-foreground">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-cyan-500/20 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => setAttachedFile(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv,.xlsx,.xls,.json"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              
              <form
                className="w-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <div className="relative flex items-end bg-background border border-border rounded-xl focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
                  {/* Text input */}
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={attachedFile ? "Add a message about this file..." : "Ask me anything about your assets..."}
                    className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-sm py-3 pl-4 pr-2 min-h-[44px] max-h-[120px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                  />
                  
                  {/* Action buttons on the right */}
                  <div className="flex items-center gap-1 pr-2 pb-2">
                    {canAttach && (
                      <button
                        type="button"
                        className="p-2 text-muted-foreground hover:text-cyan-500 hover:bg-cyan-500/10 rounded-lg transition-colors disabled:opacity-50"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach file"
                        disabled={isLoading}
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                    )}
                    <button 
                      type="submit" 
                      disabled={isLoading || (!inputValue.trim() && !attachedFile)}
                      className="p-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:bg-muted disabled:text-muted-foreground transition-colors"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </form>
              
              <p className="text-[10px] text-muted-foreground/60 text-center">
                <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Shift+Enter</kbd> new line
              </p>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
