import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: { teamId: string } }
) {
  try {
    const token = process.env.NEXT_PUBLIC_APIFOOTBALL_KEY;
    if (!token) {
      return Response.json({ data: [] });
    }

    const teamId = context.params.teamId;
    const url = `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${teamId}`;

    const res = await fetch(url);
    const text = await res.text();
    if (!text) return Response.json({ data: [] });

    const raw = JSON.parse(text);

    const fixtures = (raw.results || []).map((item: {
      idEvent: string;
      dateEvent: string;
      strHomeTeam: string;
      idHomeTeam: string;
      strAwayTeam: string;
      idAwayTeam: string;
      strLeague: string;
      intHomeScore: string | null;
      intAwayScore: string | null;
    }) => ({
      id: parseInt(item.idEvent),
      starting_at: item.dateEvent,
      league: { name: item.strLeague },
      participants: [
        {
          id: parseInt(item.idHomeTeam),
          name: item.strHomeTeam,
          meta: { location: 'home' },
        },
        {
          id: parseInt(item.idAwayTeam),
          name: item.strAwayTeam,
          meta: { location: 'away' },
        },
      ],
      scores: [
        {
          description: 'CURRENT',
          score: {
            goals: item.intHomeScore
              ? parseInt(item.intHomeScore) : 0,
          },
        },
        {
          description: 'CURRENT',
          score: {
            goals: item.intAwayScore
              ? parseInt(item.intAwayScore) : 0,
          },
        },
      ],
    }));

    return Response.json({ data: fixtures });

  } catch (error) {
    return Response.json(
      { data: [], error: String(error) }
    );
  }
}