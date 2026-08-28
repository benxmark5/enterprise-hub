import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const token = process.env.SPORTMONKS_TOKEN;
  const matchId = req.nextUrl.searchParams.get('matchId');

  if (!matchId) {
    return Response.json({ error: 'matchId query parameter required' }, { status: 400 });
  }

  if (!token) {
    return Response.json({
      error: 'SPORTMONKS_TOKEN not set in .env.local'
    }, { status: 500 });
  }

  try {
    const base = 'https://api.sportmonks.com/v3/football';

    // Fetch fixture with all includes
    const fixtureRes = await fetch(
      `${base}/fixtures/${matchId}` +
      `?api_token=${token}` +
      `&include=participants.players.player` +
      `;participants.players.statistics` +
      `;statistics.type` +
      `;scores`,
      { next: { revalidate: 300 } }
    );

    if (!fixtureRes.ok) {
      const text = await fixtureRes.text();
      console.error('Sportmonks fixture error:', text.slice(0, 200));
      return Response.json({
        error: `API error ${fixtureRes.status}`
      }, { status: fixtureRes.status });
    }

    const fixture = await fixtureRes.json();

    // Fetch H2H separately
    let h2h = { data: [] };
    try {
      const h2hRes = await fetch(
        `${base}/fixtures/${matchId}/head2head` +
        `?api_token=${token}` +
        `&include=participants;scores` +
        `&per_page=10`,
        { next: { revalidate: 3600 } }
      );
      if (h2hRes.ok) h2h = await h2hRes.json();
    } catch (e) {
      console.error('H2H fetch failed:', e);
    }

    return Response.json({ fixture, h2h });

  } catch (error) {
    console.error('match-stats error:', error);
    return Response.json(
      { error: String(error) }, { status: 500 }
    );
  }
}