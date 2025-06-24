import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';

interface TournamentData {
  tournamentId: string;
  tournamentName: string;
  buyIn: number;
  reEntries: number;
  totalBuyIn: number;
  position: number;
  totalPlayers: number;
  topPercentage: number;
  winnings: number;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'File must be a .zip file' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Extract zip file
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    const allTournaments: TournamentData[] = [];

    // Process each file in the zip
    for (const entry of zipEntries) {
      if (!entry.isDirectory) {
        const content = entry.getData().toString('utf8');
        const tournaments = parseTournamentData(content);
        allTournaments.push(...tournaments);
      }
    }

    // Calculate totals
    const totalWinnings = Math.round(allTournaments.reduce((sum, t) => sum + t.winnings, 0) * 100) / 100;
    const totalBuyIns = Math.round(allTournaments.reduce((sum, t) => sum + t.totalBuyIn, 0) * 100) / 100;
    const netProfit = Math.round((totalWinnings - totalBuyIns) * 100) / 100;
    
    // Calculate tournaments with winnings
    const tournamentsWithWinnings = allTournaments.filter(t => t.winnings > 0).length;
    
    // Group by buy-in categories
    const buyInCategories: { [key: string]: { tournaments: TournamentData[], totalBuyIn: number, totalWinnings: number, count: number } } = {};
    
    allTournaments.forEach(tournament => {
      const buyInKey = `$${tournament.buyIn.toFixed(2)}`;
      if (!buyInCategories[buyInKey]) {
        buyInCategories[buyInKey] = {
          tournaments: [],
          totalBuyIn: 0,
          totalWinnings: 0,
          count: 0
        };
      }
      buyInCategories[buyInKey].tournaments.push(tournament);
      buyInCategories[buyInKey].totalBuyIn = Math.round((buyInCategories[buyInKey].totalBuyIn + tournament.totalBuyIn) * 100) / 100;
      buyInCategories[buyInKey].totalWinnings = Math.round((buyInCategories[buyInKey].totalWinnings + tournament.winnings) * 100) / 100;
      buyInCategories[buyInKey].count += 1;
    });

    return NextResponse.json({
      success: true,
      totalTournaments: allTournaments.length,
      tournaments: allTournaments,
      summary: {
        totalWinnings,
        totalBuyIns,
        netProfit,
        tournamentsWithWinnings,
        winRate: allTournaments.length > 0 ? (tournamentsWithWinnings / allTournaments.length) * 100 : 0
      },
      buyInCategories
    });

  } catch (error) {
    console.error('Error processing zip file:', error);
    return NextResponse.json(
      { error: 'Error processing zip file' },
      { status: 500 }
    );
  }
}

function parseTournamentData(content: string): TournamentData[] {
  const tournaments: TournamentData[] = [];
  
  // Split content by tournament blocks (separated by ----)
  const tournamentBlocks = content.split('----').filter(block => block.trim());
  
  for (const block of tournamentBlocks) {
    const lines = block.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) continue;
    
    try {
      // Parse tournament header line
      const headerMatch = lines[0].match(/Tournament #(\d+), (.+), Hold'em No Limit/);
      if (!headerMatch) continue;
      
      const tournamentId = headerMatch[1];
      const tournamentName = headerMatch[2];
      
      // Parse buy-in
      const buyInMatch = lines[1].match(/Buy-in: (.+)/);
      if (!buyInMatch) continue;
      
      // Extract all dollar amounts from buy-in string
      const buyInParts = buyInMatch[1].match(/\$([\d.]+)/g);
      if (!buyInParts) continue;
      
      // Sum all parts
      const buyIn = Math.round(buyInParts.reduce((sum, part) => {
        return sum + parseFloat(part.replace('$', ''));
      }, 0) * 100) / 100;
      
      // Parse total players
      const playersMatch = lines[2].match(/(\d+) Players/);
      const totalPlayers = playersMatch ? parseInt(playersMatch[1]) : 0;
      
      // Parse position and winnings
      let position = 0;
      let winnings = 0;
      let reEntries = 0;
      
      for (const line of lines) {
        // Look for position line
        const positionMatch = line.match(/(\d+)(?:st|nd|rd|th)\s*:\s*Hero/);
        if (positionMatch) {
          position = parseInt(positionMatch[1]);
        }
        
        // Look for winnings line
        const winningsMatch = line.match(/received a total of \$([\d,]+)/);
        if (winningsMatch) {
          winnings = Math.round(parseFloat(winningsMatch[1].replace(/,/g, '')) * 100) / 100;
        }
        
        // Look for re-entries
        const reEntriesMatch = line.match(/made (\d+) re-entries/);
        if (reEntriesMatch) {
          reEntries = parseInt(reEntriesMatch[1]);
        }
      }
      
      // Calculate total buy-in (including re-entries)
      const totalBuyIn = Math.round(buyIn * (1 + reEntries) * 100) / 100;
      
      // Calculate top percentage
      const topPercentage = totalPlayers > 0 ? (position / totalPlayers) * 100 : 0;
      
      tournaments.push({
        tournamentId,
        tournamentName,
        buyIn,
        reEntries,
        totalBuyIn,
        position,
        totalPlayers,
        topPercentage,
        winnings
      });
      
    } catch (error) {
      console.error('Error parsing tournament block:', error);
      continue;
    }
  }
  
  return tournaments;
} 