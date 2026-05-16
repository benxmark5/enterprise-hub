import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const token = process.env.NEXT_PUBLIC_APIFOOTBALL_KEY;
    if (!token) {
      return Response.json(
        { error: 'Missing token' },
        { status: 400 }
      );
    }

    const { teamId } = params;
    const season = 2025;

    const url = `https://api-football-v1.p.rapidapi.com/v3/players?team=${teamId}&season=${season}`;

    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': token,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
      },
      signal: AbortSignal.timeout(10000),
    });

    const text = await res.text();
    if (!text) return Response.json({ data: [] });

    const raw = JSON.parse(text);

    const players = (raw.response || []).map((item: {
      player: {
        id: number;
        name: string;
        nationality: string;
        position: string;
        photo: string;
      };
      statistics: {
        games: {
          appearences: number;
          position: string;
        };
      }[];
    }) => ({
      player_id: item.player.id,
      player: {
        display_name: item.player.name,
        nationality: item.player.nationality,
        position: item.statistics?.[0]?.games?.position ?? 'Unknown',
        photo: item.player.photo,
      },
    }));

    return Response.json({ data: players });

  } catch (error) {
    console.error('Players error:', error);
    return Response.json(
      { data: [], error: String(error) }
    );
  }
}