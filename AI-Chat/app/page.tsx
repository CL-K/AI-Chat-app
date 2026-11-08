'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface OllamaModel {
  name: string;
  capabilities: string[];
}

async function fetchInstalledModels(): Promise<OllamaModel[]> {
  const response = await fetch('/api/models', { cache: 'no-store' });
  const data: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : 'Impossible de charger les modèles';
    throw new Error(message);
  }

  if (
    typeof data !== 'object' ||
    data === null ||
    !('models' in data) ||
    !Array.isArray(data.models) ||
    !data.models.every(
      (model: unknown) =>
        typeof model === 'object' &&
        model !== null &&
        'name' in model &&
        typeof model.name === 'string' &&
        'capabilities' in model &&
        Array.isArray(model.capabilities) &&
        model.capabilities.every(
          (capability: unknown) => typeof capability === 'string'
        )
    )
  ) {
    throw new Error('La liste de modèles reçue est invalide');
  }

  return data.models;
}

export default function Home() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadModels = async () => {
    try {
      setModels(await fetchInstalledModels());
      setError('');
    } catch (loadError) {
      console.error('Unable to load Ollama models:', loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Impossible de charger les modèles'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    fetchInstalledModels()
      .then((installedModels) => {
        if (active) {
          setModels(installedModels);
          setError('');
        }
      })
      .catch((loadError: unknown) => {
        console.error('Unable to load Ollama models:', loadError);
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Impossible de charger les modèles'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const refreshModels = () => {
    setLoading(true);
    void loadModels();
  };

  return (
    <main className="home-container">
      <div className="home-content">
        <div className="home-header">
          <h1>AI Chat</h1>
          <p>Choisissez un modèle installé dans Ollama</p>
        </div>

        {loading && <p className="model-status">Chargement des modèles…</p>}

        {!loading && error && (
          <div className="model-status model-error" role="alert">
            <p>{error}</p>
            <button type="button" className="retry-button" onClick={refreshModels}>
              Réessayer
            </button>
          </div>
        )}

        {!loading && !error && models.length === 0 && (
          <p className="model-status">
            Aucun modèle installé. Téléchargez-en un avec{' '}
            <code>ollama pull nom-du-modèle</code>.
          </p>
        )}

        {!loading && !error && models.length > 0 && (
          <>
            <div className="cards-grid">
              {models.map((model) => (
                <Link
                  key={model.name}
                  href={`/chat?model=${encodeURIComponent(model.name)}`}
                  className="card card-model"
                >
                  <div className="card-emoji" aria-hidden="true">
                    🤖
                  </div>
                  <h2 className="card-title">{model.name}</h2>
                  <p className="card-description">Modèle disponible dans Ollama</p>
                  <div className="card-info">
                    <p>
                      Capacités :{' '}
                      {model.capabilities.length
                        ? model.capabilities.join(', ')
                        : 'texte'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="home-footer">
              <p>{models.length} modèle{models.length > 1 ? 's' : ''} installé{models.length > 1 ? 's' : ''}</p>
              <button type="button" className="retry-button" onClick={refreshModels}>
                Actualiser
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
