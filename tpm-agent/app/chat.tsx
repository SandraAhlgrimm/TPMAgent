'use client'

import { useState, useEffect, useRef } from "react";
import { streamResponses } from "./lib/azure-openai";
import ReactMarkdown from 'react-markdown';
import { useToast } from './utils/toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatMessages');
      if (saved) {
        const parsedMessages = JSON.parse(saved);
        // Add IDs to messages that don't have them (backward compatibility)
        return parsedMessages.map((msg: any, index: number) => ({
          ...msg,
          id: msg.id || `legacy-${index}-${Date.now()}`
        }));
      }
    }
    return [];
  });
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);

  const clearChatHistory = async () => {
    setMessages([]);
    setError(null);
    localStorage.removeItem('chatMessages');
  };

  const handleSend = async () => {
    if (currentMessage.trim() && !isLoading) {
      const userMessage: Message = { 
        id: `user-${Date.now()}-${Math.random()}`,
        role: 'user', 
        content: currentMessage 
      };
      setMessages(prev => [...prev, userMessage]);
      setCurrentMessage("");
      setIsLoading(true);
      setError(null);

      try {
        // Add empty assistant message that will be filled as stream arrives
        const assistantMessage: Message = { 
          id: `assistant-${Date.now()}-${Math.random()}`,
          role: 'assistant', 
          content: '' 
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        let accumulatedContent = '';
        const stream = streamResponses([...messages, userMessage]);
        
        for await (const chunk of stream) {
          accumulatedContent += chunk;
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === 'assistant') {
              lastMessage.content = accumulatedContent; // Set the full content instead of appending
            }
            return newMessages;
          });
        }
      } catch (error) {
        console.error('Error getting AI response:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        setError(errorMessage);
        
        // Remove the empty assistant message and add error message
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1]?.role === 'assistant') {
            newMessages.pop();
          }
          return [...newMessages, { 
            id: `error-${Date.now()}-${Math.random()}`,
            role: 'assistant', 
            content: `Error: ${errorMessage}` 
          }];
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header with Clear Button */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">AI Chat</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearChatHistory}
            className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 text-sm">
          <strong>Error:</strong> {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Chat Log */}
      <div ref={chatLogRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>Start a conversation by typing a message below.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`p-3 rounded-lg shadow-sm max-w-2xl ${
              message.role === 'user' 
                ? 'bg-blue-100 dark:bg-blue-900 ml-auto' 
                : 'bg-white dark:bg-gray-800'
            }`}>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 capitalize">
                {message.role === 'assistant' ? 'AI' : 'You'}
              </div>
              <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200 dark:prose-invert">
                <ReactMarkdown
                  components={{
                    // Customize code blocks
                    code: ({ className, children, ...props }) => {
                      const isInline = !className || !className.includes('language-');
                      return isInline ? (
                        <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      ) : (
                        <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      );
                    },
                    // Customize links
                    a: ({ href, children }) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {children}
                      </a>
                    ),
                    // Customize paragraphs to preserve spacing
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">{children}</p>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm max-w-2xl">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              AI
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <textarea
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 resize-none p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white min-h-[44px] max-h-[120px] overflow-y-auto"
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
