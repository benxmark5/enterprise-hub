"use client";
import { useState, useRef } from 'react';
import { supabase } from '@/app/supabase';
import {
  Upload, Zap, Send, RefreshCw,
  CheckCircle, AlertTriangle, Eye,
  TrendingUp
} from 'lucide-react';

type Signal = {
  entry_point: number;
  exit_point: number;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  signal_notes: string;
  suggested_price: number;
};

type LiveSignal = {
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
  const [signals, setSignals] = useState<Signal[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      const base64 = image.split(',')[1];
      const mimeType = imageFile.type;

      // Use Gemini Vision API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64
                  }
                },
                {
                  text: `You are an expert Aviator crash game analyst.

Study this Aviator round history screenshot carefully.
Look at the multiplier values shown and identify patterns.

Based on the patterns, generate 3-5 trading signals.

Respond ONLY with a valid JSON array. No explanation, no markdown, no backticks:
[
  {
    "entry_point": 1.15,
    "exit_point": 2.80,
    "confidence": 74,
    "risk_level": "MEDIUM",
    "signal_notes": "Pattern shows steady climb before 3x range",
    "suggested_price": 3.00
  }
]

Rules for your analysis:
- entry_point: must be between 1.01 and 1.80
- exit_point: must be higher than entry, between 1.5 and 12.0
- confidence: integer between 62 and 91
- risk_level: "LOW" if exit < 2.5x, "MEDIUM" if 2.5x-5x, "HIGH" if above 5x
- signal_notes: 1 sentence explaining what you see in the pattern
- suggested_price: 3 for single signal, 5 for medium confidence, 10 for high confidence pattern

Return ONLY the JSON array, nothing else.`
                }
              ]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 800,
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || 'Gemini API error'
        );
      }

      const text = data.candidates?.[0]?.content
        ?.parts?.[0]?.text || '[]';

      // Clean and parse JSON
      const clean = text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed: Signal[] = JSON.parse(clean);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error(
          'No signals detected. Try a clearer screenshot.'
        );
      }

      setSignals(parsed);

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('JSON')) {
        setError(
          'Could not read pattern clearly. Try a clearer screenshot.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const updateSignal = (
    idx: number,
    field: keyof Signal,
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
      minHeight: '100vh', background: '#050505',
      color: 'white', fontFamily: 'sans-serif',
      padding: '24px 16px'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: '14px', marginBottom: '32px'
        }}>
          <div style={{
            width: '48px', height: '48px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={24} color="#f87171" />
          </div>
          <div>
            <h1 style={{
              fontWeight: 900, fontSize: '22px',
              letterSpacing: '-0.5px', color: 'white'
            }}>
              Aviator Signal Engine
            </h1>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              Upload round history → Analyze pattern → 
              Dispatch to public (2hr window)
            </p>
          </div>
        </div>

        {/* Top Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px', marginBottom: '24px'
        }}>

          {/* Upload */}
          <div style={{
            background: '#0f1f33',
            border: '1px solid #1a2740',
            borderRadius: '16px', padding: '20px'
          }}>
            <p style={{
              fontWeight: 700, fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#6b7280', marginBottom: '14px'
            }}>
              Step 1 — Upload Round History
            </p>

            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${image ? 'rgba(34,197,94,0.4)' : '#1a2740'}`,
                borderRadius: '14px', padding: '20px',
                textAlign: 'center', cursor: 'pointer',
                marginBottom: '14px',
                background: image
                  ? 'rgba(34,197,94,0.04)' : 'transparent',
                minHeight: '160px',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center'
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
                <div>
                  <Upload size={32} color="#374151"
                    style={{ margin: '0 auto 10px' }} />
                  <p style={{
                    color: '#6b7280', fontSize: '13px',
                    marginBottom: '4px'
                  }}>
                    Click to upload Aviator screenshot
                  </p>
                  <p style={{
                    color: '#374151', fontSize: '11px'
                  }}>
                    Screenshot the round history numbers
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />

            {image && (
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setImageFile(null);
                  setSignals([]);
                  setDispatched(false);
                  setError('');
                  if (fileRef.current) fileRef.current.value = '';
                }}
                style={{
                  width: '100%', background: 'none',
                  border: '1px solid #1a2740',
                  color: '#6b7280', borderRadius: '8px',
                  padding: '8px', fontSize: '12px',
                  cursor: 'pointer', marginBottom: '8px'
                }}
              >
                Change Screenshot
              </button>
            )}

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
                fontSize: '14px',
                cursor: !image || analyzing
                  ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px'
              }}
            >
              {analyzing ? (
                <>
                  <RefreshCw size={16} style={{
                    animation: 'spin 1s linear infinite'
                  }} />
                  Analyzing Pattern...
                </>
              ) : (
                <>
                  <TrendingUp size={16} />
                  Analyze Pattern
                </>
              )}
            </button>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '10px', padding: '12px',
                marginTop: '12px',
                display: 'flex', gap: '8px',
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={14} color="#f87171"
                  style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{
                  color: '#f87171', fontSize: '12px',
                  lineHeight: 1.5
                }}>
                  {error}
                </p>
              </div>
            )}
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
                fontWeight: 700, fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#6b7280'
              }}>
                Currently Live
              </p>
              <button
                type="button"
                onClick={loadLiveSignals}
                style={{
                  background: 'none', border: 'none',
                  color: '#6b7280', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                  gap: '5px', fontSize: '12px'
                }}
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>

            {liveSignals.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '24px 16px'
              }}>
                <Eye size={28} color="#374151"
                  style={{ margin: '0 auto 10px' }} />
                <p style={{
                  color: '#374151', fontSize: '13px',
                  marginBottom: '12px'
                }}>
                  No live signals active
                </p>
                <button
                  type="button"
                  onClick={loadLiveSignals}
                  style={{
                    background: '#1a2740',
                    border: '1px solid #243b55',
                    color: '#9ca3af', padding: '8px 16px',
                    borderRadius: '8px', fontSize: '12px',
                    cursor: 'pointer', fontWeight: 700
                  }}
                >
                  Load Live Signals
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column',
                gap: '8px', maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {liveSignals.map(s => (
                  <div key={s.id} style={{
                    background: '#0a1628',
                    border: '1px solid #1a2740',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', marginBottom: '6px'
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div>
                          <span style={{
                            color: '#22c55e', fontWeight: 900,
                            fontSize: '15px', fontFamily: 'monospace'
                          }}>
                            {s.entry_point}x
                          </span>
                          <span style={{
                            color: '#374151', margin: '0 6px'
                          }}>
                            →
                          </span>
                          <span style={{
                            color: '#f87171', fontWeight: 900,
                            fontSize: '15px', fontFamily: 'monospace'
                          }}>
                            {s.exit_point}x
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => expireSignal(s.id)}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          color: '#f87171', padding: '3px 10px',
                          borderRadius: '6px', fontSize: '11px',
                          fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        Expire
                      </button>
                    </div>
                    <p style={{
                      color: '#6b7280', fontSize: '10px'
                    }}>
                      Expires:{' '}
                      {new Date(s.expires_at).toLocaleTimeString(
                        [], { hour: '2-digit', minute: '2-digit' }
                      )}
                      {' '}· Confidence: {s.confidence}%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Generated Signals */}
        {signals.length > 0 && (
          <div style={{
            background: '#0f1f33',
            border: '1px solid #1a2740',
            borderRadius: '16px', padding: '20px'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '18px'
            }}>
              <div>
                <p style={{
                  fontWeight: 700, fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  Step 2 — Review & Adjust Signals
                </p>
                <p style={{
                  color: '#9ca3af', fontSize: '13px',
                  fontWeight: 700
                }}>
                  {signals.length} signals detected from pattern
                </p>
              </div>
              {dispatched && (
                <span style={{
                  background: 'rgba(34,197,94,0.15)',
                  color: '#22c55e', fontSize: '12px',
                  fontWeight: 700, padding: '6px 14px',
                  borderRadius: '20px',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <CheckCircle size={14} />
                  Dispatched — 2hr window active
                </span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '12px', marginBottom: '20px'
            }}>
              {signals.map((signal, idx) => (
                <div key={idx} style={{
                  background: '#0a1628',
                  border: `1px solid ${getRiskColor(signal.risk_level)}30`,
                  borderRadius: '14px', padding: '16px'
                }}>
                  {/* Risk badge */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '14px'
                  }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 900,
                      textTransform: 'uppercase',
                      color: getRiskColor(signal.risk_level),
                      background:
                        `${getRiskColor(signal.risk_level)}15`,
                      padding: '3px 10px', borderRadius: '20px',
                      letterSpacing: '0.05em'
                    }}>
                      {signal.risk_level} RISK
                    </span>
                    <span style={{
                      color: '#374151', fontSize: '11px',
                      fontWeight: 700
                    }}>
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Entry/Exit */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px', marginBottom: '12px'
                  }}>
                    <div>
                      <label style={{
                        color: '#6b7280', fontSize: '10px',
                        textTransform: 'uppercase',
                        display: 'block', marginBottom: '5px',
                        letterSpacing: '0.05em'
                      }}>
                        🟢 Entry
                      </label>
                      <input
                        type="number"
                        value={signal.entry_point}
                        onChange={e => updateSignal(
                          idx, 'entry_point',
                          parseFloat(e.target.value) || 1.01
                        )}
                        step="0.01" min="1.01" max="2.00"
                        style={{
                          width: '100%', background: '#0f1f33',
                          border: '1px solid rgba(34,197,94,0.3)',
                          borderRadius: '8px', padding: '8px',
                          color: '#22c55e', fontSize: '16px',
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
                        display: 'block', marginBottom: '5px',
                        letterSpacing: '0.05em'
                      }}>
                        🔴 Exit
                      </label>
                      <input
                        type="number"
                        value={signal.exit_point}
                        onChange={e => updateSignal(
                          idx, 'exit_point',
                          parseFloat(e.target.value) || 1.50
                        )}
                        step="0.01" min="1.50"
                        style={{
                          width: '100%', background: '#0f1f33',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: '8px', padding: '8px',
                          color: '#f87171', fontSize: '16px',
                          fontWeight: 900, fontFamily: 'monospace',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Confidence */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      marginBottom: '5px'
                    }}>
                      <label style={{
                        color: '#6b7280', fontSize: '10px',
                        textTransform: 'uppercase'
                      }}>
                        Confidence
                      </label>
                      <span style={{
                        color: signal.confidence >= 75
                          ? '#22c55e' : '#fbbf24',
                        fontSize: '12px', fontWeight: 900
                      }}>
                        {signal.confidence}%
                      </span>
                    </div>
                    <input
                      type="range" min="50" max="95"
                      value={signal.confidence}
                      onChange={e => updateSignal(
                        idx, 'confidence',
                        parseInt(e.target.value)
                      )}
                      style={{
                        width: '100%',
                        accentColor: signal.confidence >= 75
                          ? '#22c55e' : '#fbbf24'
                      }}
                    />
                  </div>

                  {/* Price buttons */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{
                      color: '#6b7280', fontSize: '10px',
                      textTransform: 'uppercase',
                      display: 'block', marginBottom: '6px'
                    }}>
                      Price
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '5px'
                    }}>
                      {[3, 5, 10].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateSignal(
                            idx, 'suggested_price', p
                          )}
                          style={{
                            padding: '7px 4px',
                            borderRadius: '8px',
                            border: signal.suggested_price === p
                              ? '2px solid #22c55e'
                              : '1px solid #1a2740',
                            background: signal.suggested_price === p
                              ? 'rgba(34,197,94,0.15)' : '#0f1f33',
                            color: signal.suggested_price === p
                              ? '#22c55e' : '#6b7280',
                            fontWeight: 900, fontSize: '13px',
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
                    lineHeight: 1.6, fontStyle: 'italic',
                    borderTop: '1px solid #1a2740',
                    paddingTop: '10px'
                  }}>
                    {signal.signal_notes}
                  </p>
                </div>
              ))}
            </div>

            {/* Dispatch Button */}
            <button
              type="button"
              onClick={dispatchAll}
              disabled={dispatching || dispatched}
              style={{
                width: '100%',
                background: dispatched
                  ? 'rgba(34,197,94,0.1)'
                  : dispatching
                  ? '#1a2740' : '#ef4444',
                color: dispatched ? '#22c55e'
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
                  : '0 6px 20px rgba(239,68,68,0.25)'
              }}
            >
              {dispatched ? (
                <>
                  <CheckCircle size={20} />
                  ✅ Dispatched — Signals live for 2 hours
                </>
              ) : dispatching ? (
                <>
                  <RefreshCw size={18} style={{
                    animation: 'spin 1s linear infinite'
                  }} />
                  Dispatching {signals.length} signals...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Dispatch {signals.length} Signals to Public
                  (Active for 2hrs)
                </>
              )}
            </button>

            {!dispatched && (
              <p style={{
                textAlign: 'center', color: '#374151',
                fontSize: '12px', marginTop: '10px'
              }}>
                Signals expire automatically after 2 hours
              </p>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}