import axios from 'axios';

export async function getAlpacaStockPrice(ticker: string): Promise<string> {
  try {
    const uppercaseTicker = ticker.toUpperCase();
    if (uppercaseTicker === 'USD' || uppercaseTicker === 'CASH') return '1.00';

    const response = await axios.get(
      `https://data.alpaca.markets/v2/stocks/${uppercaseTicker}/trades/latest?feed=iex`,
      {
        headers: {
          'APCA-API-KEY-ID': process.env.ALPACA_API_KEY || '',
          'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY || '',
        }
      }
    );
    console.log(response.data);
    return response.data.trade.p.toString();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `Alpaca fallback triggered for ${ticker}. Using $1.`,
        {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        }
      );
    } else {
      console.error(`Alpaca fallback triggered for ${ticker}. Using $1.`, error);
    }
    return '1.00'; 
  }
}
