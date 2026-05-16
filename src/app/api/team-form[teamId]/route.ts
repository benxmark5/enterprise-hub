import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const token = process.env.NEXT_PUBLIC_SPORTMONKS_TOKEN;
    if (!token) {
      return Response.json(
        { error: 'Missing token' }, 
        { status: 400 }
      );
    }

    const { teamId } = params;

    // Last 5 fixtures for this team
    const url = `https://api.sportmonks.com/v3/football/fixtures?api_token=${token}&filters=teamId:${teamId}&sort=-starting_at&per_page=5&include=participants;scores`;

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch team form', details: String(error) },
      { status: 500 }
    );
  }
}