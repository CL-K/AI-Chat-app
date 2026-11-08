'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

interface OllamaModel {
  name: string;
  capabilities: string[];
}

export default function ModelChat() {
  const [model, setModel] = useState('');
  const [supportsVision, setSupportsVision] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const selectedModel =
      new URLSearchParams(window.location.search).get('model') ?? '';
    setModel(selectedModel);

    fetch('/api/models', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Impossible de charger les modèles');
        }
        return data.models as OllamaModel[];
      })
      .then((models: OllamaModel[]) => {
        const selected = models.find(({ name }) => name === selectedModel);
        if (active) setSupportsVision(selected?.capabilities.includes('vision') ?? false);
      })
      .catch((error: unknown) => {
        console.error('Unable to load model capabilities:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = input.trim();
    if ((!prompt && !image) || !model || loading) return;
    const messagePrompt = prompt || 'Décris cette image.';
    const preview = imagePreview ?? undefined;

    setMessages((current) => [
      ...current,
      { role: 'user', content: messagePrompt, image: preview },
    ]);
    setInput('');
    setImage(null);
    setImagePreview(null);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: messagePrompt, image }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Le modèle n’a pas pu répondre');
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data.response },
      ]);
    } catch (error) {
      console.error('Model chat request failed:', error);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? `Erreur : ${error.message}`
              : 'Erreur : impossible de contacter le serveur',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setImage(reader.result.split(',')[1] ?? '');
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <main className="chat-container">
      <div className="chat-wrapper">
        <header className="chat-header chat-header-model">
          <div className="chat-header-left">
            <h1>🤖 {model || 'Modèle'}</h1>
            <p>Conversation avec le modèle sélectionné dans Ollama</p>
          </div>
          <Link href="/" className="back-button">
            ← Retour
          </Link>
        </header>

        <section className="messages-container" aria-live="polite">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-content">
                <div className="empty-emoji" aria-hidden="true">🤖</div>
                <h2>{model ? `Bienvenue sur ${model}` : 'Aucun modèle sélectionné'}</h2>
                <p>
                  {model
                    ? 'Écrivez un message pour commencer la conversation.'
                    : 'Retournez à l’accueil et sélectionnez un modèle installé.'}
                </p>
              </div>
            </div>
          )}

          <div className="messages-list">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`message-group ${message.role}`}
              >
                <div
                  className={`message-bubble ${
                    message.role === 'user'
                      ? 'message-user'
                      : 'message-assistant-model'
                  }`}
                >
                  {message.image && (
                    <Image
                      src={message.image}
                      alt="Image envoyée"
                      width={320}
                      height={240}
                      unoptimized
                      className="message-image"
                    />
                  )}
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-group assistant">
                <div className="loading-spinner" aria-label="Le modèle répond">
                  <div className="spinner-dot"></div>
                  <div className="spinner-dot"></div>
                  <div className="spinner-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </section>

        {imagePreview && (
          <div className="image-preview">
            <div className="preview-box">
              <Image
                src={imagePreview}
                alt="Aperçu de l’image à envoyer"
                width={160}
                height={120}
                unoptimized
                className="preview-image"
              />
              <button
                type="button"
                className="remove-button"
                onClick={() => {
                  setImage(null);
                  setImagePreview(null);
                }}
              >
                Retirer l’image
              </button>
            </div>
          </div>
        )}

        <div className="input-area">
          <form onSubmit={handleSubmit} className="input-form">
            {supportsVision && (
              <>
                <button
                  type="button"
                  className="image-button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={loading}
                >
                  📷 Image
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden-file-input"
                />
              </>
            )}
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Votre message…"
              className="text-input"
              disabled={!model || loading}
            />
            <button
              type="submit"
              disabled={!model || loading || (!input.trim() && !image)}
              className="send-button"
            >
              {loading ? '⏳' : '📤'} Envoyer
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
