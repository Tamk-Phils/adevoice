import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob;

    if (!audioFile) {
      console.error('STT: No audio file in form data');
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    // Prepare forward request
    const pythonFormData = new FormData();
    // Ensure we provide a filename, otherwise Flask might not put it in request.files
    pythonFormData.append('audio', audioFile, 'speech.wav');

    console.log('STT: Forwarding to Python backend...');
    const response = await fetch('http://localhost:5001/stt', {
      method: 'POST',
      body: pythonFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('STT: Backend error:', errorText);
      throw new Error(`Failed to transcribe: ${errorText}`);
    }

    const data = await response.json();
    console.log('STT: Transcribed text:', data.text);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('STT API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
