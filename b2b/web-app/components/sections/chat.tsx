import React, {FormEvent, useEffect, useRef, useState} from 'react';
import {LoadingIndicator} from "./chat/loading-indicator";
import {MarkdownRenderer} from "./chat/markdown-renderer";
import {Info, Send} from "lucide-react";
import {SchedulingConfirmationCard} from "./chat/booking-confirmation-card";
import {useStateStore} from "./state-store";
import {getConfig} from "@teamspace-app/util-application-config-util";
import AdminIcon from '@rsuite/icons/Admin';
import SendIcon from '@rsuite/icons/Send';

type MeetingPreview = {
  topic: string
  date: string
  startTime: string
  duration: string
  timeZone: string
}

type MeetingDetails = {
  meeting_id: string
}

type Response = {
  chat_response: string
  tool_response: {
    authorization_url?: string
    BookingDetails?: MeetingPreview
    booking_details?: MeetingDetails
    schedule_preview?: {
      meeting_id: string
    }
  }
}

type AgentMessage = {
  id: string
  response: Response
  frontend_state: string
  message_states: string[]
}

type Message = {
  id: string
  content: string
  isUser: boolean
  isLoading?: boolean
  loadingAction?: 'searching' | 'booking' | 'default'
  toolResponse?: AgentMessage
}

function StateInfoButton({ threadId, messageStates }: { threadId: string, messageStates: string[] }) {
  const { setThreadId, setState, toggleStatusPanel, isStatusPanelVisible, currentThreadId } = useStateStore();

  // Debug effect to track state changes
  useEffect(() => {
    console.log("StateInfoButton state:", { threadId, currentThreadId, isStatusPanelVisible, messageStates });
  }, [threadId, currentThreadId, isStatusPanelVisible, messageStates]);

  const handleInfoClick = () => {
    console.log("Show Status clicked - before:", {
      currentThreadId: threadId,
      isStatusPanelVisible,
      messageStates
    });

    // Set the thread ID and state directly from the message
    setThreadId(threadId);
    setState(messageStates || []); // Ensure we pass an array even if messageStates is undefined
    toggleStatusPanel(true);

    console.log("Show Status clicked - after:", {
      currentThreadId: threadId,
      isStatusPanelVisible,
      messageStates
    });
  };

  return (
      <button
          onClick={handleInfoClick}
          className="flex items-center text-gray-400 hover:text-orange-500 transition-colors text-xs mt-2"
      >
        <Info className="h-3.5 w-3.5 mr-1" />
        <span>Explanation</span>
      </button>
  );
}

const Chat = ({ session }) => {
  const chatServiceUrl = getConfig().BusinessAdminAppConfig.resourceServerURLs.chatService
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [threadId] = useState<string>(Date.now().toString())
  const [showPreviewConfirmWidget, setShowPreviewConfirmWidget] = useState<boolean>(true)
  const { setThreadId: setGlobalThreadId } = useStateStore()
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: Date.now().toString(),
      content: `Hello ${session?.user?.username || 'there'} ! How can I help you today?`,
      isUser: false,
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBookConfirmationRetry = async (meeting: any) => {
    const bookingMessage = `Yes, schedule it!. SCHEDULE_MEETING. I am ok with meeting details you provided. Meeting topic ${meeting.topic} on ${meeting.date} at ${meeting.startTime} for ${meeting.duration} in time zone ${meeting.timeZone}.`;

    const loadingMessage: Message = {
      id: 'loading',
      content: '',
      isUser: false,
      isLoading: true,
      loadingAction: 'booking'
    }

    setMessages((prev) => [...prev, loadingMessage])
    setIsLoading(true)

    try {
      const response = await fetch(`${chatServiceUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({
          message: bookingMessage,
          threadId: threadId
        })
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const agentMessage = await response.json() as AgentMessage

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: agentMessage.response.chat_response,
        isUser: false,
        toolResponse: agentMessage
      }

      setShowPreviewConfirmWidget(false)

      setMessages((prev) => prev.filter(msg => msg.id !== 'loading').concat(botMessage))
    } catch (error) {
      console.error("Error scheduling meeting:", error)
      setMessages(prev => prev.filter(msg => msg.id !== 'loading').concat({
        id: Date.now().toString(),
        content: "Sorry, I couldn't process your scheduling request. Please try again.",
        isUser: false
      }))
    } finally {
      setIsLoading(false)
      setShowPreviewConfirmWidget(true)
    }
  }

  const renderToolResponse = (msg: AgentMessage) => {
    if (msg.response.tool_response?.authorization_url) {
      return (
          showPreviewConfirmWidget &&
          <SchedulingConfirmationCard
              threadId={threadId}
              authorizationUrl={msg.response.tool_response.authorization_url}
              onContinueBooking={() => {
                if (msg.response.tool_response.schedule_preview) {
                  handleBookConfirmationRetry(
                      msg.response.tool_response.schedule_preview
                  )
                }
              }}
          />
      )
    }
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
    }

    const loadingMessage: Message = {
      id: 'loading',
      content: '',
      isUser: false,
      isLoading: true,
      loadingAction: 'default'
    }

    setMessages((prev) => [...prev, userMessage, loadingMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch(`${chatServiceUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          message: input,
          threadId: threadId
        })
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const agentMessage = await response.json() as AgentMessage

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: agentMessage.response.chat_response,
        isUser: false,
        toolResponse: agentMessage
      }

      setMessages((prev) => prev.filter(msg => msg.id !== 'loading').concat(botMessage))
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages(prev => prev.filter(msg => msg.id !== 'loading').concat({
        id: Date.now().toString(),
        content: "Sorry, I couldn't process your message. Please try again.",
        isUser: false
      }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating chat button */}
      {!open && (
          <button
              type="button"
              onClick={() => setOpen(true)}
              style={{
                position: 'fixed',
                bottom: 32,
                right: 32,
                zIndex: 1000,
                background: 'linear-gradient(45deg, var(--rs-primary-700), var(--rs-primary-400))',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 56,
                height: 56,
                fontSize: 28,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              aria-label="Open chat"
          >
            <img src="/agent-icon.png" alt="Chat" style={{ width: 45, height: 45, filter: 'brightness(0) invert(1)' }} />
          </button>
      )}
      {/* Popup chat box */}
      {open && (
          <div
              style={{
                position: 'fixed',
                bottom: 100,
                right: 32,
                zIndex: 1001,
                background: '#fff',
                border: '1px solid #ccc',
                borderRadius: 12,
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                padding: 0,
                maxWidth: 400,
                width: '100%',
                minHeight: 320,
                maxHeight: '80vh', // Ensure widget is not taller than viewport
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #eee', background: '#f7f7fa', position: 'sticky', top: 0, zIndex: 2 }}>
              <span style={{ fontWeight: 600 }}>Teamspace Agent</span>
              <button
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
                  aria-label="Close chat"
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f7f7fa' }}>
              {messages.map((msg, idx) => (
                  <div
                      key={msg.id || idx}
                      style={{
                        display: 'flex',
                        flexDirection: msg.isUser ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        marginBottom: 12,
                      }}
                  >
                    {msg.isUser ? (
                        <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 8px 0 0' }}>
                          <AdminIcon style={{ fontSize: 32, color: '#4F40EE', display: 'block' }} />
                        </span>
                    ) : (
                        <img
                            src="/agent-icon.png"
                            alt="User"
                            style={{ width: 32, height: 32, borderRadius: '50%', margin: '0 0 0 8px', objectFit: 'cover', display: 'block' }}
                        />
                    )}
                    <div
                        style={{
                          background: msg.isUser ? '#4F40EE' : '#fff',
                          color: msg.isUser ? '#fff' : '#222',
                          border: msg.isUser ? 'none' : '1px solid #e0e0e0',
                          borderRadius: msg.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          padding: '10px 16px',
                          maxWidth: '70%',
                          fontSize: 14,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          wordBreak: 'break-word',
                          display: 'inline-block',
                        }}
                    >
                      {msg.isLoading ? (
                          <LoadingIndicator action={msg.loadingAction} />
                      ) : (
                          <>
                            {msg.isUser ? (
                                <p className="text-sm">{msg.content}</p>
                            ) : (
                                <div className="text-sm text-gray-800">
                                  <MarkdownRenderer content={msg.content} />
                                </div>
                            )}
                            {!msg.isUser && msg.toolResponse && renderToolResponse(msg.toolResponse)}
                          </>
                      )}
                    </div>
                  </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: 16, borderTop: '1px solid #eee', background: '#fff' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <textarea
                    placeholder="Type your message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={isLoading}
                    style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc', fontSize: 14 }}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    style={{ padding: '8px 16px', background: '#4F40EE', color: '#fff', border: 'none', borderRadius: 4, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                >
                  <SendIcon style={{ fontSize: 20 }} />
                </button>
              </form>
            </div>
          </div>
      )}
    </>
  );
}

export default Chat;
