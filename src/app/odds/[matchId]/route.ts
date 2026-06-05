import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const token = process.env.SPORTMONKS_TOKEN;

  if (!token) {
    return Response.json({
      error: 'SPORTMONKS_TOKEN not set'
    }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.sportmonks.com/v3/football/odds/pre-match/fixtures/${params.matchId}` +
      `?api_token=${token}` +
      `&include=bookmaker;market` +
      `&per_page=200`,
      { next: { revalidate: 120 } }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('Odds API error:', text.slice(0, 200));
      return Response.json({
        error: `API error ${res.status}`, data: []
      });
    }

    const data = await res.json();
    return Response.json(data);

  } catch (error) {
    return Response.json(
      { error: String(error), data: [] }, { status: 500 }
    );
  }
}