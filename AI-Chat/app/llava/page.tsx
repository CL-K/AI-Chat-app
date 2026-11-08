'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  audio?: string;
}

export default function LlavaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImageData(base64.split(',')[1]);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAudioData(base64.split(',')[1]);
        setAudioPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageData && !audioData) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      image: imagePreview || undefined,
      audio: audioPreview || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('/api/llava', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          image: imageData,
          audio: audioData,
        }),
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
      setImageData(null);
      setImagePreview(null);
      setAudioData(null);
      setAudioPreview(null);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-wrapper">
        <div className="chat-header chat-header-llava">
          <div className="chat-header-left">
            <h1>🎨 Llava Chat</h1>
            <p>Analyze images and audio with vision AI</p>
          </div>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="back-button">← Back</button>
          </Link>
        </div>

        <div className="messages-container">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-content">
                <div className="empty-emoji">🎯</div>
                <h2>Welcome to Llava</h2>
                <p>Upload an image and/or audio to start analyzing with Llava</p>
              </div>
            </div>
          )}

          <div className="messages-list">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`message-group ${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className={`message-bubble ${message.role === 'user' ? 'message-user' : 'message-assistant-llava'}`}>
                  {message.image && (
                    <Image
                      src={message.image}
                      alt="uploaded"
                      width={300}
                      height={200}
                      className="message-image"
                    />
                  )}
                  {message.audio && (
                    <audio controls className="message-audio">
                      <source src={message.audio} type="audio/mpeg" />
                      Your browser does not support audio.
                    </audio>
                  )}
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

        {imagePreview && (
          <div className="image-preview">
            <div className="preview-box">
              <Image
                src={imagePreview}
                alt="preview"
                width={300}
                height={200}
                className="preview-image"
              />
              <button
                type="button"
                onClick={() => {
                  setImageData(null);
                  setImagePreview(null);
                }}
                className="remove-button"
              >
                Remove image
              </button>
            </div>
          </div>
        )}

        {audioPreview && (
          <div className="audio-preview">
            <div className="preview-box">
              <audio controls className="preview-audio">
                <source src={audioPreview} type="audio/mpeg" />
                Your browser does not support audio.
              </audio>
              <button
                type="button"
                onClick={() => {
                  setAudioData(null);
                  setAudioPreview(null);
                }}
                className="remove-button"
              >
                Remove audio
              </button>
            </div>
          </div>
        )}

        <div className="input-area">
          <form onSubmit={handleSubmit} className="input-form">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="image-button"
            >
              📷 Image
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden-file-input"
            />
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="audio-button"
            >
              🎤 Audio
            </button>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden-file-input"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your question..."
              className="text-input"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !imageData && !audioData)}
              className="send-button"
            >
              {loading ? '⏳' : '📤'} Envoyer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
