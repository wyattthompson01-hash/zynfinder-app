import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

const MOCK_LEADERS = [
  { id: "1", username: "snus_scout_global",  points: 840, reports_count: 62, verifications_count: 84 },
  { id: "2", username: "van_zyn_scout",       points: 620, reports_count: 44, verifications_count: 60 },
  { id: "3", username: "nordic_hunter",       points: 490, reports_count: 36, verifications_count: 40 },
  { id: "4", username: "peg_zyn_finder",      points: 380, reports_count: 24, verifications_count: 44 },
  { id: "5", username: "hfx_patrol",          points: 270, reports_count: 18, verifications_count: 30 },
  { id: "6", username: "yyz_tracker",         points: 210, reports_count: 15, verifications_count: 22 },
  { id: "7", username: "snus_world_uk",       points: 155, reports_count: 11, verifications_count: 16 },
  { id: "8", username: "zyn_finder_de",       points: 110, reports_count:  8, verifications_count: 12 },
];

const TABS = [
  { id: "points", label: "Points", icon: "ti-star" },
  { id: "reports", label: "Reports", icon: "ti-map-pin" },
  { id: "verifications", label: "Verifications", icon: "ti-shield-check" },
];

function getPts(entry, tab) {
  if (tab === "points") return entry.points ?? 0;
  if (tab === "reports") return entry.reports_count ?? 0;
  return entry.verifications_count ?? 0;
}

function RankBadge({ rank }) {
  if (rank === 1) return (
    <span className="rank-badge gold">
      <i className="ti ti-crown" /> 1st
    </span>
  );
  if (rank === 2) return (
    <span className="rank-badge silver">
      <i className="ti ti-award" /> 2nd
    </span>
  );
  if (rank === 3) return (
    <span className="rank-badge bronze">
      <i className="ti ti-award" /> 3rd
    </span>
  );
  return <span className="rank-badge plain">#{rank}</span>;
}

// Mini bar for progress relative to leader
function ScoreBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="score-bar">
      <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function Leaderboard({ currentUserId }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("points");

  useEffect(() => { fetchLeaders(); }, [tab]);

  const fetchLeaders = async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) { setLeaders(MOCK_LEADERS); return; }
    setLoading(true);
    try {
      const orderField = tab === "points" ? "points"
        : tab === "reports" ? "reports_count" : "verifications_count";
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id,username,points,reports_count,verifications_count&order=${orderField}.desc&limit=50`,
        { headers }
      );
      const data = await res.json();
      setLeaders(Array.isArray(data) && data.length > 0 ? data : MOCK_LEADERS);
    } catch {
      setLeaders(MOCK_LEADERS);
    } finally {
      setLoading(false);
    }
  };

  const currentUserRank = currentUserId ? leaders.findIndex(l => l.id === currentUserId) + 1 : null;
  const currentUserEntry = currentUserId ? leaders.find(l => l.id === currentUserId) : null;
  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);
  const sortedLabel = tab === "points" ? "pts" : tab === "reports" ? "reports" : "verifications";
  const maxVal = leaders.length ? getPts(leaders[0], tab) : 1;

  const tabColors = { points: "#f59e0b", reports: "#10b981", verifications: "#6366f1" };
  const tabColor = tabColors[tab];

  return (
    <div className="leaderboard-page">
      {/* ── Header ── */}
      <div className="leaderboard-header">
        <div className="lb-header-left">
          <div className="leaderboard-title">
            <i className="ti ti-trophy" style={{ color: "#f59e0b" }} />
            Leaderboard
          </div>
          <div className="leaderboard-sub">Top SnusWorld contributors worldwide</div>
        </div>
        <div className="lb-header-stats">
          <div className="lb-stat-pill">
            <i className="ti ti-users" /> {leaders.length} contributors
          </div>
          <div className="lb-stat-pill">
            <i className="ti ti-map-pin" /> {leaders.reduce((a, l) => a + (l.reports_count ?? 0), 0)} reports
          </div>
          <div className="lb-stat-pill">
            <i className="ti ti-shield-check" /> {leaders.reduce((a, l) => a + (l.verifications_count ?? 0), 0)} verifications
          </div>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="lb-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`lb-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
            style={tab === t.id ? { borderColor: tabColors[t.id], color: tabColors[t.id] } : {}}>
            <i className={`ti ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="lb-loading"><div className="spinner" /><span>Loading leaderboard…</span></div>
      ) : (
        <>
          {/* ── Podium ── */}
          {top3.length >= 3 && (
            <div className="podium">
              <div className="podium-slot second">
                <div className="podium-avatar">
                  <i className="ti ti-user" />
                </div>
                <div className="podium-rank silver"><i className="ti ti-award" /></div>
                <div className="podium-name">{top3[1]?.username || "—"}</div>
                <div className="podium-scores">
                  <div className="podium-val">{getPts(top3[1], tab)} <span>{sortedLabel}</span></div>
                  <div className="podium-sub">{top3[1]?.reports_count ?? 0}r · {top3[1]?.verifications_count ?? 0}v</div>
                </div>
                <div className="podium-base second-base" />
              </div>
              <div className="podium-slot first">
                <div className="podium-avatar gold-ring">
                  <i className="ti ti-user" />
                </div>
                <div className="podium-rank gold"><i className="ti ti-crown" /></div>
                <div className="podium-name" style={{ fontWeight: 700 }}>{top3[0]?.username || "—"}</div>
                <div className="podium-scores">
                  <div className="podium-val" style={{ color: "#d97706" }}>{getPts(top3[0], tab)} <span>{sortedLabel}</span></div>
                  <div className="podium-sub">{top3[0]?.reports_count ?? 0}r · {top3[0]?.verifications_count ?? 0}v</div>
                </div>
                <div className="podium-base first-base" />
              </div>
              <div className="podium-slot third">
                <div className="podium-avatar bronze-ring">
                  <i className="ti ti-user" />
                </div>
                <div className="podium-rank bronze"><i className="ti ti-award" /></div>
                <div className="podium-name">{top3[2]?.username || "—"}</div>
                <div className="podium-scores">
                  <div className="podium-val">{getPts(top3[2], tab)} <span>{sortedLabel}</span></div>
                  <div className="podium-sub">{top3[2]?.reports_count ?? 0}r · {top3[2]?.verifications_count ?? 0}v</div>
                </div>
                <div className="podium-base third-base" />
              </div>
            </div>
          )}

          {/* ── Full table ── */}
          {rest.length > 0 && (
            <div className="lb-table-wrap">
              {/* Table header */}
              <div className="lb-table-header">
                <div className="lbt-rank">Rank</div>
                <div className="lbt-user">Contributor</div>
                <div className="lbt-bar" />
                <div className="lbt-col" style={{ color: tabColors.points }}>
                  <i className="ti ti-star" /> Points
                </div>
                <div className="lbt-col" style={{ color: tabColors.reports }}>
                  <i className="ti ti-map-pin" /> Reports
                </div>
                <div className="lbt-col" style={{ color: tabColors.verifications }}>
                  <i className="ti ti-shield-check" /> Verifs
                </div>
              </div>

              {rest.map((entry, i) => {
                const rank = i + 4;
                const isMe = entry.id === currentUserId;
                const val = getPts(entry, tab);
                return (
                  <div key={entry.id} className={`lb-table-row ${isMe ? "me" : ""}`}>
                    <div className="lbt-rank">
                      <span className="lb-rank-num">#{rank}</span>
                    </div>
                    <div className="lbt-user">
                      <div className="lb-avatar">
                        <i className="ti ti-user" />
                      </div>
                      <div className="lb-user-info">
                        <div className="lb-username">
                          {entry.username || "Anonymous"}
                          {isMe && <span className="lb-you-badge">You</span>}
                        </div>
                      </div>
                    </div>
                    <div className="lbt-bar">
                      <ScoreBar value={val} max={maxVal} color={tabColor} />
                    </div>
                    <div className="lbt-col">
                      <strong style={{ color: tabColors.points }}>{entry.points ?? 0}</strong>
                    </div>
                    <div className="lbt-col">
                      <strong style={{ color: tabColors.reports }}>{entry.reports_count ?? 0}</strong>
                    </div>
                    <div className="lbt-col">
                      <strong style={{ color: tabColors.verifications }}>{entry.verifications_count ?? 0}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Your rank (if outside top 50) ── */}
          {currentUserId && !currentUserEntry && (
            <div className="lb-your-rank">
              <i className="ti ti-user-circle" />
              <span>You're not ranked yet — report a location to join the leaderboard!</span>
            </div>
          )}
          {currentUserEntry && (
            <div className="lb-your-rank-bar">
              <span>Your rank:</span>
              <strong>#{currentUserRank}</strong>
              <div style={{ display: "flex", gap: 16, marginLeft: "auto" }}>
                <span style={{ color: tabColors.points }}>{currentUserEntry.points ?? 0} pts</span>
                <span style={{ color: tabColors.reports }}>{currentUserEntry.reports_count ?? 0} reports</span>
                <span style={{ color: tabColors.verifications }}>{currentUserEntry.verifications_count ?? 0} verifs</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
