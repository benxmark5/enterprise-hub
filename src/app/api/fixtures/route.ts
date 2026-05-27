import { NextResponse } from "next/server";

const ODDS_API_KEY = process.env.ODDS_API_KEY; 

export async function GET() {
  try {
    if (!ODDS_API_KEY) {
      console.error("❌ SETUP ERROR: Missing ODDS_API_KEY in your .env.local file!");
      return NextResponse.json([]); // Return safe empty array to prevent client crashes
    }

    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${ODDS_API_KEY}&regions=eu,us,uk&markets=h2h`
    );

    if (!response.ok) {
      console.error(`❌ THE ODDS API ERROR (Status ${response.status})`);
      return NextResponse.json([]); 
    }

    const liveData = await response.json();

    if (!Array.isArray(liveData)) {
      return NextResponse.json([]);
    }

    const formattedFixtures = liveData.map((match: any) => {
      const firstBookmaker = match.bookmakers?.[0];
      const h2hMarket = firstBookmaker?.markets?.find((m: any) => m.key === 'h2h');
      
      const homeOdds = h2hMarket?.outcomes?.find((o: any) => o.name === match.home_team)?.price || null;
      const awayOdds = h2hMarket?.outcomes?.find((o: any) => o.name === match.away_team)?.price || null;
      const drawOdds = h2hMarket?.outcomes?.find((o: any) => o.name === 'Draw')?.price || null;

      const leagueName = match.sport_title || "Soccer";

      return {
        id: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        date: match.commence_time ? match.commence_time.split('T')[0] : '',
        time: match.commence_time ? match.commence_time.split('T')[1].substring(0, 5) : '',
        odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
        source: firstBookmaker?.title || "Global Aggregate",
        
        // Match all fallback keys so that the "UNKNOWN" label disappears
        sport: leagueName,
        league: leagueName,
        category: leagueName,
        competition: leagueName
      };
    });

    // 👇 Change: Return the flat array directly to the client dashboard layout
    return NextResponse.json(formattedFixtures);

  } catch (error: any) {
    console.error("❌ CRITICAL API ROUTE ERROR:", error);
    return NextResponse.json([]);
  }
}