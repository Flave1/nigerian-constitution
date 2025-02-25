import { useState, useRef, useEffect } from 'react';
import { Message, ChatSession } from '../types/chat';
import { 
  PaperAirplaneIcon, 
  UserCircleIcon, 
  PlusIcon, 
  ClockIcon, 
  ChatBubbleLeftIcon,
  XMarkIcon,
  Bars3Icon,
  TrashIcon,
  EllipsisVerticalIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  UserIcon
} from '@heroicons/react/24/solid';
import TextareaAutosize from 'react-textarea-autosize';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { ref, push, onValue, query, orderByChild, equalTo, get, remove } from 'firebase/database';
import { generateTitle } from '../lib/agent-service';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { Fragment } from 'react';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<{id: string, title: string} | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load chat sessions
  useEffect(() => {
    if (!user) return;

    const sessionsRef = ref(db, 'chatSessions');
    const userSessionsQuery = query(
      sessionsRef,
      orderByChild('userId'),
      equalTo(user.uid)
    );

    const unsubscribe = onValue(userSessionsQuery, (snapshot) => {
      const sessionsList: ChatSession[] = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        sessionsList.push({
          id: childSnapshot.key!,
          title: data.title,
          lastMessage: data.lastMessage,
          timestamp: new Date(data.timestamp),
          userId: data.userId,
        });
      });
      setSessions(sessionsList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    });

    return () => unsubscribe();
  }, [user]);

  // Load messages for current session
  useEffect(() => {
    if (!user || !currentSessionId) return;

    const messagesRef = ref(db, 'messages');
    const sessionMessagesQuery = query(
      messagesRef,
      orderByChild('sessionId'),
      equalTo(currentSessionId)
    );

    const unsubscribe = onValue(sessionMessagesQuery, (snapshot) => {
      const messagesList: Message[] = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        messagesList.push({
          id: childSnapshot.key!,
          role: data.role,
          content: data.content,
          timestamp: new Date(data.timestamp),
          userId: data.userId,
          sessionId: data.sessionId,
        });
      });
      setMessages(messagesList.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
    });

    return () => unsubscribe();
  }, [user, currentSessionId]);

  // Add scroll to bottom effect
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const createNewSession = async () => {
    if (!user) return;
    
    const sessionsRef = ref(db, 'chatSessions');
    const newSession = await push(sessionsRef, {
      title: 'New Chat',
      lastMessage: '',
      timestamp: Date.now(),
      userId: user.uid,
    });
    
    setCurrentSessionId(newSession.key);
  };

  const updateSessionTitle = async (sessionId: string, message: string) => {
    const title = await generateTitle(message);
    const sessionRef = ref(db, `chatSessions/${sessionId}`);
    await push(sessionRef, {
      title,
      timestamp: Date.now(),
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !user || !currentSessionId) return;

    const trimmedInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const messagesRef = ref(db, 'messages');
      const sessionsRef = ref(db, `chatSessions/${currentSessionId}`);

      // Add user message
      await push(messagesRef, {
        role: 'user',
        content: trimmedInput,
        timestamp: Date.now(),
        userId: user.uid,
        sessionId: currentSessionId,
      });

      // If this is the first message, generate a title
      const sessionMessagesQuery = query(
        messagesRef,
        orderByChild('sessionId'),
        equalTo(currentSessionId)
      );
      const snapshot = await get(sessionMessagesQuery);
      if (snapshot.size === 1) {
        await updateSessionTitle(currentSessionId, trimmedInput);
      }

      // Update session
      await push(sessionsRef, {
        lastMessage: trimmedInput,
        timestamp: Date.now(),
      });

      // Get AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedInput }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      // Add AI message
      await push(messagesRef, {
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
        userId: user.uid,
        sessionId: currentSessionId,
      });

      // Update session with AI response
      await push(sessionsRef, {
        lastMessage: data.reply,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error in chat:', error);
      setInput(trimmedInput);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const deleteSession = async (sessionId: string) => {
    if (!user || isDeleting) return;
    
    try {
      setIsDeleting(sessionId);
      
      // Delete messages
      const messagesRef = ref(db, 'messages');
      const sessionMessagesQuery = query(
        messagesRef,
        orderByChild('sessionId'),
        equalTo(sessionId)
      );
      
      const snapshot = await get(sessionMessagesQuery);
      const deletePromises: Promise<void>[] = [];
      
      snapshot.forEach((childSnapshot) => {
        deletePromises.push(remove(ref(db, `messages/${childSnapshot.key}`)));
      });
      
      // Delete session
      deletePromises.push(remove(ref(db, `chatSessions/${sessionId}`)));
      
      await Promise.all(deletePromises);
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setIsDeleting(null);
      setDeletingSession(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-[#E1E8ED] px-4 py-3 flex items-center justify-between">
        <Menu as="div" className="relative">
          <Menu.Button className="p-2 hover:bg-gray-100 rounded-lg">
            <Bars3Icon className="w-6 h-6 text-[#008751]" />
          </Menu.Button>
          <Menu.Items className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-[#E1E8ED] divide-y divide-gray-100">
            {/* User Info Section */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <UserIcon className="w-10 h-10 p-2 bg-[#008751] text-white rounded-full" />
                )}
                <div>
                  <h3 className="font-medium text-gray-900">
                    {user?.displayName || 'User'}
                  </h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                Welcome! Ask me anything about the Nigerian Constitution and legal matters. I'm here to help you understand your rights and responsibilities.
              </p>
            </div>

            {/* Actions Section */}
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={createNewSession}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } flex w-full items-center px-4 py-3 text-sm text-gray-700`}
                  >
                    <PlusIcon className="w-5 h-5 mr-3" />
                    New Chat
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } flex w-full items-center px-4 py-3 text-sm text-gray-700`}
                  >
                    <ChatBubbleLeftIcon className="w-5 h-5 mr-3" />
                    Chat History
                  </button>
                )}
              </Menu.Item>
            </div>

            {/* Settings Section */}
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => {/* Add settings handler */}}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } flex w-full items-center px-4 py-3 text-sm text-gray-700`}
                  >
                    <Cog6ToothIcon className="w-5 h-5 mr-3" />
                    Settings
                  </button>
                )}
              </Menu.Item>
            </div>

            {/* Sign Out Section */}
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => logout()}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } flex w-full items-center px-4 py-3 text-sm text-red-600`}
                  >
                    <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3" />
                    Sign Out
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Menu>
        
        <h1 className="text-lg font-semibold text-[#008751] truncate max-w-[200px]">
          {currentSessionId 
            ? sessions.find(s => s.id === currentSessionId)?.title || 'Chat'
            : 'Nigerian Constitution AI'
          }
        </h1>

        <div className="w-10 h-10" />
      </div>

      <div className="flex flex-1 h-full overflow-hidden">
        {/* Sidebar */}
        <div className={`
          fixed md:relative w-[85vw] md:w-72 
          h-full bg-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          z-50 md:z-auto
        `}>
          <div className="hidden md:block p-4 border-b border-[#E1E8ED] bg-gradient-to-r from-[#008751] to-[#00A86B]">
            <button
              onClick={createNewSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-[#008751] rounded-lg hover:bg-opacity-90 transition-all transform hover:scale-[1.02] shadow-md"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="font-medium">New Chat</span>
            </button>
          </div>

          {/* Mobile Sidebar Header */}
          <div className="md:hidden p-4 bg-gradient-to-r from-[#008751] to-[#00A86B] flex items-center justify-between">
            <h2 className="text-white font-semibold">Chat History</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-white to-[#F5F8FA]">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`relative group w-full p-4 text-left hover:bg-white transition-all duration-200 border-b border-[#E1E8ED] ${
                  currentSessionId === session.id 
                    ? 'bg-white shadow-md transform scale-[1.02]' 
                    : 'hover:transform hover:scale-[1.01]'
                }`}
              >
                <button
                  onClick={() => setCurrentSessionId(session.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <ChatBubbleLeftIcon className="w-5 h-5 text-[#008751]" />
                    <h3 className="font-medium text-[#15202B] truncate">
                      {session.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ClockIcon className="w-4 h-4" />
                    <span>{formatTimestamp(session.timestamp)}</span>
                  </div>
                </button>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingSession({id: session.id, title: session.title});
                  }}
                  className={`
                    absolute right-2 top-1/2 -translate-y-1/2
                    p-2 rounded-full
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-200
                    hover:bg-red-50
                    ${isDeleting === session.id ? 'cursor-wait' : 'hover:text-red-600'}
                  `}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-white">
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#F5F8FA]"
          >
            {currentSessionId ? (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {message.role === 'user' ? (
                        user?.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <UserCircleIcon className="w-10 h-10 text-[#008751]" />
                        )
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#008751] flex items-center justify-center text-white font-bold">
                          AI
                        </div>
                      )}
                    </div>
                    <div
                      className={`max-w-[70%] rounded-2xl px-6 py-3 ${
                        message.role === 'user'
                          ? 'bg-[#008751] text-white'
                          : 'bg-white border border-[#E1E8ED]'
                      }`}
                    >
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-2 opacity-70">
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <ChatBubbleLeftIcon className="w-16 h-16 text-[#008751] opacity-20 mx-auto mb-4" />
                  <p>Select a chat or create a new one to start</p>
                </div>
              </div>
            )}
          </div>

          {currentSessionId && (
            <div className="sticky bottom-0 bg-white border-t border-[#E1E8ED] p-3 md:p-4">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <TextareaAutosize
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Ask about the Nigerian Constitution..."
                  className="flex-1 px-4 py-2 rounded-xl border border-[#E1E8ED] focus:outline-none focus:border-[#008751] focus:ring-1 focus:ring-[#008751] text-[15px] max-h-32 min-h-[45px] resize-none"
                  disabled={isLoading || !user}
                  minRows={1}
                  maxRows={5}
                />
                <button
                  type="submit"
                  disabled={isLoading || !user || !input.trim()}
                  className="p-2 rounded-full bg-[#008751] text-white hover:bg-opacity-90 transition-colors disabled:bg-opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Transition appear show={!!deletingSession} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setDeletingSession(null)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Delete Chat
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete "{deletingSession?.title}"? This action cannot be undone.
                    </p>
                  </div>

                  <div className="mt-4 flex gap-3 justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-100 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none"
                      onClick={() => deletingSession && deleteSession(deletingSession.id)}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none"
                      onClick={() => setDeletingSession(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 