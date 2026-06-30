import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const headers = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };

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
  { id: "points",        label: "Points",  icon: "ti-star",         color: "#f59e0b" },
  { id: "reports",       label: "Reports", icon: "ti-map-pin",      color: "#10b981" },
  { id: "verifications", label: "Verifs",  icon: "ti-shield-check", color: "#818cf8" },
];

function getPts(entry, tab) {
  if (tab === "points") return entry.points ?? 0;
  if (tab === "reports") return entry.reports_count ?? 0;
  return entry.verifications_count ?? 0;
}

function initial(name) {
  return (name || "?")[0].toUpperCase();
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

  const activeTab  = TABS.find(t => t.id === tab);
  const color      = activeTab?.color ?? "#f59e0b";
  const label      = tab === "points" ? "pts" : tab === "reports" ? "reports" : "verifs";
  const top3       = leaders.slice(0, 3);
  const rest       = leaders.slice(3);
  const maxVal     = leaders.length ? getPts(leaders[0], tab) : 1;

  const totalReports = leaders.reduce((a, l) => a + (l.reports_count ?? 0), 0);
  const totalVerifs  = leaders.reduce((a, l) => a + (l.verifications_count ?? 0), 0);

  const currentUserRank  = currentUserId ? leaders.findIndex(l => l.id === currentUserId) + 1 : 0;
  const currentUserEntry = currentUserId ? leaders.find(l => l.id === currentUserId) : null;

  return (
    <div className="lb2-page">

      {/* ── Hero header ── */}
      <div className="lb2-hero">
        <div className="lb2-hero-title">
          <i className="ti ti-trophy" style={{ color: "#f59e0b" }} /> Leaderboard
        </div>
        <div className="lb2-hero-sub">Top SnusWorld contributors worldwide</div>
        <div className="lb2-hero-stats">
          <div className="lb2-stat">
            <div className="lb2-stat-num">{leaders.length}</div>
            <div className="lb2-stat-lbl">Contributors</div>
          </div>
          <div className="lb2-stat-divider" />
          <div className="lb2-stat">
            <div className="lb2-stat-num">{totalReports}</div>
            <div className="lb2-stat-lbl">Reports</div>
          </div>
          <div className="lb2-stat-divider" />
          <div className="lb2-stat">
            <div className="lb2-stat-num">{totalVerifs}</div>
            <div className="lb2-stat-lbl">Verifications</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="lb2-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`lb2-tab ${tab === t.id ? "active" : ""}`}
            style={tab === t.id ? { color: t.color, borderColor: t.color, background: t.color + "18" } : {}}
            onClick={() => setTab(t.id)}
          >
            <i className={`ti ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="lb2-loading">
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      ) : (
        <>
          {/* ── Top 3 ── */}
          {top3.length >= 3 && (
            <div className="lb2-top3">
              {/* #1 — full-width hero card */}
              <div className="lb2-first-card">
                <div className="lb2-first-medal">
                  <i className="ti ti-crown" />
                </div>
                <div className="lb2-first-avatar" style={{ background: color + "22", color }}>
                  {initial(top3[0]?.username)}
                </div>
                <div className="lb2-first-name">{top3[0]?.username || "—"}</div>
                <div className="lb2-first-score" style={{ color }}>
                  {getPts(top3[0], tab)}<span className="lb2-score-label"> {label}</span>
                </div>
                <div className="lb2-first-sub">
                  {top3[0]?.reports_count ?? 0} reports · {top3[0]?.verifications_count ?? 0} verifs
                </div>
              </div>

              {/* #2 and #3 side by side */}
              <div className="lb2-silver-bronze-row">
                {[
                  { entry: top3[1], rank: 2, accent: "#9ca3af", label: "2nd" },
                  { entry: top3[2], rank: 3, accent: "#c47d3a", label: "3rd" },
                ].map(({ entry, rank, accent, label: rl }) => (
                  <div key={rank} className="lb2-sb-card">
                    <div className="lb2-sb-rank" style={{ color: accent }}>
                      {rl}
                    </div>
                    <div className="lb2-sb-avatar" style={{ background: accent + "22", color: accent }}>
                      {initial(entry?.username)}
                    </div>
                    <div className="lb2-sb-name">{entry?.username || "—"}</div>
                    <div className="lb2-sb-score" style={{ color: accent }}>
                      {getPts(entry, tab)}<span> {label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Rest of list ── */}
          {rest.length > 0 && (
            <div className="lb2-list">
              <div className="lb2-list-header">
                <span>Contributor</span>
                <span style={{ color }}>{activeTab?.label}</span>
              </div>
              {rest.map((entry, i) => {
                const rank = i + 4;
                const isMe = entry.id === currentUserId;
                const val  = getPts(entry, tab);
                const pct  = maxVal > 0 ? Math.min(100, (val / maxVal) * 100) : 0;
                return (
                  <div key={entry.id} className={`lb2-row ${isMe ? "lb2-row-me" : ""}`}>
                    <div className="lb2-row-rank">#{rank}</div>
                    <div className="lb2-row-avatar">
                      {initial(entry.username)}
                    </div>
                    <div className="lb2-row-mid">
                      <div className="lb2-row-name">
                        {entry.username || "Anonymous"}
                        {isMe && <span className="lb2-you">You</span>}
                      </div>
                      <div className="lb2-row-bar">
                        <div className="lb2-row-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                    <div className="lb2-row-val" style={{ color }}>{val}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Your rank banner ── */}
          {currentUserId && !currentUserEntry && (
            <div className="lb2-cta">
              <i className="ti ti-map-pin" />
              <span>Report a location to join the leaderboard!</span>
            </div>
          )}
          {currentUserEntry && (
            <div className="lb2-your-rank">
              <span className="lb2-yr-label">Your rank</span>
              <span className="lb2-yr-rank">#{currentUserRank}</span>
              <span className="lb2-yr-stats">
                {currentUserEntry.points ?? 0} pts
                · {currentUserEntry.reports_count ?? 0} reports
                · {currentUserEntry.verifications_count ?? 0} verifs
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
