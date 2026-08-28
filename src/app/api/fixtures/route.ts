import { NextResponse } from "next/server";

const ODDS_API_KEY = process.env.ODDS_API_KEY; 

function generateMockMatches() {
  const now = new Date().toISOString();
  return [
    {
      id: 'mock-1',
      home_team: 'Home FC',
      away_team: 'Away FC',
      commence_time: now,
      bookmakers: [
        {
          title: 'MockBook',
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: 'Home FC', price: 1.5 },
                { name: 'Away FC', price: 2.5 },
                { name: 'Draw', price: 3.0 }
              ]
            }
          ]
        }
      ],
      sport_title: 'Soccer'
    }
  ];
}

export async function GET() {
  try {
    if (!ODDS_API_KEY) {
      console.error("❌ SETUP ERROR: Missing ODDS_API_KEY in your .env.local file!");
      return NextResponse.json({ data: [] });
    }

    console.log("🔄 Fetching global soccer matches...");

    // Fetch ALL soccer matches from ONE call with valid regions
    const allRegions = 'us,eu,uk,au';
    const url = `https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${ODDS_API_KEY}&regions=${allRegions}&markets=h2h`;
    
    console.log(`📡 Calling: ${url.substring(0, 80)}...`);
    
    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 15000, // 15 second timeout
      } as RequestInit);
    } catch (fetchError) {
      console.error("❌ FETCH ERROR:", fetchError instanceof Error ? fetchError.message : String(fetchError));
      // Return mock data as fallback
      return NextResponse.json({ 
        data: generateMockMatches(),
        source: 'mock'
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API ERROR (${response.status}):`, errorText);
      // Return mock data as fallback
      return NextResponse.json({ 
        data: generateMockMatches(),
        source: 'mock',
        error: `API returned ${response.status}`
      });
    }

    const apiData = await response.json();
    console.log(`✅ API Response type: ${typeof apiData}, is array: ${Array.isArray(apiData)}`);

    // Handle both wrapped and unwrapped responses
    let allMatches = Array.isArray(apiData) ? apiData : (apiData?.data || []);
    
    console.log(`✅ Total matches received: ${allMatches.length}`);
    
    if (allMatches.length > 0) {
      console.log("📊 First match:", JSON.stringify(allMatches[0], null, 2).substring(0, 200));
    }

    // If no matches, use mock data
    if (allMatches.length === 0) {
      console.warn("⚠️ No matches from API, using mock data");
      allMatches = generateMockMatches();
    }

    // Format fixtures for frontend
    const formattedFixtures = allMatches.map((match: any) => {
      const firstBookmaker = match.bookmakers?.[0];
      const h2hMarket = firstBookmaker?.markets?.find((m: any) => m.key === 'h2h');
      
      const homeOdds = h2hMarket?.outcomes?.find((o: any) => o.name === match.home_team)?.price || null;
      const awayOdds = h2hMarket?.outcomes?.find((o: any) => o.name === match.away_team)?.price || null;
      const drawOdds = h2hMarket?.outcomes?.find((o: any) => o.name === 'Draw')?.price || null;

      const leagueName = match.sport_title || "Soccer";

      return {
        id: match.id,
        league: {
          id: 1,
          name: leagueName,
        },
        participants: [
          {
            id: 1,
            name: match.home_team,
            meta: { location: 'home' },
          },
          {
            id: 2,
            name: match.away_team,
            meta: { location: 'away' },
          }
        ],
        starting_at: match.commence_time || '',
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        date: match.commence_time ? match.commence_time.split('T')[0] : '',
        time: match.commence_time ? match.commence_time.split('T')[1]?.substring(0, 5) : '',
        odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
        source: firstBookmaker?.title || "Global",
        sport: leagueName,
        category: leagueName,
        competition: leagueName
      };
    });

    console.log(`✅ Formatted ${formattedFixtures.length} fixtures for frontend`);
    return NextResponse.json({ data: formattedFixtures });

  } catch (error: any) {
    console.error("❌ ERROR:", error?.message || error);
    return NextResponse.json({ data: [] });
  }
}