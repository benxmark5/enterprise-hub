import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: { teamId: string } }
) {
  try {
    const teamId = context.params.teamId;
    const url = `https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${teamId}`;

    const res = await fetch(url);
    const text = await res.text();
    if (!text) return Response.json({ data: [] });

    const raw = JSON.parse(text);

    const players = (raw.player || []).map((item: {
      idPlayer: string;
      strPlayer: string;
      strPosition: string;
      strNationality: string;
    }) => ({
      player_id: parseInt(item.idPlayer),
      player: {
        display_name: item.strPlayer,
        position: item.strPosition ?? 'Unknown',
        nationality: item.strNationality ?? '',
      },
    }));

    return Response.json({ data: players });

  } catch (error) {
    return Response.json(
      { data: [], error: String(error) }
    );
  }
}