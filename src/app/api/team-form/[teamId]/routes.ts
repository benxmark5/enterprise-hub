import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const token = process.env.NEXT_PUBLIC_APIFOOTBALL_KEY;
    if (!token) {
      return Response.json(
        { error: 'Missing key' }, 
        { status: 400 }
      );
    }

    const { teamId } = params;
    const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?team=${teamId}&last=5`;

    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': token,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
      },
      signal: AbortSignal.timeout(10000),
    });

    const text = await response.text();
    const raw = text ? JSON.parse(text) : {};

    // Convert to our format
    const fixtures = (raw.response || []).map((item: {
      fixture: { id: number; date: string };
      league: { id: number; name: string };
      teams: {
        home: { id: number; name: string };
        away: { id: number; name: string };
      };
      goals: { home: number | null; away: number | null };
    }) => ({
      id: item.fixture.id,
      starting_at: item.fixture.date,
      league: { name: item.league.name },
      participants: [
        {
          id: item.teams.home.id,
          name: item.teams.home.name,
          meta: { location: 'home' },
        },
        {
          id: item.teams.away.id,
          name: item.teams.away.name,
          meta: { location: 'away' },
        },
      ],
      scores: [
        { description: 'CURRENT', 
          score: { goals: item.goals.home ?? 0 } },
        { description: 'CURRENT', 
          score: { goals: item.goals.away ?? 0 } },
      ],
    }));

    return Response.json({ data: fixtures });

  } catch (error) {
    return Response.json(
      { data: [], error: String(error) }
    );
  }
}