import { useState, useEffect, useRef } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface TickerData {
  price: number
  priceChangePercent: number
  high: number
  low: number
  volume: number
}

interface Pair {
  symbol: string
  baseAsset: string
}

// ─── Binance API ───────────────────────────────────────────────────────────────
const BASE = 'https://fapi.binance.com'

async function getPairs(): Promise<Pair[]> {
  const resp = await fetch(`${BASE}/fapi/v1/exchangeInfo`)
  const data = await resp.json()
  return data.symbols
    .filter((s: any) => s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT')
    .map((s: any) => ({ symbol: s.symbol, baseAsset: s.baseAsset }))
}

async function getAllTickers(): Promise<Record<string, TickerData>> {
  const resp = await fetch(`${BASE}/fapi/v1/ticker/24hr`)
  const raw = await resp.json()
  const out: Record<string, TickerData> = {}
  for (const t of raw) {
    out[t.symbol] = {
      price: parseFloat(t.lastPrice),
      priceChangePercent: parseFloat(t.priceChangePercent),
      high: parseFloat(t.highPrice),
      low: parseFloat(t.lowPrice),
      volume: parseFloat(t.volume),
    }
  }
  return out
}

async function getTicker(symbol: string): Promise<TickerData | null> {
  try {
    const resp = await fetch(`${BASE}/fapi/v1/ticker/24hr?symbol=${symbol}`)
    const t = await resp.json()
    return {
      price: parseFloat(t.lastPrice),
      priceChangePercent: parseFloat(t.priceChangePercent),
      high: parseFloat(t.highPrice),
      low: parseFloat(t.lowPrice),
      volume: parseFloat(t.volume),
    }
  } catch {
    return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => v >= 1 ? v.toFixed(2) : v.toFixed(8)
const fmtVol = (v: number) => v >= 1e9 ? (v/1e9).toFixed(2)+'B' : v >= 1e6 ? (v/1e6).toFixed(2)+'M' : v >= 1e3 ? (v/1e3).toFixed(2)+'K' : v.toFixed(2)

// ─── Component ────────────────────────────────────────────────────────────────
export default function App() {
  const [pairs, setPairs] = useState<Pair[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(() => localStorage.getItem('lastPair') || 'BTCUSDT')
  const [filter, setFilter] = useState('')
  const [prices, setPrices] = useState<Record<string, TickerData>>({})
  const [showPicker, setShowPicker] = useState(false)
  const selRef = useRef(selected)
  selRef.current = selected

  // close picker on outside click
  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.picker-panel')) setShowPicker(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showPicker])

  useEffect(() => { localStorage.setItem('lastPair', selected) }, [selected])
  useEffect(() => { getPairs().then(d => { setPairs(d); setLoading(false) }) }, [])
  useEffect(() => {
    getAllTickers().then(setPrices)
    const id = setInterval(() => getAllTickers().then(setPrices), 5000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    const id = setInterval(async () => {
      const sym = selRef.current
      const t = await getTicker(sym)
      if (t) setPrices(p => ({ ...p, [sym]: t }))
    }, 200)
    return () => clearInterval(id)
  }, [])

  const t = prices[selected]
  const pos = !t || t.priceChangePercent >= 0

  const visible = pairs.filter(p =>
    prices[p.symbol] && (
      !filter || p.symbol.toLowerCase().includes(filter.toLowerCase()) || p.baseAsset.toLowerCase().includes(filter.toLowerCase())
    )
  )

  return (
    <div className="h-screen bg-[#0a0a0f] text-white relative overflow-hidden" style={{ scrollbarWidth: 'none' }}>

      {/* ── Left panel: absolute overlay */}
      <div className="absolute inset-0 w-64 flex flex-col pointer-events-none picker-panel">

        <div className="pointer-events-auto">

          {/* Header — always visible */}
          <button
            onClick={() => setShowPicker(v => !v)}
            className="w-full text-left px-4 py-3 hover:bg-[#1a1a28] transition-colors"
          >
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-yellow-400">{selected}</span>
            </div>
            {t && (
              <div className="flex justify-between items-center mt-0.5">
                <span className="text-sm text-white font-mono">${fmt(t.price)}</span>
                <span className={`text-sm font-mono ${pos ? 'text-green-400' : 'text-red-400'}`}>
                  {pos ? '+' : ''}{t.priceChangePercent.toFixed(2)}%
                </span>
              </div>
            )}
          </button>

          {/* Dropdown — floats over main content */}
          {showPicker && (
            <div className="bg-[#0d0d14] max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {/* Sticky search bar */}
              <div className="sticky top-0 z-10 bg-[#0d0d14] p-3 flex items-center gap-2 border-b border-[#2a2a3a]">
                <input
                  autoFocus
                  type="text" placeholder="Search pairs..." value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="flex-1 bg-[#1a1a24] border border-[#2a2a3a] rounded px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400"
                />
                <button onClick={() => { setShowPicker(false); setFilter('') }} className="text-gray-500 hover:text-white text-sm px-2">✕</button>
              </div>
              {/* Pair list */}
              <div>
                {loading ? (
                  <div className="p-4 text-gray-500 text-sm animate-pulse">Loading pairs...</div>
                ) : visible.map(pair => {
                  const p = prices[pair.symbol]
                  const active = pair.symbol === selected
                  return (
                    <button
                      key={pair.symbol}
                      onClick={() => { setSelected(pair.symbol); setShowPicker(false); setFilter('') }}
                      className={`w-full text-left px-4 py-2 hover:bg-[#1a1a28] transition-colors ${active ? 'bg-[#1a1a28] border-l-2 border-l-yellow-400' : ''}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`font-medium text-sm ${active ? 'text-yellow-400' : 'text-white'}`}>{pair.baseAsset}</span>
                        <span className="text-xs text-gray-500 font-mono">USDT</span>
                      </div>
                      {p ? (
                        <div className="flex justify-between items-center mt-0.5">
                          <span className="text-xs text-white font-mono">${fmt(p.price)}</span>
                          <span className={`text-xs font-mono ${p.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {p.priceChangePercent >= 0 ? '+' : ''}{p.priceChangePercent.toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center mt-0.5">
                          <span className="text-xs text-gray-600 font-mono">—</span>
                          <span className="text-xs text-gray-600 font-mono">—</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Main ticker — fills screen behind left panel */}
      <div className="h-full flex flex-col items-center justify-center p-6 pl-72">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-1">{selected}</h1>
          <p className="text-gray-500 text-sm">Binance Futures · USDT-M Perpetual · 200ms</p>
        </div>

        <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-8 w-full max-w-md">
          {t ? (
            <>
              <div className="text-center mb-6">
                <div className={`text-6xl font-mono font-bold ${pos ? 'text-green-400' : 'text-red-400'}`}>${fmt(t.price)}</div>
                <div className={`text-2xl font-mono mt-2 ${pos ? 'text-green-400' : 'text-red-400'}`}>
                  {pos ? '+' : ''}{t.priceChangePercent.toFixed(2)}%
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-gray-500 text-xs uppercase mb-1">24h High</div><div className="text-white font-mono">${fmt(t.high)}</div></div>
                <div><div className="text-gray-500 text-xs uppercase mb-1">24h Low</div><div className="text-white font-mono">${fmt(t.low)}</div></div>
                <div><div className="text-gray-500 text-xs uppercase mb-1">Volume</div><div className="text-white font-mono">{fmtVol(t.volume)}</div></div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-10">
              <div className="animate-pulse text-xl">Loading {selected}...</div>
            </div>
          )}
        </div>

        
      </div>

    </div>
  )
}