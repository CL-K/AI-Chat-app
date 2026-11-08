'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function LlamaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('/api/llama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error: Unable to connect to the server',
        },
      ]);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-wrapper">
        <div className="chat-header chat-header-llama">
          <div className="chat-header-left">
            <h1>🦙 Llama Chat</h1>
            <p>Chat with Llama 3.8B</p>
          </div>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="back-button">← Back</button>
          </Link>
        </div>

        <div className="messages-container">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-content">
                <div className="empty-emoji">🦙</div>
                <h2>Welcome to Llama</h2>
                <p>Ask a question to start a conversation</p>
              </div>
            </div>
          )}

          <div className="messages-list">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`message-group ${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className={`message-bubble ${message.role === 'user' ? 'message-user' : 'message-assistant-llama'}`}>
                  <p>{message.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="message-group assistant">
                <div className="loading-spinner">
                  <div className="spinner-dot"></div>
                  <div className="spinner-dot"></div>
                  <div className="spinner-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="input-area">
          <form onSubmit={handleSubmit} className="input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="text-input"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="send-button send-button-llama"
            >
              {loading ? '⏳' : '📤'} Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
