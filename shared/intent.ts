/** The exact message a player signs to authorise one demo trade. Must match on client and server. */
export const tradeIntentMessage = (i: { player: string; side: string; symbol: string; amount: string; unit: string; nonce: string; expires: number }) =>
  `Tickr demo trade\nplayer: ${i.player.toLowerCase()}\nside: ${i.side}\nsymbol: ${i.symbol}\namount: ${i.amount} ${i.unit}\nnonce: ${i.nonce}\nexpires: ${i.expires}`
