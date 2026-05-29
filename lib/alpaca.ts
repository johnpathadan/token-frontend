import axios from 'axios';

export async function getAlpacaStockPrice(ticker: string): Promise<string> {
  try {
    const uppercaseTicker = ticker.toUpperCase();
    if (uppercaseTicker === 'USD' || uppercaseTicker === 'CASH') return '1.00';

    const response = await axios.get(
      `https://data.sandbox.alpaca.markets/v2/stocks/${uppercaseTicker}/trades/latest`,
      {
        headers: {
          'APCA-API-KEY-ID': process.env.ALPACA_API_KEY || '',
          'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY || '',
        }
      }
    );
    return response.data.trade.p.toString();
  } catch (error) {
    console.error(`Alpaca fallback triggered for ${ticker}. Using $1.`);
    return '1.00'; 
  }
}