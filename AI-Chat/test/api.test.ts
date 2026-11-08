import { NextRequest } from 'next/server';
import { POST as chatPost } from '../app/api/chat/route';
import { GET as modelsGet } from '../app/api/models/route';

type MockResponse = {
  data: Record<string, unknown>;
  status: number;
};

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(
      (data: Record<string, unknown>, init?: { status?: number }): MockResponse => ({
        data,
        status: init?.status ?? 200,
      })
    ),
  },
}));

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

function makeRequest(body: object): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

async function callChat(body: object): Promise<MockResponse> {
  return (await chatPost(makeRequest(body))) as unknown as MockResponse;
}

describe('GET /api/models', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns installed models and their Ollama capabilities', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          models: [{ name: 'qwen2.5vl:7b' }, { name: 'gemini:latest' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          capabilities: ['completion', 'vision'],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ capabilities: ['completion'] }),
      });

    const response = (await modelsGet()) as unknown as MockResponse;

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      models: [
        { name: 'qwen2.5vl:7b', capabilities: ['completion', 'vision'] },
        { name: 'gemini:latest', capabilities: ['completion'] },
      ],
    });
  });

  it('returns a gateway error when Ollama cannot be reached', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

    const response = (await modelsGet()) as unknown as MockResponse;

    expect(response.status).toBe(502);
  });

  it('returns a gateway error when Ollama cannot inspect a model', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ models: [{ name: 'qwen:latest' }] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        text: jest.fn().mockResolvedValue('model not found'),
      });

    const response = (await modelsGet()) as unknown as MockResponse;

    expect(response.status).toBe(502);
  });
});

describe('POST /api/chat', () => {
  beforeEach(() => jest.clearAllMocks());

  it('generates a response using the selected model', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: '  Hello  ' }),
    });

    const response = await callChat({ model: 'gemini:latest', prompt: 'Hello' });

    expect(fetch).toHaveBeenCalledWith(
      'http://ollama:11434/api/generate',
      expect.objectContaining({
        body: expect.stringContaining('"model":"gemini:latest"'),
      })
    );
    expect(response.data).toEqual({ response: 'Hello' });
    expect(response.status).toBe(200);
  });

  it('requires a selected model', async () => {
    const response = await callChat({ prompt: 'Hello' });

    expect(response.status).toBe(400);
    expect(response.data).toEqual({ error: 'Model is required' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires a prompt', async () => {
    const response = await callChat({ model: 'qwen:latest' });

    expect(response.status).toBe(400);
    expect(response.data).toEqual({ error: 'Prompt is required' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends an image to a vision-capable model', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          capabilities: ['completion', 'vision'],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ response: 'Image description' }),
      });

    const response = await callChat({
      model: 'qwen2.5vl:7b',
      prompt: 'Describe this',
      image: 'base64-image',
    });

    expect(JSON.parse((fetch as jest.Mock).mock.calls[1][1].body).images).toEqual([
      'base64-image',
    ]);
    expect(response.status).toBe(200);
  });

  it('rejects an image for a model without vision capability', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ capabilities: ['completion'] }),
    });

    const response = await callChat({
      model: 'qwen:latest',
      prompt: 'Describe this',
      image: 'base64-image',
    });

    expect(response.status).toBe(400);
    expect(response.data.error).toContain('ne prend pas en charge les images');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
