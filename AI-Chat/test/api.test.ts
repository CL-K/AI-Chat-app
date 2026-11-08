/**
 * API route tests — llama, llava, gemma
 * Mock fetch to Ollama (http://ollama:11434)
 */

import { NextRequest } from 'next/server';

// ============================================================
// Type for the NextResponse mock
// ============================================================
type MockResponse = {
  data: Record<string, unknown>;
  status: number;
};

// ============================================================
// Mock next/server
// ============================================================
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(
      (
        data: Record<string, unknown>,
        init?: { status?: number }
      ): MockResponse => ({
        data,
        status: init?.status ?? 200,
      })
    ),
  },
}));

// Silence console.error during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ============================================================
// Helpers
// ============================================================

// Explicit cast to NextRequest to satisfy TypeScript
function makeRequest(body: object): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

// Mock a successful Ollama response
function mockOllamaSuccess(response: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ response }),
  });
}

// Mock an Ollama error (ok: false)
function mockOllamaError(statusText = 'Internal Server Error') {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    text: jest.fn().mockResolvedValue(statusText),
  });
}

// Mock a network crash
function mockOllamaNetworkError(message = 'Network error') {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
}

// Helper to call a route and cast the response
async function callRoute(
  route: (req: NextRequest) => Promise<unknown>,
  body: object
): Promise<MockResponse> {
  return (await route(makeRequest(body))) as MockResponse;
}

// ============================================================
// Import routes
// ============================================================
import { POST as llamaPost } from '../app/api/llama/route';
import { POST as llavaPost } from '../app/api/llava/route';
import { POST as gemmaPost } from '../app/api/gemma/route';

// ============================================================
// Tests — Route /api/llama (llama3:8b — text only)
// ============================================================
describe('POST /api/llama', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a response when the prompt is valid', async () => {
    mockOllamaSuccess('  Hello from llama3  ');

    const res = await callRoute(llamaPost, { prompt: 'Hello' });

    expect(fetch).toHaveBeenCalledWith(
      'http://ollama:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"model":"llama3:8b"'),
      })
    );
    expect(res.data).toEqual({ response: 'Hello from llama3' });
    expect(res.status).toBe(200);
  });

  it('returns 400 if the prompt is missing', async () => {
    const res = await callRoute(llamaPost, {});

    expect(res.status).toBe(400);
    expect(res.data).toEqual({ error: 'Prompt is required' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 400 if the prompt is an empty string', async () => {
    const res = await callRoute(llamaPost, { prompt: '' });

    expect(res.status).toBe(400);
    expect(res.data).toEqual({ error: 'Prompt is required' });
  });

  it('returns 500 if Ollama responds with an error', async () => {
    mockOllamaError('model not found');

    const res = await callRoute(llamaPost, { prompt: 'Test' });

    expect(res.status).toBe(500);
    expect(res.data).toEqual({ error: 'Failed to get response from Ollama' });
  });

  it('returns 500 if fetch throws a network error', async () => {
    mockOllamaNetworkError('Connection refused');

    const res = await callRoute(llamaPost, { prompt: 'Test' });

    expect(res.status).toBe(500);
    expect(res.data.error).toBe('Connection refused');
  });

  it('sends the prompt and the correct parameters to Ollama', async () => {
    mockOllamaSuccess('Response');

    await callRoute(llamaPost, { prompt: "What is Kubernetes?" });

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.prompt).toBe('What is Kubernetes?');
    expect(body.model).toBe('llama3:8b');
    expect(body.stream).toBe(false);
  });
});

// ============================================================
// Tests — Route /api/llava (llava:7b — text + image + audio)
// ============================================================
describe('POST /api/llava', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a response with a text prompt', async () => {
    mockOllamaSuccess('Llava description');

    const res = await callRoute(llavaPost, { prompt: 'Describe this image' });

    expect(fetch).toHaveBeenCalledWith(
      'http://ollama:11434/api/generate',
      expect.objectContaining({
        body: expect.stringContaining('"model":"llava:7b"'),
      })
    );
    expect(res.data).toEqual({ response: 'Llava description' });
    expect(res.status).toBe(200);
  });

  it('returns a response with an image (base64)', async () => {
    mockOllamaSuccess('I see a cat');
    const fakeImage = 'base64encodedimage==';

    const res = await callRoute(llavaPost, { image: fakeImage });

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.images).toEqual([fakeImage]);
    expect(body.prompt).toBe('Analyze this content');
    expect(res.status).toBe(200);
  });

  it('returns a response with audio', async () => {
    mockOllamaSuccess('Audio transcription');

    const res = await callRoute(llavaPost, { audio: 'base64audio==' });

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.audio).toBe('base64audio==');
    expect(res.status).toBe(200);
  });

  it('returns a response with prompt + image combined', async () => {
    mockOllamaSuccess('Combined response');

    const res = await callRoute(llavaPost, {
      prompt: 'What do you see?',
      image: 'base64image==',
    });

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.prompt).toBe('What do you see?');
    expect(body.images).toEqual(['base64image==']);
    expect(res.status).toBe(200);
  });

  it('returns 400 if prompt, image, and audio are all missing', async () => {
    const res = await callRoute(llavaPost, {});

    expect(res.status).toBe(400);
    expect(res.data).toEqual({ error: 'Prompt, image or audio is required' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 500 if Ollama fails', async () => {
    mockOllamaError();

    const res = await callRoute(llavaPost, { prompt: 'Test' });

    expect(res.status).toBe(500);
    expect(res.data).toEqual({ error: 'Failed to get response from Ollama' });
  });

  it('returns 500 if network error occurs', async () => {
    mockOllamaNetworkError('ECONNREFUSED');

    const res = await callRoute(llavaPost, { prompt: 'Test' });

    expect(res.status).toBe(500);
    expect(res.data.error).toBe('ECONNREFUSED');
  });

  it("does not send images if image is missing", async () => {
    mockOllamaSuccess('Text response');

    await callRoute(llavaPost, { prompt: 'Single text' });

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.images).toBeUndefined();
  });
});

// ============================================================
// Tests — Route /api/gemma (gemma4:12b — text + image + audio + video)
// ============================================================
describe('POST /api/gemma', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a response with a text prompt', async () => {
    mockOllamaSuccess('  Gemma response  ');

    const res = await callRoute(gemmaPost, { prompt: 'Explain Docker' });

    expect(fetch).toHaveBeenCalledWith(
      'http://ollama:11434/api/generate',
      expect.objectContaining({
        body: expect.stringContaining('"model":"gemma4:12b"'),
      })
    );
    expect(res.data).toEqual({ response: 'Gemma response' });
    expect(res.status).toBe(200);
  });

  it('uses the default prompt if missing but an image is provided', async () => {
    mockOllamaSuccess("Image analysis");

    const res = await callRoute(gemmaPost, { image: 'base64image==' });

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.prompt).toBe('Analyze this content');
    expect(body.images).toEqual(['base64image==']);
    expect(res.status).toBe(200);
  });

  it('sends the video to Ollama if provided', async () => {
    mockOllamaSuccess('Video analysis');

    const res = await callRoute(gemmaPost, {
      video: 'base64video==',
      prompt: 'Analyze',
    });

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.video).toBe('base64video==');
    expect(res.status).toBe(200);
  });

  it('returns a response with all media combined', async () => {
    mockOllamaSuccess('Multimodal response');

    const res = await callRoute(gemmaPost, {
      prompt: 'Analyze everything',
      image: 'img==',
      audio: 'aud==',
      video: 'vid==',
    });

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.prompt).toBe('Analyze everything');
    expect(body.images).toEqual(['img==']);
    expect(body.audio).toBe('aud==');
    expect(body.video).toBe('vid==');
    expect(res.status).toBe(200);
  });

  it('returns 400 if all fields are missing', async () => {
    const res = await callRoute(gemmaPost, {});

    expect(res.status).toBe(400);
    expect(res.data).toEqual({
      error: 'Prompt, image, audio or video is required',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 500 if Ollama fails', async () => {
    mockOllamaError('Service unavailable');

    const res = await callRoute(gemmaPost, { prompt: 'Test' });

    expect(res.status).toBe(500);
    expect(res.data).toEqual({ error: 'Failed to get response from Ollama' });
  });

  it('returns 500 if the network fails', async () => {
    mockOllamaNetworkError('Timeout');

    const res = await callRoute(gemmaPost, { prompt: 'Test' });

    expect(res.status).toBe(500);
    expect(res.data.error).toBe('Timeout');
  });

  it('trims the Ollama response correctly', async () => {
    mockOllamaSuccess('   response with spaces   ');

    const res = await callRoute(gemmaPost, { prompt: 'Test trim' });

    expect(res.data.response).toBe('response with spaces');
  });

  it("does not send images, audio, or video if they are absent", async () => {
    mockOllamaSuccess('Plain text');

    await callRoute(gemmaPost, { prompt: 'Plain text only' });

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.images).toBeUndefined();
    expect(body.audio).toBeUndefined();
    expect(body.video).toBeUndefined();
  });
});