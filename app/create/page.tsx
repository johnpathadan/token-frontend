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
  const [isInitializing, setIsInitializing] = useState(true); // Gated shield
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [logoBase64, setLogoBase64] = useState('');

  const [allocations, setAllocations] = useState<{ tokenSymbol: string; percentage: number }[]>([]);
  const [selectedAsset, setSelectedAsset] = useState(TOP_20_STOCKS[0]);
  const [usdAllocation, setUsdAllocation] = useState(100);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [deployedAddress, setDeployedAddress] = useState('');
  const [mongoTokenId, setMongoTokenId] = useState('');
  const [livePrice, setLivePrice] = useState<number>(1.00);

  // 🚀 Unified Lifecycle Pipeline: Handles wallet verification and database preloads sequentially
  useEffect(() => {
    const initializeApplicationWorkspace = async () => {
      let activeSessionAddress = '';
      let isSessionAuthorized = false;

      // 1. Resolve Wallet Connection Session Context
      if ((window as any).ethereum) {
        try {
          const cachedAddress = localStorage.getItem('synthetic_wallet_address');
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
          
          if (accounts && accounts.length > 0) {
            activeSessionAddress = accounts[0];
            isSessionAuthorized = true;
            setUserAddress(accounts[0]);
            setWalletConnected(true);
            localStorage.setItem('synthetic_wallet_address', accounts[0]);
          } else if (cachedAddress) {
            activeSessionAddress = cachedAddress;
            isSessionAuthorized = true;
            setUserAddress(cachedAddress);
            setWalletConnected(true);
          }
        } catch (err) {
          console.error("Silent wallet session recovery check failed:", err);
        }
      }

      // 2. Fetch and Preload Stock Document Allocations BEFORE dropping the loading gate
      if (urlIdParam && isSessionAuthorized) {
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
            
            // 🚀 Force change to Step 2 while the loading shield is still up!
            setStep(2); 
          }
        } catch (err) {
          console.error("Failed to pre-load allocation settings from database:", err);
        }
      }

      // 3. Everything is prepared and configured. Safe to lower the loading shield.
      setIsInitializing(false);
    };

    initializeApplicationWorkspace();
  }, [urlIdParam]);

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

  const addAssetRow = () => {
    if (usdAllocation <= 0) {
      alert("No available space! Convert tracking items back to USD.");
      return;
    }
    if (allocations.find(item => item.tokenSymbol === selectedAsset)) return;
    setAllocations([...allocations, { tokenSymbol: selectedAsset, percentage: 1 }]);
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
              <div className="flex gap-2">
                <select value={selectedAsset} onChange={e=>setSelectedAsset(e.target.value)} className="flex-1 p-2.5 border rounded-lg bg-white">
                  {TOP_20_STOCKS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={addAssetRow} className="bg-emerald-600 text-white px-5 rounded-lg text-sm font-medium">Add Ticker</button>
              </div>

              <div className="space-y-4 max-h-64 overflow-y-auto">
                {allocations.map((asset, index) => (
                  <div key={asset.tokenSymbol} className="p-4 border rounded-xl bg-slate-50 space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span>{asset.tokenSymbol} Weight</span>
                      <span className="text-indigo-600">{asset.percentage}%</span>
                    </div>
                    <input type="range" min="1" max="100" value={asset.percentage} onChange={e=>adjustPercentageSlider(index, parseInt(e.target.value))} className="w-full accent-indigo-600" />
                    <button onClick={()=>convertPositionToUsd(index)} className="text-xs bg-amber-500 text-white px-3 py-1 rounded-md font-medium">
                      Convert To USD
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-100 border rounded-xl">
                <div className="flex justify-between text-sm font-bold text-slate-700">
                  <span>USD Cash Pool (Residual Anchor)</span>
                  <span>{usdAllocation}%</span>
                </div>
                <input type="range" disabled value={usdAllocation} className="w-full mt-2 accent-slate-400 opacity-60" />
              </div>

              <div className="flex gap-2">
                <button onClick={() => { window.location.href = '/tokens'; }} className="w-1/4 border py-2.5 rounded-xl">
                  Cancel
                </button>
                <button onClick={dispatchTokenGenerationCycle} className="w-3/4 bg-indigo-600 text-white py-2.5 rounded-xl font-bold shadow-sm">
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