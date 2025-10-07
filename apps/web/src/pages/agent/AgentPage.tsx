import { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import agentService, { type ChatMessage } from '../../services/agent.service';
import toast from 'react-hot-toast';

const AgentPage = () => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const exampleQueries = [
    "What's my total spending this month?",
    "Show me my top 3 expense categories",
    "Compare my income vs expenses for last 30 days",
    "How much did I spend on food last week?",
    "Show me my recent transactions",
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
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <SparklesIcon className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Financial AI Agent</h1>
          </div>
          <p className="text-blue-100">
            Ask me anything about your finances. I can analyze your spending, income, and provide insights.
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && (
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <ChartBarIcon className="w-16 h-16 mx-auto text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Welcome to Financial AI Agent!</h2>
                  <p className="text-gray-600">
                    I'm your personal financial assistant. I can help you understand your spending patterns,
                    analyze transactions, and provide insights about your finances.
                  </p>
                  
                  <div className="pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Try these examples:</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {exampleQueries.map((query, index) => (
                        <button
                          key={index}
                          onClick={() => handleExampleClick(query)}
                          className="text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-sm text-gray-700 hover:text-blue-700 transition-colors border border-gray-200 hover:border-blue-300"
                        >
                          {query}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-2xl px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your finances..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Powered by Google Gemini AI • Press Enter to send
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentPage;
