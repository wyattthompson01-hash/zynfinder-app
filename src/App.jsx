import { useState, useCallback } from "react";
import Map from "./components/Map";
import StoreList from "./components/StoreList";
import ReportForm from "./components/ReportForm";
import VerifyQueue from "./components/VerifyQueue";
import LocationDetail from "./pages/LocationDetail";
import ProfilePage from "./pages/ProfilePage";
import Leaderboard from "./pages/Leaderboard";
import PricesPage from "./pages/PricesPage";
import MarketplacePage from "./pages/MarketplacePage";
import FeedbackPage from "./pages/FeedbackPage";
import Header from "./components/Header";
import Toast from "./components/Toast";
import AuthModal from "./components/AuthModal";
import { useStores } from "./hooks/useStores";
import { useLocation } from "./hooks/useLocation";
import { useAuth } from "./hooks/useAuth";

const AUTH_SHOWN_KEY = "snusworld_auth_shown";

const GATE_PASSWORD = "snusworld2024";

function PasswordGate({ onUnlock }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (val === GATE_PASSWORD) {
      sessionStorage.setItem("sw_auth", "1");
      onUnlock();
    } else {
      setErr(true);
      setVal("");
    }
  };
  return (
    <div style={{minHeight:"100vh",background:"#0d0e1a",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <div style={{width:"100%",maxWidth:360,background:"#13142a",borderRadius:20,padding:"40px 32px",boxShadow:"0 8px 40px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🥫</div>
          <div style={{fontSize:22,fontWeight:800,color:"#eef2ff",marginBottom:6}}>SnusWorld</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>Private beta — enter password to continue</div>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={val}
            onChange={e=>{setVal(e.target.value);setErr(false);}}
            autoFocus
            style={{width:"100%",padding:"13px 16px",background:"rgba(255,255,255,0.06)",border:err?"1.5px solid #f87171":"1.5px solid rgba(255,255,255,0.1)",borderRadius:12,color:"#eef2ff",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:err?6:16}}
          />
          {err && <div style={{color:"#f87171",fontSize:12,marginBottom:12,textAlign:"center"}}>Incorrect password</div>}
          <button type="submit" style={{width:"100%",padding:"13px",background:"#2563eb",border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("sw_auth") === "1");
  const [tab, setTab] = useState("map");
  const [toast, setToast] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const { coords } = useLocation();
  const { stores, loading, addStore, verifyStore, updateStorePrice } = useStores(coords);
  const {
    user, profile, loading: authLoading,
    signIn, signUp, signOut,
    awardPoints, incrementStat, isLoggedIn, displayPoints,
  } = useAuth();

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleTabChange = useCallback((newTab) => {
    setSelectedStore(null);
    setShowProfile(false);
    if ((newTab === "report" || newTab === "verify") && !isLoggedIn) {
      const seen = localStorage.getItem(AUTH_SHOWN_KEY);
      if (!seen) {
        localStorage.setItem(AUTH_SHOWN_KEY, "1");
        setAuthMode("signup");
        setShowAuth(true);
      }
    }
    setTab(newTab);
  }, [isLoggedIn]);

  const openProfileOrAuth = useCallback(() => {
    if (isLoggedIn) { setShowProfile(true); }
    else { setAuthMode("login"); setShowAuth(true); }
  }, [isLoggedIn]);

  const handleAuthRequired = useCallback(() => {
    setAuthMode("signup");
    setShowAuth(true);
  }, []);

  const handleAuthSuccess = useCallback(async (mode, email, password, username) => {
    const result = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password, username);
    if (result.success) {
      setShowAuth(false);
      showToast(mode === "login" ? "Welcome back!" : "Welcome to SnusWorld!");
    }
    return result;
  }, [signIn, signUp, showToast]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setShowProfile(false);
    showToast("Signed out");
  }, [signOut, showToast]);

  const handleStoreClick = useCallback((store) => {
    if (store._isOverpass) { handleTabChange("report"); }
    else { setSelectedStore(store); }
  }, [handleTabChange]);

  const sharedHeader = (
    <Header tab={tab} setTab={handleTabChange}
      userPoints={displayPoints} user={user} onProfileClick={openProfileOrAuth} />
  );

  const authModal = showAuth && (
    <AuthModal initialMode={authMode} onClose={() => setShowAuth(false)}
      onSignIn={(email, pw) => handleAuthSuccess("login", email, pw)}
      onSignUp={(email, pw, un) => handleAuthSuccess("signup", email, pw, un)}
      authLoading={authLoading} />
  );

  if (showProfile && isLoggedIn) {
    return (
      <div className="app-shell">
        {sharedHeader}
        <div className="main-content">
          <ProfilePage user={user} profile={profile}
            onBack={() => setShowProfile(false)} onSignOut={handleSignOut} />
        </div>
        {toast && <Toast message={toast} />}
      </div>
    );
  }

  if (selectedStore) {
    return (
      <div className="app-shell">
        {sharedHeader}
        <div className="main-content">
          <LocationDetail store={selectedStore} onBack={() => setSelectedStore(null)}
            userCoords={coords} user={user}
            onVerify={async (storeId, confirmed) => {
              await verifyStore(storeId, confirmed);
              await awardPoints(5);
              await incrementStat("verifications_count");
              showToast(confirmed ? "Confirmed! +5 points" : "Flagged ÃÂ· +5 points");
            }} />
        </div>
        {toast && <Toast message={toast} />}
        {authModal}
      </div>
    );
  }

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  return (
    <div className="app-shell">
      {sharedHeader}
      <div className="main-content">
        {tab === "map" && (
          <Map stores={stores} userCoords={coords}
            onAddClick={() => handleTabChange("report")} onStoreClick={handleStoreClick} />
        )}
        {tab === "list" && (
          <StoreList stores={stores} loading={loading}
            userCoords={coords} onStoreClick={handleStoreClick} />
        )}
        {tab === "report" && (
          <ReportForm userCoords={coords}
            onSubmit={async (data) => {
              await addStore(data);
              await awardPoints(10);
              await incrementStat("reports_count");
              showToast("Location submitted! +10 points");
              setTab("map");
            }} />
        )}
        {tab === "verify" && (
          <VerifyQueue
            stores={stores.filter((s) => s.status === "pending" || s.status === "unverified")}
            onVerify={async (storeId, confirmed) => {
              await verifyStore(storeId, confirmed);
              await awardPoints(5);
              await incrementStat("verifications_count");
              showToast(confirmed ? "Confirmed! +5 points" : "Flagged ÃÂ· +5 points");
            }}
            onStoreClick={handleStoreClick} />
        )}
        {tab === "leaderboard" && <Leaderboard currentUserId={user?.id} />}
        {tab === "prices" && (
          <PricesPage stores={stores} userCoords={coords} user={user}
            onReportPrice={(store) => { setSelectedStore(store); }}
            onViewStore={(store) => { setSelectedStore(store); }}
          />
        )}
        {tab === "marketplace" && (
          <MarketplacePage userCoords={coords} user={user} isLoggedIn={isLoggedIn}
            onAuthRequired={handleAuthRequired} />
        )}
        {tab === "feedback" && (
          <FeedbackPage stores={stores} user={user} isLoggedIn={isLoggedIn}
            onAuthRequired={handleAuthRequired} />
        )}
      </div>
      {toast && <Toast message={toast} />}
      {authModal}
    </div>
  );
}
