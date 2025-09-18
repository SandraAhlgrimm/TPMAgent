'use client'

import { useState, useEffect, useRef } from "react";
import { streamResponses, updateRepositoryContext } from "@/lib/azure-openai";
import ReactMarkdown from 'react-markdown';
import { useToast } from './utils/toast';
import { useRepository } from './context/repository';
import { useO365Integration } from './hooks/useO365Integration';
import { logger } from '@/lib/logger';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const { showToast } = useToast();
  const { selectedRepository, lastUpdatedRepositoryId, markRepositoryContextUpdated } = useRepository();
  const { sendEmail, createPresentation, scheduleMeeting } = useO365Integration();
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatMessages');
      if (saved) {
        const parsedMessages = JSON.parse(saved) as Array<Partial<Message>>;
        return parsedMessages.map((msg, index: number) => ({
          ...msg,
          id: msg.id || `legacy-${index}-${Date.now()}`
        })) as Message[];
      }
    }
    return [];
  });
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponseId, setLastResponseId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastResponseId');
    }
    return null;
  });
  const [isUpdatingRepository, setIsUpdatingRepository] = useState(false);
  const chatLogRef = useRef<HTMLDivElement>(null);

  const clearChatHistory = async () => {
    setMessages([]);
    setError(null);
    setLastResponseId(null);
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('lastResponseId');
    // Reset repository context update tracking to force re-update when needed
    markRepositoryContextUpdated(null);
  };

  const handleSend = async () => {
    if (currentMessage.trim() && !isLoading) {
      const messageContent = currentMessage; // Store the message before clearing
      const userMessage: Message = { 
        id: `user-${Date.now()}-${Math.random()}`,
        role: 'user', 
        content: messageContent 
      };
      
      setCurrentMessage("");
      setIsLoading(true);
      setError(null);

      // Check for O365 commands first (using stored messageContent)
      const lowerMessage = messageContent.toLowerCase();
      
      // Handle email requests
      if ((lowerMessage.includes('send') && lowerMessage.includes('email')) || 
          lowerMessage.includes('send email')) {
        // Add user message for O365 commands
        setMessages(prev => [...prev, userMessage]);
        
        try {
          // Extract email address if provided, otherwise use default
          const emailMatch = messageContent.match(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/);
          const to = emailMatch ? [emailMatch[0]] : ['sakriema@microsoft.com'];
          
          let subject = 'Project Status Update from TPM Agent';
          let body = `
            <h1>Project Status Update</h1>
            <p>This email was sent via TPM Agent with O365 integration.</p>
            <h2>Key Updates</h2>
            <ul>
              <li>Repository analysis completed</li>
              <li>O365 integration functional</li>
              <li>AI-powered project management operational</li>
            </ul>
            <p>Best regards,<br>TPM Agent</p>
          `;

          // Try to extract subject from message
          const subjectMatch = messageContent.match(/subject[:\s]+"([^"]+)"/i);
          if (subjectMatch) {
            subject = subjectMatch[1];
          }

          const result = await sendEmail(to, subject, body);
          
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}-${Math.random()}`,
            role: 'assistant',
            content: result.success 
              ? `✅ **Email sent successfully!**\n\n**Recipients:** ${to.join(', ')}\n**Subject:** ${subject}\n\nThe email has been delivered with project status information.`
              : `❌ **Failed to send email.**\n\n**Error:** ${result.error}\n\nPlease check your O365 configuration and try again.`
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        } catch (error) {
          logger.error('Error handling email command:', error);
        }
      }
      
      // Handle presentation requests
      if (lowerMessage.includes('presentation') || lowerMessage.includes('powerpoint') || 
          (lowerMessage.includes('create') && lowerMessage.includes('slides'))) {
        // Add user message for O365 commands
        setMessages(prev => [...prev, userMessage]);
        
        try {
          const slides = [
            { 
              title: 'Project Status Update', 
              content: 'TPM Agent - High-Level Status for Stakeholders\nDate: ' + new Date().toLocaleDateString()
            },
            { 
              title: 'Project Overview', 
              content: 'Objectives:\n• Automate project management with AI\n• Integrate GitHub and O365 capabilities\n• Enhance team productivity\n\nScope:\n• Repository management\n• Task automation\n• Communication tools'
            },
            { 
              title: 'Current Progress', 
              content: 'Completed:\n✅ Repository setup\n✅ GitHub integration\n✅ O365 integration\n✅ AI capabilities\n\nIn Progress:\n🔄 Testing & refinement\n🔄 Documentation'
            },
            { 
              title: 'Key Metrics', 
              content: 'Implementation:\n• Components: 15+\n• API endpoints: 5\n• Integrations: GitHub, Azure OpenAI, O365\n\nCapabilities:\n• Email automation\n• Presentation generation\n• Meeting scheduling\n• Task management'
            },
            { 
              title: 'Risks & Mitigation', 
              content: 'Identified Risks:\n• API rate limits → Implement caching\n• Authentication complexity → Enhanced error handling\n• User adoption → Comprehensive documentation\n\nMitigation strategies in place for all identified risks.'
            },
            { 
              title: 'Next Steps', 
              content: 'Immediate priorities:\n1. Complete test suite implementation\n2. Enhance error handling\n3. User documentation\n4. Production deployment preparation\n\nTimeline: Q4 2025'
            }
          ];
          
          const result = await createPresentation('Project Status Update', slides);
          
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}-${Math.random()}`,
            role: 'assistant',
            content: result.success 
              ? `✅ **PowerPoint presentation created successfully!**\n\n**Title:** Project Status Update\n**Slides:** ${slides.length}\n\nThe presentation includes:\n• Project overview and objectives\n• Current progress and metrics\n• Risk assessment and mitigation\n• Next steps and timeline\n\nYou can find it in your OneDrive or SharePoint.`
              : `❌ **Failed to create presentation.**\n\n**Error:** ${result.error}\n\nPlease check your O365 configuration and try again.`
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        } catch (error) {
          logger.error('Error handling presentation command:', error);
        }
      }
      
      // Handle meeting requests
      if ((lowerMessage.includes('schedule') && lowerMessage.includes('meeting')) || 
          lowerMessage.includes('create meeting') || lowerMessage.includes('book meeting')) {
        // Add user message for O365 commands
        setMessages(prev => [...prev, userMessage]);
        
        try {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(14, 0, 0, 0);
          
          const endTime = new Date(tomorrow);
          endTime.setHours(15, 0, 0, 0);
          
          const result = await scheduleMeeting(
            'Sprint Planning Meeting - TPM Agent',
            tomorrow,
            endTime,
            ['team@microsoft.com'],
            'Agenda:\n1. Review sprint goals\n2. Task estimation and assignment\n3. Resource allocation\n4. Timeline review\n\nGenerated by TPM Agent'
          );
          
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}-${Math.random()}`,
            role: 'assistant',
            content: result.success 
              ? `✅ **Meeting scheduled successfully!**\n\n**Subject:** Sprint Planning Meeting - TPM Agent\n**Date:** ${tomorrow.toLocaleDateString()}\n**Time:** 2:00 PM - 3:00 PM\n**Attendees:** team@microsoft.com\n\nA Teams link has been included in the meeting invite.`
              : `❌ **Failed to schedule meeting.**\n\n**Error:** ${result.error}\n\nPlease check your O365 configuration and try again.`
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        } catch (error) {
          logger.error('Error handling meeting command:', error);
        }
      }

      // If not an O365 command, proceed with regular AI chat
      try {
        // Add user message to messages (using the stored messageContent)
        setMessages(prev => [...prev, userMessage]);
        
        // Add empty assistant message for streaming
        const assistantMessage: Message = { 
          id: `temp-${Date.now()}-${Math.random()}`,
          role: 'assistant', 
          content: '' 
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        let accumulatedContent = '';
        const stream = streamResponses(
          messageContent,  // Use stored messageContent instead of currentMessage 
          lastResponseId || undefined
        );
        
        for await (const chunk of stream) {
          if (chunk.type === 'response_id' && chunk.id) {
            // Update with real response ID and save for next request
            setLastResponseId(chunk.id);
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage.role === 'assistant') {
                lastMessage.id = chunk.id!;
              }
              return newMessages;
            });
          } else if (chunk.type === 'content' && chunk.content) {
            accumulatedContent += chunk.content;
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage.role === 'assistant') {
                lastMessage.content = accumulatedContent;
              }
              return newMessages;
            });
          }
        }
      } catch (error) {
        logger.error('Error getting AI response:', error);
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

  useEffect(() => {
    if (lastResponseId) {
      localStorage.setItem('lastResponseId', lastResponseId);
    } else {
      localStorage.removeItem('lastResponseId');
    }
  }, [lastResponseId]);

  // Handle repository changes
  useEffect(() => {
    if (selectedRepository && 
        selectedRepository.id !== lastUpdatedRepositoryId && 
        !isUpdatingRepository) {
      setIsUpdatingRepository(true);
      
      // Update repository context when it changes
      updateRepositoryContext(selectedRepository, lastResponseId || undefined)
        .then((result) => {
          if (result.success) {
            markRepositoryContextUpdated(selectedRepository.id);
            // Important: Update lastResponseId with the new response ID from developer message
            if (result.responseId) {
              setLastResponseId(result.responseId);
            }
            // Note: No toast here - toast is shown when repository is selected in repo.tsx
          } else {
            logger.error('Failed to update repository context:', result.error);
            showToast('Failed to update repository context', 'error');
          }
        })
        .catch((error) => {
          logger.error('Repository context update error:', error);
          showToast('Failed to update repository context', 'error');
        })
        .finally(() => {
          setIsUpdatingRepository(false);
        });
    }
  }, [selectedRepository, lastUpdatedRepositoryId, isUpdatingRepository, showToast, lastResponseId, markRepositoryContextUpdated]);

  const saveConversationAsMarkdown = () => {
    if (messages.length === 0) {
      showToast('No conversation to save', 'error');
      return;
    }

    let markdownContent = '# Chat Conversation\n\n';
    markdownContent += `*Exported on ${new Date().toLocaleString()}*\n\n`;

    messages.forEach((message) => {
      if (message.role === 'user') {
        markdownContent += '############\n';
        markdownContent += '# User message\n';
        markdownContent += '############\n\n';
        markdownContent += message.content + '\n\n';
      } else {
        markdownContent += '##########\n';
        markdownContent += '# AI message\n';
        markdownContent += '##########\n\n';
        markdownContent += message.content + '\n\n';
      }
    });

    // Create and download the file
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-conversation-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Conversation saved as markdown', 'success');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header with Clear Button */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">AI Chat</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveConversationAsMarkdown}
            className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
          >
            Save as Markdown
          </button>
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
