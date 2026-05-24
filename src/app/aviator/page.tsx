"use client";
import { useState, useRef } from 'react';
import { supabase } from '@/app/supabase';
import {
  Upload, Zap, Send, RefreshCw,
  CheckCircle, AlertTriangle, Eye
} from 'lucide-react';

type AiSignal = {
  entry_point: number;
  exit_point: number;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  signal_notes: string;
  suggested_price: number;
};

type DispatchedSignal = {
  id: string;
  entry_point: number;
  exit_point: number;
  confidence: number;
  signal_notes: string;
  price: number;
  created_at: string;
  expires_at: string;
};

export default function AviatorAdminPage() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [signals, setSignals] = useState<AiSignal[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [liveSignals, setLiveSignals] = useState
    DispatchedSignal[]
  >([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setSignals([]);
      setError('');
      setDispatched(false);
    };
    reader.readAsDataURL(file);
  };

  const analyzePattern = async () => {
    if (!image || !imageFile) return;
    setAnalyzing(true);
    setError('');

    try {
      // Convert to base64
      const base64 = image.split(',')[1];
      const mediaType = imageFile.type as
        'image/jpeg' | 'image/png' | 'image/webp';

      const response = await fetch(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64,
                  }
                },
                {
                  type: 'text',
                  text: `You are an Aviator game pattern analyst. 
Analyze this Aviator game pattern/history screenshot.
Based on the multiplier patterns you can see, identify 3-5 optimal trading signals.

For each signal respond ONLY with valid JSON array, no other text:
[
  {
    "entry_point": 1.20,
    "exit_point": 3.50,
    "confidence": 78,
    "risk_level": "MEDIUM",
    "signal_notes": "Pattern shows consistent growth to 3x range",
    "suggested_price": 3.00
  }
]

Rules:
- entry_point: between 1.01 and 2.00
- exit_point: between 1.5 and 15.0, always higher than entry
- confidence: 60-95
- risk_level: LOW (exit < 2x), MEDIUM (2x-5x), HIGH (>5x)
- signal_notes: brief analysis explanation
- suggested_price: 3.00 for single, 10.00 for 4-pack pattern

Return ONLY the JSON array, no markdown, no explanation.`
                }
              ]
            }]
          })
        }
      );

      const data = await response.json();
      const text = data.content?.[0]?.text || '[]';

      // Clean and parse
      const clean = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed: AiSignal[] = JSON.parse(clean);
      setSignals(parsed);

    } catch (e) {
      setError('Analysis failed. Try a clearer screenshot.');
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateSignal = (
    idx: number, 
    field: keyof AiSignal, 
    value: number | string
  ) => {
    setSignals(prev => prev.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s
    ));
  };

  const dispatchAll = async () => {
    if (signals.length === 0) return;
    setDispatching(true);

    try {
      const expiresAt = new Date(
        Date.now() + 2 * 60 * 60 * 1000
      ).toISOString();

      const records = signals.map(s => ({
        name: `AVIATOR - Signal`,
        league_name: 'AVIATOR',
        market_type: 'aviator',
        entry_point: s.entry_point,
        exit_point: s.exit_point,
        confidence: s.confidence,
        signal_notes: s.signal_notes,
        price: s.suggested_price,
        daily_price: s.suggested_price,
        odds: s.exit_point,
        is_live: true,
        status: 'live',
        home_team: 'AVIATOR',
        away_team: 'SIGNAL',
        expires_at: expiresAt,
      }));

      const { error } = await supabase
        .from('markets')
        .insert(records);

      if (error) throw error;

      setDispatched(true);
      loadLiveSignals();

    } catch (e) {
      setError('Dispatch failed: ' + String(e));
    } finally {
      setDispatching(false);
    }
  };

  const loadLiveSignals = async () => {
    setLoadingLive(true);
    const { data } = await supabase
      .from('markets')
      .select('*')
      .eq('league_name', 'AVIATOR')
      .eq('is_live', true)
      .order('created_at', { ascending: false })
      .limit(10);

    setLiveSignals(data || []);
    setLoadingLive(false);
  };

  const expireSignal = async (id: string) => {
    await supabase
      .from('markets')
      .update({ is_live: false, status: 'expired' })
      .eq('id', id);
    loadLiveSignals();
  };

  const getRiskColor = (r: string) =>
    r === 'LOW' ? '#22c55e'
    : r === 'MEDIUM' ? '#fbbf24'
    : '#f87171';

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1a',
      color: 'white', fontFamily: 'sans-serif',
      padding: '24px 16px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: '12px', marginBottom: '28px'
        }}>
          <div style={{
            width: '44px', height: '44px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={22} color="#f87171" />
          </div>
          <div>
            <h1 style={{
              fontWeight: 900, fontSize: '22px',
              letterSpacing: '-0.5px'
            }}>
              Aviator AI Signal Engine
            </h1>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              Upload pattern → AI analyzes → Dispatch to public
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '24px'
        }}>

          {/* Upload Section */}
          <div style={{
            background: '#0f1f33',
            border: '1px solid #1a2740',
            borderRadius: '16px', padding: '20px'
          }}>
            <p style={{
              fontWeight: 700, fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#6b7280', marginBottom: '14px'
            }}>
              Step 1 — Upload Pattern
            </p>

            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed #1a2740',
                borderRadius: '14px',
                padding: '24px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '14px',
                background: image
                  ? 'rgba(34,197,94,0.04)' : 'transparent',
                borderColor: image
                  ? 'rgba(34,197,94,0.3)' : '#1a2740'
              }}
            >
              {image ? (
                <img
                  src={image}
                  alt="Pattern"
                  style={{
                    maxWidth: '100%', maxHeight: '200px',
                    borderRadius: '8px', objectFit: 'contain'
                  }}
                />
              ) : (
                <>
                  <Upload size={32} color="#374151"
                    style={{ margin: '0 auto 10px' }} />
                  <p style={{
                    color: '#6b7280', fontSize: '13px'
                  }}>
                    Click to upload Aviator screenshot
                  </p>
                  <p style={{
                    color: '#374151', fontSize: '11px',
                    marginTop: '4px'
                  }}>
                    PNG, JPG, WebP supported
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={analyzePattern}
              disabled={!image || analyzing}
              style={{
                width: '100%',
                background: !image || analyzing
                  ? '#1a2740' : '#ef4444',
                color: !image || analyzing
                  ? '#374151' : 'white',
                border: 'none', borderRadius: '12px',
                padding: '14px', fontWeight: 900,
                fontSize: '14px', cursor: !image || analyzing
                  ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px'
              }}
            >
              {analyzing ? (
                <>
                  <RefreshCw size={16}
                    style={{ animation: 'spin 1s linear infinite' }} />
                  AI Analyzing Pattern...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Analyze With AI
                </>
              )}
            </button>
          </div>

          {/* Live Signals */}
          <div style={{
            background: '#0f1f33',
            border: '1px solid #1a2740',
            borderRadius: '16px', padding: '20px'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '14px'
            }}>
              <p style={{
                fontWeight: 700, fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#6b7280'
              }}>
                Live Signals
              </p>
              <button
                type="button"
                onClick={loadLiveSignals}
                style={{
                  background: 'none', border: 'none',
                  color: '#6b7280', cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {liveSignals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Eye size={28} color="#374151"
                  style={{ margin: '0 auto 8px' }} />
                <p style={{
                  color: '#374151', fontSize: '13px'
                }}>
                  No live signals. Dispatch some!
                </p>
                <button
                  type="button"
                  onClick={loadLiveSignals}
                  style={{
                    marginTop: '10px', background: '#1a2740',
                    border: '1px solid #243b55', color: '#9ca3af',
                    padding: '8px 16px', borderRadius: '8px',
                    fontSize: '12px', cursor: 'pointer'
                  }}
                >
                  Load Live Signals
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column',
                gap: '8px', maxHeight: '280px', overflowY: 'auto'
              }}>
                {liveSignals.map(s => (
                  <div key={s.id} style={{
                    background: '#0a1628',
                    border: '1px solid #1a2740',
                    borderRadius: '10px', padding: '10px 12px',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{
                        display: 'flex', gap: '8px',
                        alignItems: 'center', marginBottom: '3px'
                      }}>
                        <span style={{
                          color: '#22c55e', fontWeight: 900,
                          fontSize: '14px', fontFamily: 'monospace'
                        }}>
                          {s.entry_point}x
                        </span>
                        <span style={{ color: '#374151' }}>→</span>
                        <span style={{
                          color: '#f87171', fontWeight: 900,
                          fontSize: '14px', fontFamily: 'monospace'
                        }}>
                          {s.exit_point}x
                        </span>
                      </div>
                      <p style={{
                        color: '#6b7280', fontSize: '10px'
                      }}>
                        Expires:{' '}
                        {new Date(s.expires_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => expireSignal(s.id)}
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: '#f87171', padding: '5px 10px',
                        borderRadius: '6px', fontSize: '11px',
                        fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Expire
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Generated Signals */}
        {signals.length > 0 && (
          <div style={{
            background: '#0f1f33',
            border: '1px solid #1a2740',
            borderRadius: '16px', padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '16px'
            }}>
              <p style={{
                fontWeight: 700, fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#6b7280'
              }}>
                Step 2 — Review AI Signals
                ({signals.length} detected)
              </p>
              {dispatched && (
                <span style={{
                  background: 'rgba(34,197,94,0.15)',
                  color: '#22c55e', fontSize: '12px',
                  fontWeight: 700, padding: '4px 12px',
                  borderRadius: '20px',
                  display: 'flex', alignItems: 'center',
                  gap: '5px'
                }}>
                  <CheckCircle size={12} /> Dispatched!
                </span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '12px', marginBottom: '16px'
            }}>
              {signals.map((signal, idx) => (
                <div key={idx} style={{
                  background: '#0a1628',
                  border: `1px solid ${getRiskColor(signal.risk_level)}40`,
                  borderRadius: '14px', padding: '16px'
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 900,
                      textTransform: 'uppercase',
                      color: getRiskColor(signal.risk_level),
                      background: `${getRiskColor(signal.risk_level)}20`,
                      padding: '3px 8px', borderRadius: '20px'
                    }}>
                      {signal.risk_level} RISK
                    </span>
                    <span style={{
                      color: '#6b7280', fontSize: '12px',
                      fontWeight: 700
                    }}>
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Entry/Exit inputs */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px', marginBottom: '10px'
                  }}>
                    <div>
                      <label style={{
                        color: '#6b7280', fontSize: '10px',
                        textTransform: 'uppercase',
                        display: 'block', marginBottom: '4px'
                      }}>
                        Entry
                      </label>
                      <input
                        type="number"
                        value={signal.entry_point}
                        onChange={e => updateSignal(
                          idx, 'entry_point',
                          parseFloat(e.target.value)
                        )}
                        step="0.01"
                        style={{
                          width: '100%', background: '#0f1f33',
                          border: '1px solid #22c55e40',
                          borderRadius: '8px', padding: '8px',
                          color: '#22c55e', fontSize: '15px',
                          fontWeight: 900, fontFamily: 'monospace',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        color: '#6b7280', fontSize: '10px',
                        textTransform: 'uppercase',
                        display: 'block', marginBottom: '4px'
                      }}>
                        Exit
                      </label>
                      <input
                        type="number"
                        value={signal.exit_point}
                        onChange={e => updateSignal(
                          idx, 'exit_point',
                          parseFloat(e.target.value)
                        )}
                        step="0.01"
                        style={{
                          width: '100%', background: '#0f1f33',
                          border: '1px solid #f8717140',
                          borderRadius: '8px', padding: '8px',
                          color: '#f87171', fontSize: '15px',
                          fontWeight: 900, fontFamily: 'monospace',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Confidence */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <label style={{
                        color: '#6b7280', fontSize: '10px',
                        textTransform: 'uppercase'
                      }}>
                        Confidence
                      </label>
                      <span style={{
                        color: '#fbbf24', fontSize: '12px',
                        fontWeight: 900
                      }}>
                        {signal.confidence}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50" max="95"
                      value={signal.confidence}
                      onChange={e => updateSignal(
                        idx, 'confidence', parseInt(e.target.value)
                      )}
                      style={{ width: '100%', accentColor: '#fbbf24' }}
                    />
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{
                      color: '#6b7280', fontSize: '10px',
                      textTransform: 'uppercase',
                      display: 'block', marginBottom: '4px'
                    }}>
                      Price ($)
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[3, 5, 10].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateSignal(
                            idx, 'suggested_price', p
                          )}
                          style={{
                            flex: 1, padding: '7px',
                            borderRadius: '8px',
                            border: signal.suggested_price === p
                              ? '2px solid #22c55e'
                              : '1px solid #1a2740',
                            background: signal.suggested_price === p
                              ? 'rgba(34,197,94,0.15)' : '#0f1f33',
                            color: signal.suggested_price === p
                              ? '#22c55e' : '#6b7280',
                            fontWeight: 900, fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          ${p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <p style={{
                    color: '#6b7280', fontSize: '11px',
                    lineHeight: 1.5, fontStyle: 'italic'
                  }}>
                    {signal.signal_notes}
                  </p>
                </div>
              ))}
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '10px', padding: '12px',
                marginBottom: '14px',
                display: 'flex', gap: '8px', alignItems: 'center'
              }}>
                <AlertTriangle size={16} color="#f87171" />
                <p style={{ color: '#f87171', fontSize: '13px' }}>
                  {error}
                </p>
              </div>
            )}

            {/* Dispatch Button */}
            <button
              type="button"
              onClick={dispatchAll}
              disabled={dispatching || dispatched}
              style={{
                width: '100%',
                background: dispatched
                  ? 'rgba(34,197,94,0.15)'
                  : dispatching
                  ? '#1a2740' : '#ef4444',
                color: dispatched
                  ? '#22c55e'
                  : dispatching ? '#374151' : 'white',
                border: dispatched
                  ? '1px solid rgba(34,197,94,0.3)' : 'none',
                borderRadius: '14px', padding: '18px',
                fontSize: '16px', fontWeight: 900,
                cursor: dispatching || dispatched
                  ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '10px',
                boxShadow: dispatching || dispatched
                  ? 'none'
                  : '0 6px 20px rgba(239,68,68,0.3)'
              }}
            >
              {dispatched ? (
                <>
                  <CheckCircle size={20} />
                  Dispatched to Public — Expires in 2 Hours
                </>
              ) : dispatching ? (
                <>
                  <RefreshCw size={18}
                    style={{ animation: 'spin 1s linear infinite' }} />
                  Dispatching {signals.length} signals...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Dispatch {signals.length} Signals to Public
                  (2hr window)
                </>
              )}
            </button>

            <p style={{
              textAlign: 'center', color: '#374151',
              fontSize: '12px', marginTop: '10px'
            }}>
              Signals will auto-expire 2 hours after dispatch
            </p>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}