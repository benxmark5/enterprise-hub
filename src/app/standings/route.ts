import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const token = process.env.SPORTMONKS_TOKEN;
  if (!token) return Response.json({ error: 'No token' }, { status: 500 });
  const leagueId = req.nextUrl.searchParams.get('leagueId');
  if (!leagueId) return Response.json({ error: 'leagueId required' }, { status: 400 });

  try {
    const res = await fetch(
      `https://api.sportmonks.com/v3/football/standings/seasons/${leagueId}?api_token=${token}&include=participant;rule`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}