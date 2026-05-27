import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pattern } = body;

    // Forward the user data directly to your running Python engine on port 8000
    const pythonResponse = await fetch('http://127.0.0.1:8000/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pattern: pattern }),
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      return NextResponse.json({ error: `Python Server Error: ${errorText}` }, { status: 500 });
    }

    const data = await pythonResponse.json();

    // Pass the calculated targets back to your React frontend dashboard
    return NextResponse.json({ 
      success: true, 
      signals: data.signals 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown system error';
    return NextResponse.json(
      { error: `Failed to communicate with Python backend: ${errorMessage}` },
      { status: 500 }
    );
  }
} // <--- This is the final closing brace that completes the POST function!