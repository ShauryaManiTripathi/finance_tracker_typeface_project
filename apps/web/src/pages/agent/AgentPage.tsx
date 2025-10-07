import { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import agentService, { type ChatMessage } from '../../services/agent.service';
import toast from 'react-hot-toast';

const AgentPage = () => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const exampleQueries = [
    "What's my total spending this month?",
    "Show me my top 3 expense categories",
    "Compare my income vs expenses for last 30 days",
    "How much did I spend on housing?",
  ];

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await agentService.chat(userMessage, history);
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
      setHistory(response.history);
      
      if (response.functionCalls > 0) {
        console.log(`Agent made ${response.functionCalls} function calls`);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.response?.data?.message || 'Failed to get response');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleExampleClick = (query: string) => {
    setInput(query);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Welcome State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                  <SparklesIcon className="w-9 h-9 text-white" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-semibold text-gray-900">Financial AI Assistant</h1>
                  <p className="text-lg text-gray-600 max-w-lg mx-auto">
                    Ask me anything about your finances. I can analyze spending, track income, and provide personalized insights.
                  </p>
                </div>
              </div>
              
              <div className="w-full max-w-2xl space-y-3">
                <p className="text-sm font-medium text-gray-500">Try asking:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exampleQueries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(query)}
                      className="group text-left px-5 py-4 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-sm"
                    >
                      <p className="text-sm text-gray-700 group-hover:text-gray-900">{query}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-6 py-4">
            {messages.map((message, index) => (
              <div key={index} className="space-y-2">
                {/* Role Label */}
                <div className={`flex items-center gap-2 px-1 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                  {message.role === 'assistant' ? (
                    <>
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <SparklesIcon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">Assistant</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-gray-900">You</span>
                      <div className="w-6 h-6 rounded-lg bg-gray-700 flex items-center justify-center">
                        <span className="text-xs font-semibold text-white">You</span>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Message Content */}
                <div className={`px-1 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                  <div className={`prose prose-sm max-w-none ${
                    message.role === 'assistant' ? 'text-gray-800' : 'text-gray-900'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Assistant</span>
                </div>
                <div className="px-1">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about your finances..."
              rows={1}
              disabled={loading}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 text-gray-900 placeholder-gray-400"
              style={{ minHeight: '52px', maxHeight: '200px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <PaperAirplaneIcon className="w-5 h-5 text-white" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send • Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentPage;
