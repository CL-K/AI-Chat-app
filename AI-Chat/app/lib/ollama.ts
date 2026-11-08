const OLLAMA_API_URL = (
  process.env.OLLAMA_API_URL || 'http://ollama:11434'
).replace(/\/+$/, '');

export function getOllamaUrl(path: string) {
  return `${OLLAMA_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function getModelCapabilities(model: string): Promise<string[]> {
  const response = await fetch(getOllamaUrl('/api/show'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Ollama could not inspect model "${model}":`, error);
    throw new Error(`Impossible de vérifier les capacités du modèle ${model}`);
  }

  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('capabilities' in data) ||
    (data.capabilities !== undefined &&
      (!Array.isArray(data.capabilities) ||
        !data.capabilities.every(
          (capability: unknown) => typeof capability === 'string'
        )))
  ) {
    console.error(`Ollama returned invalid capabilities for "${model}"`);
    throw new Error(`Capacités invalides pour le modèle ${model}`);
  }

  return data.capabilities ?? [];
}
