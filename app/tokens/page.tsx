'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Spinner } from "@/components/ui/spinner";

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

function truncateAddress(addr: string) {
  return addr ? `${addr.slice(0, 7)}...` : '0x000...';
}

export default function TokensDirectory() {
  const [tokens, setTokens] = useState<TokenDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllDirectoryTokens = async () => {
      try {
        const res = await fetch('/api/tokens');
        const data = await res.json();
        if (data.success) setTokens(data.tokens);
      } catch (err) {
        console.error("Failed to load registry parameters:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllDirectoryTokens();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto mt-12 text-slate-800">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">List Of Tokens</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time value tracked via the Alpaca Market API</p>
        </div>
        <Link href="/create" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow transition">
          Create A Token
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 flex justify-center items-center">
          <Spinner className="size-8 text-black" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white p-6">
          <p className="text-sm text-slate-400 font-medium">No tokens have been generated yet.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse min-w-175">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Asset Name / Symbol</th>
                <th className="py-4 px-6 text-right">Live Price</th>
                <th className="py-4 px-6 text-right">Change (Since Mint)</th>
                <th className="py-4 px-6">Creator</th>
                <th className="py-4 px-6 text-center" colSpan={2}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {tokens.map((token) => {
                const isPositive = token.percentageChange >= 0;
                return (
                  <tr key={token.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        {token.logoBase64 ? (
                          <img src={token.logoBase64} alt={token.name} className="w-8 h-8 rounded-full object-cover border bg-slate-50" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xs">
                            {token.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{token.name}</span>
                          <span className="text-xs font-mono font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {token.symbol}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right font-mono font-bold text-slate-900">
                      ${token.price.toFixed(4)}
                    </td>

                    <td className={`py-4 px-6 text-right font-bold font-mono ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPositive ? '▲ +' : '▼ '}{token.percentageChange.toFixed(2)}%
                    </td>

                    <td className="py-4 px-6 font-mono text-xs text-slate-500" title={token.creatorAddress}>
                      {truncateAddress(token.creatorAddress)}
                    </td>

                    <td className="py-4 px-3 text-center">
                      <Link
                        href={`/create?id=${token.id}`}
                        className="inline-block bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-xl transition shadow-sm"
                      >
                        Modify Allocation
                      </Link>
                    </td>

                    <td className="py-4 pr-6 pl-3 text-center">
                      <button
                        onClick={() => alert(`Prototype Mode: Market buy interface for ${token.symbol} is currently disabled.`)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                      >
                        Buy
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
