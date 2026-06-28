import { useState, useCallback } from "react";
import Map from "./components/Map";
import StoreList from "./components/StoreList";
import ReportForm from "./components/ReportForm";
import VerifyQueue from "./components/VerifyQueue";
import LocationDetail from "./pages/LocationDetail";
import ProfilePage from "./pages/ProfilePage";
import Leaderboard from "./pages/Leaderboard";
import PricesPage from "./pages/PricesPage";
import Header from "./components/Header";
import Toast from "./components/Toast";
import AuthModal from "./components/AuthModal";
import { useStores } from "./hooks/useStores";
import { useLocation } from "./hooks/useLocation";
import { useAuth } from "./hooks/useAuth";

const AUTH_SHOWN_KEY = "zynfinder_auth_shown";

export default function App() {
  const [tab, setTab] = useState("map");
  const [toast, setToast] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const { coords } = useLocation();
  const { stores, loading, addStore, verifyStore } = useStores(coords);
  const {
    user, profile, loading: authLoading,
    signIn, signUp, signOut,
    awardPoints, incrementStat, isLoggedIn, displayPoints,
  } = useAuth();

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Changing tabs always exits the store detail view
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

  const handleAuthSuccess = useCallback(async (mode, email, password, username) => {
    const result = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password, username);
    if (result.success) {
      setShowAuth(false);
      showToast(mode === "login" ? "Welcome back!" : "Account created! Welcome to ZynFinder.");
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
              showToast(confirmed ? "Confirmed! +5 points" : "Flagged · +5 points");
            }} />
        </div>
        {toast && <Toast message={toast} />}
        {authModal}
      </div>
    );
  }

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
              showToast(confirmed ? "Confirmed! +5 points" : "Flagged · +5 points");
            }}
            onStoreClick={handleStoreClick} />
        )}
        {tab === "leaderboard" && <Leaderboard currentUserId={user?.id} />}
        {tab === "prices" && <PricesPage stores={stores} userCoords={coords} user={user} onStoreClick={handleStoreClick} />}
      </div>
      {toast && <Toast message={toast} />}
      {authModal}
    </div>
  );
}
