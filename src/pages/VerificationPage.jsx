import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { get, ref } from 'firebase/database';
import { db } from '../firebase/config';

function VerificationPage() {
  const { deviceId } = useParams();
  const [data, setData] = useState(null);
  const [allVerifications, setAllVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // "2026-10-14 15:18:31" ya "14/10/2008" dono ko ms me convert karta hai
  const parseTimestamp = (ts) => {
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;

    // Format 1: "YYYY-MM-DD HH:mm:ss"
    const iso = String(ts).match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (iso) {
      const [, y, mo, d, h, mi, s = '0'] = iso;
      return new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime();
    }

    // Format 2: "DD/MM/YYYY"
    const dmy = String(ts).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) {
      const [, d, mo, y] = dmy;
      return new Date(+y, +mo - 1, +d).getTime();
    }

    const t = new Date(ts).getTime();
    return isNaN(t) ? 0 : t;
  };

  const fetchData = useCallback(async () => {
    if (!deviceId) return;

    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const snap = await get(ref(db, `users_details/${deviceId}`));

      if (reqId !== requestIdRef.current || !isMountedRef.current) return;

      if (!snap.exists()) {
        setAllVerifications([]);
        setData(null);
        return;
      }

      const raw = snap.val();

      // ✅ Case 1: Direct object (fields: aadhaar, dob, ...)
      // ✅ Case 2: Nested { uniqueId: {...} } — multiple entries
      let entries = [];

      const looksLikeRecord = raw && typeof raw === 'object' &&
        ('aadhaar' in raw || 'dob' in raw || 'uniqueId' in raw || 'motherName' in raw);

      if (looksLikeRecord) {
        entries = [{ id: raw.uniqueId || 'entry', ...raw }];
      } else {
        // Nested: { uniqueId: {...record} }
        entries = Object.entries(raw).map(([key, val]) => {
          if (val && typeof val === 'object') {
            return { id: val.uniqueId || key, ...val };
          }
          return { id: key, value: val };
        });
      }

      entries.sort((a, b) =>
        parseTimestamp(b.dateTime || b.timestamp) -
        parseTimestamp(a.dateTime || a.timestamp)
      );

      setAllVerifications(entries);
      setData(entries[0] || null);
    } catch (err) {
      if (reqId !== requestIdRef.current || !isMountedRef.current) return;
      console.error('Error:', err);
      setError(err.message || 'Failed to load');
    } finally {
      if (reqId === requestIdRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [deviceId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── UI ──────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100px', gap: '8px', padding: '10px' }}>
        <div style={{ width: '24px', height: '24px', border: '3px solid #e2e8f0',
          borderTopColor: '#6c63ff', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
        <span style={{ fontSize: '32px', display: 'block', marginBottom: '4px' }}>❌</span>
        <p style={{ fontSize: '13px' }}>Failed to load data</p>
        <p style={{ fontSize: '11px', opacity: 0.7 }}>{error}</p>
        <button onClick={fetchData} style={{
          marginTop: '8px', padding: '4px 16px',
          border: '1px solid var(--border-color)', borderRadius: '6px',
          background: 'var(--bg-card)', color: 'var(--text-primary)',
          cursor: 'pointer', fontSize: '12px',
        }}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
        <span style={{ fontSize: '32px', display: 'block', marginBottom: '4px' }}>📭</span>
        <p style={{ fontSize: '13px' }}>No data found</p>
      </div>
    );
  }

  const Row = ({ label, value, mono, letter }) => (
    <div style={{
      background: 'var(--bg-card)', borderRadius: '6px', padding: '5px 10px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      border: '1px solid var(--border-color)',
    }}>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)',
        fontFamily: mono ? 'monospace' : 'inherit',
        letterSpacing: letter || 'normal',
      }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
        borderRadius: '8px', padding: '8px 12px',
        marginBottom: '8px', color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
          <span style={{ fontSize: '11px', opacity: 0.9 }}>🔑 Unique ID</span>
          <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}>
            {data.uniqueId || 'N/A'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
          <span style={{ fontSize: '11px', opacity: 0.9 }}>📟 Device ID</span>
          <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>
            {data.device_id || deviceId}
          </span>
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', marginBottom: '6px' }}>
        <Row label="🆔 Aadhaar" value={data.aadhaar || 'N/A'} mono letter="2px" />
        <Row label="📅 DOB" value={data.dob || 'N/A'} />
        <Row label="👩 Mother Name" value={data.motherName || 'N/A'} />
        <Row label="🕐 DateTime" value={data.dateTime || 'N/A'} />
      </div>

      {/* All entries (agar nested me multiple hain) */}
      {allVerifications.length > 1 && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: '6px',
          border: '1px solid var(--border-color)', overflow: 'hidden', marginTop: '4px',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 10px', background: 'var(--bg-input)',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)',
          }}>
            <span>📋 All Records</span>
            <span style={{
              background: '#6c63ff', color: 'white', fontSize: '10px',
              padding: '1px 8px', borderRadius: '10px',
            }}>{allVerifications.length}</span>
          </div>
          {allVerifications.map((v, i) => (
            <div key={v.id || i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '5px 10px',
              borderBottom: i < allVerifications.length - 1 ? '1px solid var(--border-color)' : 'none',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {v.uniqueId || v.id}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {v.aadhaar || 'N/A'} · {v.dob || 'N/A'}
                </span>
              </div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                {v.dateTime || 'N/A'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VerificationPage;
