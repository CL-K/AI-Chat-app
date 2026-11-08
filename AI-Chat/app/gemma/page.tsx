'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  audio?: string;
  video?: string;
}

export default function GemmaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setVideoData(base64.split(',')[1]);
        setVideoPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageData && !audioData && !videoData) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      image: imagePreview || undefined,
      audio: audioPreview || undefined,
      video: videoPreview || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('/api/gemma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          image: imageData,
          audio: audioData,
          video: videoData,
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
      setVideoData(null);
      setVideoPreview(null);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-wrapper">
        <div className="chat-header chat-header-gemma">
          <div className="chat-header-left">
            <h1>✨ Gemma Chat</h1>
            <p>Multimodal analysis: text, image, audio, and video</p>
          </div>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="back-button">← Back</button>
          </Link>
        </div>

        <div className="messages-container">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-content">
                <div className="empty-emoji">✨</div>
                <h2>Welcome to Gemma</h2>
                <p>Use text, images, audio, or video to interact</p>
              </div>
            </div>
          )}

          <div className="messages-list">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`message-group ${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className={`message-bubble ${message.role === 'user' ? 'message-user' : 'message-assistant-gemma'}`}>
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
                  {message.video && (
                    <video controls className="message-video">
                      <source src={message.video} type="video/mp4" />
                      Your browser does not support video.
                    </video>
                  )}
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-group assistant">
                <div className="message-bubble message-assistant-gemma">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="input-area">
          <form onSubmit={handleSubmit} className="input-form gemma-form">
            <div className="media-controls">
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
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="video-button"
              >
                🎥 Video
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden-file-input"
              />
            </div>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your question..."
              disabled={loading}
              className="text-input"
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !imageData && !audioData && !videoData)}
              className="send-button send-button-gemma"
            >
              {loading ? '⏳' : '✈️'} Send
            </button>
          </form>
        </div>

        {(imagePreview || audioPreview || videoPreview) && (
          <div className="image-preview">
            <div className="preview-box">
              {imagePreview && (
                <>
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
                </>
              )}
              {audioPreview && (
                <>
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
                </>
              )}
              {videoPreview && (
                <>
                  <video controls className="preview-video">
                    <source src={videoPreview} type="video/mp4" />
                    Your browser does not support video.
                  </video>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoData(null);
                      setVideoPreview(null);
                    }}
                    className="remove-button"
                  >
                    Remove video
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
