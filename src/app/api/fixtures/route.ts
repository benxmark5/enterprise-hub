export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // TheSportsDB - completely free, no key needed
    const leagues = [
      { id: '4328', name: 'English Premier League' },
      { id: '4335', name: 'SpanishLa Liga' },
      { id: '4332', name: 'German Bundesliga' },
      { id: '4331', name: 'Italian Serie A' },
      { id: '4334', name: 'French Ligue 1' },
      { id: `4480`, name: 'UEFA Champions League' },
    ];

    let allFixtures: object[] = [];

    for (const league of leagues) {
      try {
        const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&l=${league.id}`;
        
        console.log(`Fetching ${league.name}:`, url);
        
        const res = await fetch(url);
        const text = await res.text();
        console.log(`${league.name} RAW:`, text.substring(0, 200));
        
        const raw = JSON.parse(text);
        const events = (raw.events || []).map((item: {
          idEvent: string;
          dateEvent: string;
          strTime: string;
          strHomeTeam: string;
          idHomeTeam: string;
          strAwayTeam: string;
          idAwayTeam: string;
          strLeague: string;
          idLeague: string;
          strStatus: string;
          intHomeScore: string | null;
          intAwayScore: string | null;
        }) => ({
          id: parseInt(item.idEvent),
          starting_at: `${item.dateEvent}T${item.strTime || '00:00:00'}`,
          status: item.strStatus || 'NS',
          league: {
            id: parseInt(item.idLeague),
            name: item.strLeague,
            country: '',
          },
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
          goals: {
            home: item.intHomeScore 
              ? parseInt(item.intHomeScore) : null,
            away: item.intAwayScore 
              ? parseInt(item.intAwayScore) : null,
          },
        }));

        allFixtures = [...allFixtures, ...events];
        console.log(`${league.name}: ${events.length} fixtures`);

      } catch (e) {
        console.error(`Failed ${league.name}:`, e);
      }
    }

    console.log(`Total fixtures: ${allFixtures.length}`);

    return Response.json({
      data: allFixtures,
      total: allFixtures.length,
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json(
      { error: 'Failed', details: String(error) },
      { status: 500 }
    );
  }
}