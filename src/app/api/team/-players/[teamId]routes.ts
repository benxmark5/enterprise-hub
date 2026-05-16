import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const token = process.env.NEXT_PUBLIC_APIFOOTBALL_KEY;
    if (!token) {
      return Response.json({ data: [] });
    }

    const { teamId } = params;
    const url = `https://allsportsapi2.p.rapidapi.com/api/football/matches?teamId=${teamId}&last=5`;

    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': token,
        'X-RapidAPI-Host': 'allsportsapi2.p.rapidapi.com',
      },
    });

    const text = await res.text();
    if (!text) return Response.json({ data: [] });
    const raw = JSON.parse(text);

    const fixtures = (raw.result || []).map((item: {
      event_key: number;
      event_date: string;
      event_home_team: string;
      home_team_key: number;
      event_away_team: string;
      away_team_key: number;
      league_name: string;
      event_final_result: string;
    }) => ({
      id: item.event_key,
      starting_at: item.event_date,
      league: { name: item.league_name },
      participants: [
        {
          id: item.home_team_key,
          name: item.event_home_team,
          meta: { location: 'home' },
        },
        {
          id: item.away_team_key,
          name: item.event_away_team,
          meta: { location: 'away' },
        },
      ],
      scores: [
        {
          description: 'CURRENT',
          score: {
            goals: item.event_final_result
              ? parseInt(item.event_final_result.split(' - ')[0])
              : 0,
          },
        },
        {
          description: 'CURRENT',
          score: {
            goals: item.event_final_result
              ? parseInt(item.event_final_result.split(' - ')[1])
              : 0,
          },
        },
      ],
    }));

    return Response.json({ data: fixtures });

  } catch (error) {
    return Response.json({ data: [], error: String(error) });
  }
}