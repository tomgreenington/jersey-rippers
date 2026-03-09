/**
 * PSA Comps Fetcher
 * Scrapes PSA Auction Prices page for comparable sales
 */

'use server';

import { load } from 'cheerio';
import type { PSAComp } from '@/types';

/**
 * Fetch PSA auction price comparables for a card
 * Returns array of PSAComp rows or empty array on any error
 */
export async function fetchPSAComps(
  player: string,
  setName: string,
  cardNumber: string,
  year?: number
): Promise<PSAComp[]> {
  try {
    // Build search query
    const searchQuery = `${player} ${setName} ${cardNumber}`;

    // Search PSA
    const searchUrl = `https://www.psacard.com/auctionprices/search?q=${encodeURIComponent(searchQuery)}`;
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      return [];
    }

    const searchHtml = await searchResponse.text();
    const $ = load(searchHtml);

    // Try to find the first result link to the auction prices page
    // PSA search results link to pages like: /auctionprices/baseball/1952-topps/mickey-mantle/11952
    const firstResultLink = $('a[href*="/auctionprices/"]').first().attr('href');

    if (!firstResultLink) {
      return [];
    }

    // Fetch the auction prices page
    const auctionUrl = `https://www.psacard.com${firstResultLink}`;
    const auctionResponse = await fetch(auctionUrl);

    if (!auctionResponse.ok) {
      return [];
    }

    const auctionHtml = await auctionResponse.text();
    const $auction = load(auctionHtml);

    // Parse the "Auction Prices By Grade" table
    // Look for table rows with grade info
    const comps: PSAComp[] = [];

    // PSA typically uses a table with structure like:
    // <tr><td>PSA 10</td><td>$price</td><td>$avgprice</td><td>pop#</td><td>pophigher#</td></tr>
    $auction('table tbody tr').each((_idx, row) => {
      const cells = $(row).find('td');

      if (cells.length >= 5) {
        const grade = $(cells[0]).text().trim();
        const mostRecentText = $(cells[1]).text().trim().replace(/[^0-9.]/g, '');
        const avgText = $(cells[2]).text().trim().replace(/[^0-9.]/g, '');
        const popText = $(cells[3]).text().trim().replace(/[^0-9]/g, '');
        const popHigherText = $(cells[4]).text().trim().replace(/[^0-9]/g, '');

        if (grade) {
          comps.push({
            grade,
            most_recent_price: mostRecentText ? Math.round(parseFloat(mostRecentText) * 100) : null,
            average_price: avgText ? Math.round(parseFloat(avgText) * 100) : null,
            population: popText ? parseInt(popText, 10) : null,
            pop_higher: popHigherText ? parseInt(popHigherText, 10) : null,
          });
        }
      }
    });

    return comps;
  } catch (error) {
    console.error('PSA comps fetch error:', error);
    return [];
  }
}
