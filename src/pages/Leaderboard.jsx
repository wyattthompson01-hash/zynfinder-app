import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

const MOCK_LEADERS = [
  { id: "1", username: "toronto_zyn_king", points: 420, reports_count: 31, verifications_count: 42 },
  { id: "2", username: "van_zyn_scout", points: 310, reports_count: 22, verifications_count: 30 },
  { id: "3", username: "yyc_hunter", points: 245, reports_count: 18, verifications_count: 20 },
  { id: "4", username: "peg_zyn_finder", points: 190, reports_count: 12, verifications_count: 22 },
  { id: "5", username: "hfx_zyn_patrol", points: 135, reports_count: 9, verifications_count: 15 },
];

function RankMedal({ rank }) {
  if (rank === 1) return <span className="rank-medal gold"><i className="ti ti-crown" /></span>;
  if (rank === 2) return <span className="rank-medal silver"><i className="ti ti-award" /></span>;
  if (rank === 3) return <span className="rank-medal bronze"><i className="ti ti-award" /></span>;
  return <span className="rank-num">#{rank}</span>;
}

export default function Leaderboard({ currentUserId }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("points");

  useEffect(() => {
    fetchLeaders();
  }, [tab]);

  const fetchLeaders = async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      setLeaders(MOCK_LEADERS);
      return;
    }
    setLoading(true);
    try {
      const orderField = tab === "points" ? "points" : tab === "reports" ? "reports_count" : "verifications_count";
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id,username,points,reports_count,verifications_count&order=${orderField}.desc&limit=50`,
        { headers }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setLeaders(data);
      } else {
        setLeaders(MOCK_LEADERS);
      }
    } catch {
      setLeaders(MOCK_LEADERS);
    } finally {
      setLoading(false);
    }
  };

  // Find current user's rank
  const currentUserRank = currentUserId
    ? leaders.findIndex((l) => l.id === currentUserId) + 1
    : null;
  const currentUserEntry = currentUserId
    ? leaders.find((l) => l.id === currentUserId)
    : null;

  const sortedValue = (entry) => {
    if (tab === "points") return entry.points ?? 0;
    if (tab === "reports") return entry.reports_count ?? 0;
    return entry.verifications_count ?? 0;
  };

  const sortedLabel = tab === "points" ? "pts" : tab === "reports" ? "reports" : "verifications";

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="leaderboard-page">
      {/* Header */}
      <div className="leaderboard-header">
        <div className="leaderboard-title">
          <i className="ti ti-trophy" style={{ fontSize: 22, color: "#f59e0b" }} />
          Leaderboard
        </div>
        <div className="leaderboard-sub">Top ZynFinder contributors in Canada</div>
      </div>

      {/* Category tabs */}
      <div className="lb-tabs">
        {[
          { id: "points", label: "Points", icon: "ti-star" },
          { id: "reports", label: "Reports", icon: "ti-map-pin" },
          { id: "verifications", label: "Verifications", icon: "ti-shield-check" },
        ].map((t) => (
          <button
            key={t.id}
            className={`lb-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`ti ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="lb-loading">
          <div className="spinner" />
          <span>Loading leaderboard…</span>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {top3.length >= 3 && (
            <div className="podium">
              {/* 2nd */}
              <div className="podium-slot second">
                <div className="podium-avatar" style={{ background: "#e5e7eb" }}>
                  <i className="ti ti-user" style={{ fontSize: 18, color: "#6b7280" }} />
                </div>
                <div className="podium-rank silver"><i className="ti ti-award" /></div>
                <div className="podium-name">{top3[1]?.username || "—"}</div>
                <div className="podium-val">{sortedValue(top3[1])} {sortedLabel}</div>
                <div className="podium-base second-base" />
              </div>

              {/* 1st */}
              <div className="podium-slot first">
                <div className="podium-avatar gold-ring">
                  <i className="ti ti-user" style={{ fontSize: 22, color: "#d97706" }} />
                </div>
                <div className="podium-rank gold"><i className="ti ti-crown" /></div>
                <div className="podium-name" style={{ fontWeight: 700 }}>{top3[0]?.username || "—"}</div>
                <div className="podium-val" style={{ color: "#d97706" }}>{sortedValue(top3[0])} {sortedLabel}</div>
                <div className="podium-base first-base" />
              </div>

              {/* 3rd */}
              <div className="podium-slot third">
                <div className="podium-avatar" style={{ background: "#fde8d3" }}>
                  <i className="ti ti-user" style={{ fontSize: 18, color: "#c2410c" }} />
                </div>
                <div className="podium-rank bronze"><i className="ti ti-award" /></div>
                <div className="podium-name">{top3[2]?.username || "—"}</div>
                <div className="podium-val">{sortedValue(top3[2])} {sortedLabel}</div>
                <div className="podium-base third-base" />
              </div>
            </div>
          )}

          {/* Rest of rankings */}
          {rest.length > 0 && (
            <ul className="lb-list">
              {rest.map((entry, i) => {
                const rank = i + 4;
                const isMe = entry.id === currentUserId;
                return (
                  <li key={entry.id} className={`lb-row ${isMe ? "me" : ""}`}>
                    <span className="lb-rank-num">#{rank}</span>
                    <div className="lb-avatar">
                      <i className="ti ti-user" style={{ fontSize: 14, color: "#9ca3af" }} />
                    </div>
                    <div className="lb-info">
                      <div className="lb-username">
                        {entry.username || "Anonymous"}
                        {isMe && <span className="lb-you-badge">You</span>}
                      </div>
                      <div className="lb-stats-mini">
                        <span><i className="ti ti-map-pin" /> {entry.reports_count ?? 0}</span>
                        <span><i className="ti ti-shield-check" /> {entry.verifications_count ?? 0}</span>
                      </div>
                    </div>
                    <div className="lb-score">
                      {sortedValue(entry)}
                      <span className="lb-score-label">{sortedLabel}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Current user's rank if they're not in top 50 */}
          {currentUserId && !currentUserEntry && (
            <div className="lb-your-rank">
              <i className="ti ti-user-circle" />
              <span>You're not ranked yet — report a location to join!</span>
            </div>
          )}

          {currentUserEntry && (
            <div className="lb-your-rank-bar">
              <span>Your rank: </span>
              <strong>#{currentUserRank}</strong>
              <span style={{ marginLeft: "auto", color: "#f59e0b" }}>
                {sortedValue(currentUserEntry)} {sortedLabel}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
