'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ethers } from 'ethers';
import Link from 'next/link';

const TOP_20_STOCKS = [
  'AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'NFLX', 'AMD', 'BABA',
  'V', 'WMT', 'JPM', 'UNH', 'MA', 'PG', 'XOM', 'JNJ', 'HD', 'COST'
];

function WizardFormContent() {
  const searchParams = useSearchParams();
  const urlIdParam = searchParams.get('id');

  const [step, setStep] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true); 
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [logoBase64, setLogoBase64] = useState('');

  const [allocations, setAllocations] = useState<{ tokenSymbol: string; percentage: number }[]>([]);
  const [usdAllocation, setUsdAllocation] = useState(100);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [deployedAddress, setDeployedAddress] = useState('');
  const [mongoTokenId, setMongoTokenId] = useState('');
  const [livePrice, setLivePrice] = useState<number>(1.00);

  // Auto-Connection & Session Memory Hook
  useEffect(() => {
    const checkActiveWalletSession = async () => {
      if ((window as any).ethereum) {
        try {
          const cachedAddress = localStorage.getItem('synthetic_wallet_address');
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
          
          if (accounts && accounts.length > 0) {
            setUserAddress(accounts[0]);
            setWalletConnected(true);
            localStorage.setItem('synthetic_wallet_address', accounts[0]);
          } else if (cachedAddress) {
            setUserAddress(cachedAddress);
            setWalletConnected(true);
          }
        } catch (err) {
          console.error("Silent wallet session recovery check failed:", err);
        }
      }
      setIsInitializing(false);
    };
    checkActiveWalletSession();
  }, []);

  // Sync and pre-load database entries once the wallet state is validated
  useEffect(() => {
    if (!urlIdParam || !walletConnected) return;

    const preLoadExistingTokenDetails = async () => {
      try {
        const res = await fetch(`/api/tokens/calculate-price?id=${urlIdParam}`);
        const data = await res.json();
        
        if (data.name) {
          setMongoTokenId(urlIdParam);
          setName(data.name);
          setSymbol(data.symbol);
          setLogoBase64(data.logoBase64);
          setDeployedAddress(data.contractAddress);
          setAllocations(data.driftedAllocations);
          setUsdAllocation(data.driftedUsdAllocation);
          setHasGenerated(true);
          setStep(2); 
        }
      } catch (err) {
        console.error("Failed to pre-load allocation settings from database:", err);
      }
    };

    preLoadExistingTokenDetails();
  }, [urlIdParam, walletConnected]);

  const handleWalletLink = async () => {
    if ((window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts && accounts.length > 0) {
          setUserAddress(accounts[0]);
          setWalletConnected(true);
          localStorage.setItem('synthetic_wallet_address', accounts[0]);
        }
      } catch (err) {
        console.error("User cancelled link sequence:", err);
      }
    } else {
      alert("Please initialize a browser wallet extension.");
    }
  };

  const parseUploadedIconFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const activeAllocatedWeightSum = allocations.reduce((sum, item) => sum + item.percentage, 0);
    setUsdAllocation(100 - activeAllocatedWeightSum);
  }, [allocations]);

  useEffect(() => {
    if (step !== 3 || !mongoTokenId) return;

    const queryLiveEnginePrice = async () => {
      try {
        const res = await fetch(`/api/tokens/calculate-price?id=${mongoTokenId}`);
        const data = await res.json();
        if (data.price) {
          setLivePrice(data.price);
        }
      } catch (err) {
        console.error("Pricing fetch failure: ", err);
      }
    };

    queryLiveEnginePrice();
    const tickerThreadInstance = setInterval(queryLiveEnginePrice, 5000);

    return () => clearInterval(tickerThreadInstance);
  }, [step, mongoTokenId]);

  const handleModifyReallocateClick = async () => {
    try {
      const res = await fetch(`/api/tokens/calculate-price?id=${mongoTokenId}`);
      const data = await res.json();
      if (data.driftedAllocations) {
        setAllocations(data.driftedAllocations);
        setUsdAllocation(data.driftedUsdAllocation);
      }
      setStep(2);
    } catch (err) {
      console.error("Could not load drifted allocations:", err);
      setStep(2);
    }
  };

  // 🚀 Modified Add Handler: Picks the next unassigned stock ticker and populates an inline row instantly
  const addAssetRow = () => {
    if (usdAllocation <= 0) {
      alert("No available tracking space remaining! Convert active holdings back to USD to expand.");
      return;
    }

    // Identify the first stock ticker option that hasn't been added to the allocation map yet
    const availableStock = TOP_20_STOCKS.find(
      stock => !allocations.some(item => item.tokenSymbol === stock)
    );

    if (!availableStock) {
      alert("All available top 20 stocks have already been assigned to your index portfolio.");
      return;
    }

    setAllocations([...allocations, { tokenSymbol: availableStock, percentage: 1 }]);
  };

  // 🚀 New Inline Event Listener: Handles switching tickers from inside the active card rows
  const handleInlineTickerChange = (index: number, newSymbol: string) => {
    if (allocations.some((item, i) => item.tokenSymbol === newSymbol && i !== index)) {
      alert("This stock ticker is already assigned to another allocation track row.");
      return;
    }
    const workingSet = [...allocations];
    workingSet[index].tokenSymbol = newSymbol;
    setAllocations(workingSet);
  };

  const adjustPercentageSlider = (index: number, val: number) => {
    const workingSet = [...allocations];
    const trackingComplementarySum = workingSet.reduce((s, item, i) => i === index ? s : s + item.percentage, 0);
    
    if (trackingComplementarySum + val > 100) {
      workingSet[index].percentage = 100 - trackingComplementarySum;
    } else {
      workingSet[index].percentage = val;
    }
    setAllocations(workingSet);
  };

  const convertPositionToUsd = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const dispatchTokenGenerationCycle = async () => {
    const simulatedProxyAddress = deployedAddress || "0x" + Math.random().toString(16).substring(2, 42);
    setDeployedAddress(simulatedProxyAddress);

    const res = await fetch('/api/tokens/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: mongoTokenId || undefined,
        name, symbol, logoBase64, creatorAddress: userAddress,
        allocations, usdAllocation, contractAddress: simulatedProxyAddress
      })
    });
    
    const data = await res.json();
    if (data.success) {
      if (!mongoTokenId) setMongoTokenId(data.tokenId);
      setHasGenerated(true);
      setStep(3);
    }
  };

  const pctChange = (livePrice - 1.00) * 100;

  if (isInitializing) {
    return (
      <div className="p-8 max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl mt-16 shadow-md text-center text-sm font-medium text-slate-400 animate-pulse">
        Restoring wallet authorization session credentials...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl mt-16 shadow-md text-slate-800">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-indigo-600 tracking-tight">Equity Token Synthesizer</h1>
        <Link href="/tokens" className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg font-medium transition">
          View All Tokens 📋
        </Link>
      </div>
      
      {!walletConnected ? (
        <button onClick={handleWalletLink} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-semibold transition shadow-sm">
          Connect Identity Wallet
        </button>
      ) : (
        <div>
          <p className="text-xs text-center font-mono text-slate-400 mb-4">Operator: {userAddress}</p>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <input type="text" placeholder="Token Name" value={name} onChange={e=>setName(e.target.value)} className="w-full p-2.5 border rounded-lg" />
              <input type="text" placeholder="Symbol" value={symbol} onChange={e=>setSymbol(e.target.value)} className="w-full p-2.5 border rounded-lg" />
              <div className="border border-dashed p-4 rounded-lg bg-slate-50 text-center">
                <input type="file" accept="image/*" onChange={parseUploadedIconFile} className="w-full text-xs" />
              </div>
              <button onClick={()=>setStep(2)} disabled={!name || !symbol} className="w-full bg-slate-900 text-white py-2.5 rounded-xl disabled:opacity-40">
                Configure Allocation Matrix →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              {/* 🚀 UI Change: Global dropdown is removed. Only the action button remains visible at first. */}
              <div className="flex justify-center">
                <button 
                  onClick={addAssetRow} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-sm"
                >
                  ＋ Add Ticker Track
                </button>
              </div>

              {/* Allocation List Pipeline */}
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {allocations.map((asset, index) => (
                  <div key={index} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      
                      {/* 🚀 UI Change: Selection Dropdown menu is now contextually made available here inside the row along with the slider! */}
                      <select 
                        value={asset.tokenSymbol} 
                        onChange={(e) => handleInlineTickerChange(index, e.target.value)}
                        className="p-1.5 border border-slate-300 rounded-lg bg-white font-bold text-xs text-slate-700 focus:outline-indigo-500 shadow-sm"
                      >
                        {TOP_20_STOCKS.map(tickerOption => {
                          const isAssignedElsewhere = allocations.some((a, i) => a.tokenSymbol === tickerOption && i !== index);
                          return (
                            <option key={tickerOption} value={tickerOption} disabled={isAssignedElsewhere}>
                              {tickerOption} Asset Weight
                            </option>
                          );
                        })}
                      </select>

                      <span className="text-indigo-600 font-bold font-mono text-sm">{asset.percentage}%</span>
                    </div>

                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={asset.percentage} 
                      onChange={e=>adjustPercentageSlider(index, parseInt(e.target.value))} 
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none" 
                    />

                    <div className="pt-1">
                      <button 
                        onClick={()=>convertPositionToUsd(index)} 
                        className="text-[11px] bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-md font-semibold transition"
                      >
                        Convert To USD
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* USD Anchor Level Box */}
              <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
                <div className="flex justify-between text-sm font-bold text-slate-700">
                  <span>USD Cash Pool (Residual Anchor)</span>
                  <span>{usdAllocation}%</span>
                </div>
                <input type="range" disabled value={usdAllocation} className="w-full mt-2 accent-slate-400 opacity-60" />
              </div>

              <div className="flex gap-2">
                <button onClick={() => { window.location.href = '/tokens'; }} className="w-1/4 border border-slate-300 bg-white hover:bg-slate-50 py-2.5 rounded-xl text-sm font-medium transition">
                  Cancel
                </button>
                <button onClick={dispatchTokenGenerationCycle} className="w-3/4 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold shadow-sm transition">
                  {hasGenerated ? 'Update Allocation' : 'Generate Token'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-mono text-xs break-all border border-emerald-100">
                Proxy Address: {deployedAddress}
              </div>

              {logoBase64 && (
                <img src={logoBase64} alt="Avatar" className="w-16 h-16 mx-auto rounded-full object-cover shadow" />
              )}

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                  Calculated Dynamic NAV Price
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </h3>
                <div className="text-4xl font-black text-slate-900 mt-1">${livePrice.toFixed(4)}</div>
                <div className={`text-sm font-bold mt-1 ${pctChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
                </div>
              </div>

              <button onClick={handleModifyReallocateClick} className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-medium">
                Modify & Reallocate Engine Matrix
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TokenWizard() {
  return (
    <Suspense fallback={<div className="text-center p-20 text-slate-400">Loading layout parameters...</div>}>
      <WizardFormContent />
    </Suspense>
  );
}