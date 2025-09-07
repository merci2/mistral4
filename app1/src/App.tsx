// src/App.tsx
import { Mistral } from '@mistralai/mistralai';
import { useState, useEffect, useRef } from 'react';
import './global.css';

// Type definitions for better TypeScript support
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Initialize Mistral client
const mistralApiKey = import.meta.env.VITE_MISTRAL_API_KEY;
const client = mistralApiKey ? new Mistral({ apiKey: mistralApiKey }) : null;

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'no-key'>('connecting');
  const [isChatVisible, setIsChatVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Test Mistral connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      if (!mistralApiKey) {
        setConnectionStatus('no-key');
        return;
      }

      if (!client) {
        setConnectionStatus('error');
        return;
      }

      try {
        const response = await client.chat.complete({
          model: 'mistral-tiny',
          messages: [{ role: 'user', content: 'Hello, are you working?' }],
          maxTokens: 50,
        }) as ChatResponse;

        if (response.choices && response.choices[0]?.message?.content) {
          setConnectionStatus('connected');
          // Add welcome message
          const welcomeMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Hi! I\'m your AI assistant powered by Mistral AI. How can I help you today?',
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
        } else {
          setConnectionStatus('error');
        }
      } catch (error) {
        console.error('Mistral API connection error:', error);
        setConnectionStatus('error');
      }
    };

    testConnection();
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !client || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare conversation history for context
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      const response = await client.chat.complete({
        model: 'mistral-small', // Using a more capable model
        messages: conversationHistory,
        maxTokens: 500,
        temperature: 0.7,
      }) as ChatResponse;

      if (response.choices && response.choices[0]?.message?.content) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.choices[0].message.content,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connecting':
        return { text: 'Connecting to Mistral AI...', color: '#ffa500' };
      case 'connected':
        return { text: 'Connected to Mistral AI', color: '#4caf50' };
      case 'error':
        return { text: 'Error connecting to Mistral AI. Check your API key and network.', color: '#f44336' };
      case 'no-key':
        return { text: 'No API key found. Please set VITE_MISTRAL_API_KEY in your .env file.', color: '#f44336' };
      default:
        return { text: 'Unknown status', color: '#757575' };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="app-container">
      <h1>Mistral RAG AI Chatbot</h1>
      <p>Welcome to your AI-powered chat application.</p>
      <p style={{ color: status.color }}>
        <strong>Status:</strong> {status.text}
      </p>
      
      {connectionStatus === 'no-key' && (
        <div style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '4px', 
          padding: '15px', 
          margin: '20px 0',
          color: '#856404'
        }}>
          <h3>Setup Required:</h3>
          <ol>
            <li>Create a <code>.env</code> file in your project root</li>
            <li>Add your Mistral API key: <code>VITE_MISTRAL_API_KEY=your_api_key_here</code></li>
            <li>Get your API key from <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer">https://console.mistral.ai/</a></li>
            <li>Restart your development server</li>
          </ol>
        </div>
      )}

      {connectionStatus === 'connected' && (
        <button
          onClick={() => setIsChatVisible(!isChatVisible)}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          {isChatVisible ? 'Hide Chat' : 'Open Chat'}
        </button>
      )}

      {connectionStatus === 'connected' && isChatVisible && (
        <div className="chatbot-widget">
          {/* Chat Header */}
          <div className="chat-header">
            <h3>AI Assistant</h3>
            <button
              onClick={() => setIsChatVisible(false)}
              className="chat-close-btn"
            >
              ×
            </button>
          </div>

          {/* Messages Container */}
          <div className="messages-container">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-content">{message.content}</div>
                <div className="message-time">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant-message">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Container */}
          <div className="chat-input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="chat-input"
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className={`chat-send-btn ${inputMessage.trim() && !isLoading ? 'active' : 'disabled'}`}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;