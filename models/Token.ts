import mongoose, { Schema } from 'mongoose';

const TokenSchema = new Schema({
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  logoBase64: { type: String, required: true },
  creatorAddress: { type: String, required: true },
  contractAddress: { type: String, default: '' },
  allocations: [{
    tokenSymbol: { type: String, required: true },
    percentage: { type: Number, required: true },
    initialPrice: { type: Number, required: true } // 🚀 Stores the stock price baseline
  }],
  usdAllocation: { type: Number, required: true }
});

export default mongoose.models.Token || mongoose.model('Token', TokenSchema);