import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages, model = 'gemma:2b' } = await req.json();

    const systemMessage = {
      role: 'system',
      content:
        'You are Ade, a fast, friendly, and witty local AI assistant. ' +
        'When asked your name, always say your name is Ade. ' +
        'Keep responses concise and conversational.',
    };

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [systemMessage, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.error || 'Failed to fetch from Ollama' }, { status: response.status });
    }

    // Return the stream directly to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'application/x-ndjson',
      },
    });
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
