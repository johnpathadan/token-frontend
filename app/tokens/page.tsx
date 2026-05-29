'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TokenDirectoryItem {
  id: string;
  name: string;
  symbol: string;
  logoBase64: string;
  creatorAddress: string;
  contractAddress: string;
  price: number;
  percentageChange: number;
}

export default function TokensDirectory() {
  const [tokens, setTokens] = useState<TokenDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllDirectoryTokens = async () => {
      try {
        const res = await fetch('/api/tokens');
        const data = await res.json();
        if (data.success) {
          setTokens(data.tokens);
        }
      } catch (err) {
        console.error("Failed to load registry parameters:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllDirectoryTokens();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto mt-12 text-slate-800">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Synthetic Asset Index Registry</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time valuation index tracked via the Alpaca Market API Engine</p>
        </div>
        <Link href="/create" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow transition">
          ← Create Token Studio
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm font-medium text-slate-400 animate-pulse">
          Querying secure vault databases and evaluating live price changes...
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white p-6">
          <p className="text-sm text-slate-400 font-medium">No synthetic asset structures have been generated yet.</p>
          <Link href="/create" className="mt-3 inline-block text-xs font-bold text-indigo-600 hover:underline">
            Launch the first synthetic token index baseline now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tokens.map((token) => (
            <div key={token.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {token.logoBase64 ? (
                      <img src={token.logoBase64} alt={token.name} className="w-10 h-10 rounded-full object-cover border bg-slate-50" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm">
                        {token.symbol.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-slate-900 leading-tight">{token.name}</h2>
                      <span className="text-xs font-mono font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {token.symbol}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-slate-900">${token.price.toFixed(4)}</div>
                    {/* 🚀 Red/Green Color Selection Based on Sign Variant Values */}
                    <div className={`text-xs font-bold mt-0.5 ${token.percentageChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {token.percentageChange >= 0 ? '+' : ''}{token.percentageChange.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Creator Account Address:</span>
                    <span className="text-slate-600 truncate max-w-[180px]" title={token.creatorAddress}>
                      {token.creatorAddress}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deployment Contract:</span>
                    <span className="text-slate-600 truncate max-w-[180px]" title={token.contractAddress}>
                      {token.contractAddress}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}