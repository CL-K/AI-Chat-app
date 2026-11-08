import { NextResponse } from 'next/server';
import { getModelCapabilities, getOllamaUrl } from '../../lib/ollama';

export async function GET() {
  try {
    const response = await fetch(getOllamaUrl('/api/tags'), {
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Ollama model-list error:', error);
      return NextResponse.json(
        { error: 'Impossible de récupérer les modèles depuis Ollama' },
        { status: 502 }
      );
    }

    const data: unknown = await response.json();
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
          typeof model.name === 'string'
      )
    ) {
      console.error('Ollama returned an invalid model list');
      return NextResponse.json(
        { error: 'Ollama a retourné une liste de modèles invalide' },
        { status: 502 }
      );
    }

    const models = await Promise.all(
      data.models.map(async (model: { name: string }) => ({
        name: model.name,
        capabilities: await getModelCapabilities(model.name),
      }))
    );

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Ollama model-list request failed:', error);
    return NextResponse.json(
      { error: 'Impossible de se connecter à Ollama pour récupérer les modèles' },
      { status: 502 }
    );
  }
}
