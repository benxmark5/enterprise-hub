// src/lib/football/clubs.ts
// Static club lists per league. Used for admin dropdowns.
// These are top-division clubs as of the current season.

export const LEAGUE_CLUBS: Record<string, string[]> = {
  'Premier League': [
    'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton & Hove Albion',
    'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Ipswich Town',
    'Leicester City', 'Liverpool', 'Manchester City', 'Manchester United',
    'Newcastle United', 'Nottingham Forest', 'Southampton', 'Tottenham Hotspur',
    'West Ham United', 'Wolverhampton Wanderers',
  ],
  'La Liga': [
    'Alavés', 'Athletic Club', 'Atlético Madrid', 'Barcelona', 'Celta Vigo',
    'Espanyol', 'Getafe', 'Girona', 'Las Palmas', 'Leganés',
    'Mallorca', 'Osasuna', 'Rayo Vallecano', 'Real Betis', 'Real Madrid',
    'Real Sociedad', 'Sevilla', 'Valencia', 'Valladolid', 'Villarreal',
  ],
  'Serie A': [
    'Atalanta', 'Bologna', 'Cagliari', 'Como', 'Empoli',
    'Fiorentina', 'Genoa', 'Hellas Verona', 'Inter Milan', 'Juventus',
    'Lazio', 'Lecce', 'AC Milan', 'Monza', 'Napoli',
    'Parma', 'Roma', 'Torino', 'Udinese', 'Venezia',
  ],
  'Bundesliga': [
    'Augsburg', 'Bayer Leverkusen', 'Bayern Munich', 'Bochum', 'Borussia Dortmund',
    'Borussia Mönchengladbach', 'Eintracht Frankfurt', 'Freiburg', 'Heidenheim', 'Hoffenheim',
    'Holstein Kiel', 'Mainz 05', 'RB Leipzig', 'St. Pauli', 'Stuttgart',
    'Union Berlin', 'Werder Bremen', 'Wolfsburg',
  ],
  'Ligue 1': [
    'Angers', 'Auxerre', 'Brest', 'Le Havre', 'Lens',
    'Lille', 'Lyon', 'Marseille', 'Monaco', 'Montpellier',
    'Nantes', 'Nice', 'Paris Saint-Germain', 'Reims', 'Rennes',
    'Strasbourg', 'Saint-Étienne', 'Toulouse',
  ],
  'UEFA Champions League': [
    'Arsenal', 'Aston Villa', 'Atalanta', 'Atlético Madrid', 'Barcelona',
    'Bayer Leverkusen', 'Bayern Munich', 'Benfica', 'Borussia Dortmund', 'Brest',
    'Celtic', 'Club Brugge', 'Feyenoord', 'Feyenoord Rotterdam', 'Girona',
    'Inter Milan', 'Juventus', 'RB Leipzig', 'Liverpool', 'Lille',
    'Manchester City', 'AC Milan', 'Monaco', 'Paris Saint-Germain', 'PSV Eindhoven',
    'Real Madrid', 'Red Star Belgrade', 'Salzburg', 'Shakhtar Donetsk', 'Slovan Bratislava',
    'Sparta Prague', 'Sporting CP', 'Sturm Graz', 'Stuttgart', 'Young Boys',
  ],
  'UEFA Europa League': [
    'Ajax', 'Anderlecht', 'Athletic Club', 'Bodø/Glimt', 'Braga',
    'Dynamo Kyiv', 'Eintracht Frankfurt', 'Elfsborg', 'FCSB', 'Fenerbahçe',
    'Ferencváros', 'Galatasaray', 'Hoffenheim', 'Lazio', 'Ludogorets',
    'Lyon', 'Maccabi Tel Aviv', 'FC Midtjylland', 'Nice', 'Olympiacos',
    'PAOK', 'Porto', 'Qarabağ', 'Rangers', 'Real Sociedad',
    'Roma', 'Slavia Prague', 'Tottenham Hotspur', 'Twente', 'Union Saint-Gilloise',
    'Viktoria Plzeň',
  ],
  'MLS': [
    'Atlanta United', 'Austin FC', 'Charlotte FC', 'Chicago Fire', 'FC Cincinnati',
    'Colorado Rapids', 'Columbus Crew', 'FC Dallas', 'D.C. United', 'Houston Dynamo',
    'Inter Miami', 'LA Galaxy', 'Los Angeles FC', 'Minnesota United', 'CF Montréal',
    'Nashville SC', 'New England Revolution', 'New York City FC', 'New York Red Bulls', 'Orlando City',
    'Philadelphia Union', 'Portland Timbers', 'Real Salt Lake', 'San Jose Earthquakes', 'Seattle Sounders',
    'Sporting Kansas City', 'St. Louis City', 'Toronto FC', 'Vancouver Whitecaps',
  ],
  'Brasileirão': [
    'Athletico Paranaense', 'Atlético Mineiro', 'Bahia', 'Botafogo', 'Corinthians',
    'Criciúma', 'Cruzeiro', 'Cuiabá', 'Flamengo', 'Fluminense',
    'Fortaleza', 'Grêmio', 'Internacional', 'Juventude', 'Palmeiras',
    'Red Bull Bragantino', 'São Paulo', 'Vasco da Gama', 'Vitória',
  ],
  'Liga Profesional': [
    'Argentinos Juniors', 'Banfield', 'Barracas Central', 'Belgrano', 'Boca Juniors',
    'Central Córdoba', 'Colón', 'Defensa y Justicia', 'Estudiantes', 'Gimnasia LP',
    'Godoy Cruz', 'Huracán', 'Independiente', 'Independiente Rivadavia', 'Instituto',
    'Lanús', 'Newell\'s Old Boys', 'Platense', 'Racing Club', 'River Plate',
    'Rosario Central', 'San Lorenzo', 'Sarmiento', 'Talleres', 'Tigre',
    'Unión Santa Fe', 'Vélez Sarsfield',
  ],
};

/**
 * Get clubs for a given league.
 * Returns an empty array if the league isn't in our static list.
 */
export function getClubsForLeague(league: string): string[] {
  return LEAGUE_CLUBS[league] || [];
}

/**
 * Get all leagues we have club lists for.
 */
export function getAvailableLeagues(): string[] {
  return Object.keys(LEAGUE_CLUBS);
}