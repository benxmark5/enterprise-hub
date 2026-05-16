"use client";
import { useState } from 'react';
import { 
  ArrowLeft, Send, Zap, 
  TrendingUp, Clock, CheckCircle 
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';

export default function AviatorCMD() {
  const [entryPoint, setEntryPoint] = useState(1.20);
  const [exitPoint, setExitPoint] = useState(2.00);
  const [confidence, setConfidence] = useState(75);
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState(5.00);
  const [loading, setLoading] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  const risk = exitPoint <= 2 
    ? 'LOW' : exitPoint <= 5 
    ? 'MEDIUM' : 'HIGH';

  const riskColor = risk === 'LOW' 
    ? 'text-green-400' : risk === 'MEDIUM' 
    ? 'text-yellow-400' : 'text-red-400';

  const handleDispatch = async () => {
    if (exitPoint <= entryPoint) {
      alert('Exit must be higher than entry!');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('markets')
        .insert([{
          name: `AVIATOR SIGNAL Entry:${entryPoint}x Exit:${exitPoint}x`,
          market_type: 'aviator',
          entry_point: entryPoint,
          exit_point: exitPoint,
          confidence: confidence,
          signal_notes: notes,
          odds: exitPoint,
          price: price,
          status: 'live',
          is_live: true,
          league_name: 'AVIATOR',
          home_team: `Entry ${entryPoint}x`,
          away_team: `Exit ${exitPoint}x`,
        }]);
      if (error) throw error;
      setDispatched(true);
      setTimeout(() => setDispatched(false), 3000);
      setNotes('');
      alert(
        `🚀 Signal Dispatched!\n` +
        `Entry: ${entryPoint}x\n` +
        `Exit: ${exitPoint}x\n` +
        `Confidence: ${confidence}%`
      );
    } catch (e) {
      alert('Error: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Header */}
        <Link href="/"
          className="flex items-center text-zinc-500 
            hover:text-red-400 text-[10px] font-bold 
            tracking-widest uppercase transition-colors">
          <ArrowLeft size={14} className="mr-2" />
          Return to Hub
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Zap className="text-red-500" size={28} />
          <div>
            <h1 className="text-4xl font-black italic 
              tracking-tighter text-red-500 uppercase">
              AVIATOR_CMD
            </h1>
            <p className="text-xs text-zinc-500 uppercase 
              tracking-widest">
              Signal Dispatch Center
            </p>
          </div>
        </div>

        {/* Entry Point */}
        <div className="bg-zinc-900/50 border border-zinc-800 
          rounded-xl p-5">
          <p className="text-[10px] font-bold uppercase 
            tracking-widest text-zinc-500 mb-2">
            🟢 Entry Point — When To Join
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.01"
              min="1.01"
              value={entryPoint}
              onChange={e =>
                setEntryPoint(parseFloat(e.target.value) || 1.01)
              }
              className="bg-zinc-950 border border-zinc-700 
                text-green-400 text-4xl font-black font-mono 
                p-4 rounded-xl w-full text-center"
            />
            <span className="text-green-400 text-2xl font-black">
              x
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            Client should enter when multiplier reaches this point
          </p>
        </div>

        {/* Exit Point */}
        <div className="bg-zinc-900/50 border border-zinc-800 
          rounded-xl p-5">
          <p className="text-[10px] font-bold uppercase 
            tracking-widest text-zinc-500 mb-2">
            🔴 Exit Point — When To Cash Out
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.01"
              min="1.01"
              value={exitPoint}
              onChange={e =>
                setExitPoint(parseFloat(e.target.value) || 1.01)
              }
              className="bg-zinc-950 border border-zinc-700 
                text-red-400 text-4xl font-black font-mono 
                p-4 rounded-xl w-full text-center"
            />
            <span className="text-red-400 text-2xl font-black">
              x
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            Client must cash out before this multiplier
          </p>
        </div>

        {/* Stats Row */}
        <div className="bg-zinc-900/50 border border-zinc-800 
          rounded-xl p-4">
          <div className="grid grid-cols-3 gap-4 text-center 
            font-mono">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Range</p>
              <p className="text-white font-black text-sm">
                {entryPoint}x → {exitPoint}x
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">
                Profit
              </p>
              <p className="text-green-400 font-black">
                +{((exitPoint / entryPoint - 1) * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Risk</p>
              <p className={`font-black ${riskColor}`}>{risk}</p>
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div className="bg-zinc-900/50 border border-zinc-800 
          rounded-xl p-5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-bold uppercase 
              tracking-widest text-zinc-500">
              Signal Confidence
            </p>
            <span className={`text-lg font-black ${
              confidence >= 70 ? 'text-green-400'
              : confidence >= 50 ? 'text-yellow-400'
              : 'text-red-400'
            }`}>
              {confidence}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="99"
            value={confidence}
            onChange={e => setConfidence(parseInt(e.target.value))}
            className="w-full accent-red-500"
            aria-label="Confidence level"
          />
          <div className="flex justify-between text-xs 
            text-zinc-600 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Price */}
        <div className="bg-zinc-900/50 border border-zinc-800 
          rounded-xl p-5">
          <p className="text-[10px] font-bold uppercase 
            tracking-widest text-zinc-500 mb-3">
            Signal Price ($)
          </p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[5, 10, 20, 50].map(p => (
              <button
                key={p}
                onClick={() => setPrice(p)}
                className={`py-3 rounded-xl font-black 
                  text-sm transition-all ${
                  price === p
                    ? 'bg-red-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                ${p}
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.50"
            value={price}
            onChange={e =>
              setPrice(parseFloat(e.target.value) || 0)
            }
            className="bg-zinc-950 border border-zinc-700 
              text-white text-xl font-mono p-3 rounded-lg w-full"
            placeholder="Custom price"
          />
        </div>

        {/* Notes */}
        <div className="bg-zinc-900/50 border border-zinc-800 
          rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-zinc-500" />
            <p className="text-[10px] font-bold uppercase 
              tracking-widest text-zinc-500">
              Analysis Notes
            </p>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Pattern detected, timing analysis, round history..."
            className="w-full bg-zinc-950 border border-zinc-700 
              text-white p-3 rounded-lg text-sm resize-none 
              placeholder:text-zinc-600"
            rows={4}
          />
        </div>

        {/* Summary */}
        <div className="bg-red-500/10 border border-red-500/30 
          rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-red-400" />
            <p className="text-xs font-bold uppercase 
              tracking-widest text-red-400">
              Signal Summary
            </p>
          </div>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-400">Entry Point</span>
              <span className="text-green-400 font-black">
                {entryPoint}x
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Exit Point</span>
              <span className="text-red-400 font-black">
                {exitPoint}x
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Profit Potential</span>
              <span className="text-green-400 font-black">
                +{((exitPoint / entryPoint - 1) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Price</span>
              <span className="text-yellow-400 font-black">
                ${price}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Confidence</span>
              <span className={`font-black ${
                confidence >= 70 
                  ? 'text-green-400' 
                  : 'text-yellow-400'
              }`}>
                {confidence}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Risk Level</span>
              <span className={`font-black ${riskColor}`}>
                {risk}
              </span>
            </div>
          </div>
        </div>

        {/* Dispatch Button */}
        <button
          onClick={handleDispatch}
          disabled={loading || dispatched}
          className={`w-full py-5 rounded-xl font-black 
            uppercase tracking-wider flex items-center 
            justify-center gap-3 text-sm transition-all
            ${dispatched
              ? 'bg-green-600 text-white'
              : 'bg-red-600 hover:bg-red-500 text-white'
            } disabled:opacity-70`}
        >
          {loading ? (
            <span className="animate-pulse">Dispatching...</span>
          ) : dispatched ? (
            <>
              <CheckCircle size={20} />
              Signal Sent To Public!
            </>
          ) : (
            <>
              <Send size={20} />
              Dispatch Aviator Signal
            </>
          )}
        </button>

        <div className="h-10" />
      </div>
    </div>
  );
}