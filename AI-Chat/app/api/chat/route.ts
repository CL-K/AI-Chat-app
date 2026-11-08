import { NextRequest, NextResponse } from 'next/server';
import { getModelCapabilities, getOllamaUrl } from '../../lib/ollama';

export async function POST(request: NextRequest) {
  try {
    const { model, prompt, image } = await request.json();

    if (typeof model !== 'string' || !model.trim()) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      );
    }

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (image !== undefined && image !== null && typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Image must be a base64 string' },
        { status: 400 }
      );
    }

    if (image) {
      const capabilities = await getModelCapabilities(model.trim());
      if (!capabilities.includes('vision')) {
        return NextResponse.json(
          { error: `Le modèle ${model.trim()} ne prend pas en charge les images` },
          { status: 400 }
        );
      }
    }

    const ollamaResponse = await fetch(getOllamaUrl('/api/generate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.trim(),
        prompt,
        images: image ? [image] : undefined,
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      const error = await ollamaResponse.text();
      console.error('Ollama error:', error);
      return NextResponse.json(
        { error: 'Failed to get response from Ollama' },
        { status: 500 }
      );
    }

    const data = await ollamaResponse.json();

    return NextResponse.json({
      response: data.response.trim(),
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
