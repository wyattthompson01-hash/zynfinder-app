import { useState, useCallback } from "react";
import Map from "./components/Map";
import StoreList from "./components/StoreList";
import ReportForm from "./components/ReportForm";
import VerifyQueue from "./components/VerifyQueue";
import LocationDetail from "./pages/LocationDetail";
import Header from "./components/Header";
import Toast from "./components/Toast";
import { useStores } from "./hooks/useStores";
import { useLocation } from "./hooks/useLocation";

export default function App() {
  const [tab, setTab] = useState("map");
  const [toast, setToast] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [userPoints, setUserPoints] = useState(
    () => parseInt(localStorage.getItem("zynfinder_points") || "0")
  );

  const { coords } = useLocation();
  const { stores, loading, addStore, verifyStore } = useStores(coords);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const awardPoints = useCallback((pts) => {
    setUserPoints((p) => {
      const next = p + pts;
      localStorage.setItem("zynfinder_points", next);
      return next;
    });
  }, []);

  const openStore = (store) => {
    setSelectedStore(store);
  };

  const closeStore = () => {
    setSelectedStore(null);
  };

  // Location detail page takes over
  if (selectedStore) {
    return (
      <div className="app-shell">
        <Header tab={tab} setTab={setTab} userPoints={userPoints} />
        <div className="main-content">
          <LocationDetail
            store={selectedStore}
            onBack={closeStore}
            onVerify={async (storeId, confirmed) => {
              await verifyStore(storeId, confirmed);
              awardPoints(5);
              showToast(confirmed ? "Confirmed! +5 points" : "Flagged · +5 points");
            }}
          />
        </div>
        {toast && <Toast message={toast} />}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header tab={tab} setTab={setTab} userPoints={userPoints} />
      <div className="main-content">
        {tab === "map" && (
          <Map
            stores={stores}
            userCoords={coords}
            onAddClick={() => setTab("report")}
            onStoreClick={openStore}
          />
        )}
        {tab === "list" && (
          <StoreList
            stores={stores}
            loading={loading}
            userCoords={coords}
            onStoreClick={openStore}
          />
        )}
        {tab === "report" && (
          <ReportForm
            userCoords={coords}
            onSubmit={async (data) => {
              await addStore(data);
              awardPoints(10);
              showToast("Location submitted! +10 points");
              setTab("map");
            }}
          />
        )}
        {tab === "verify" && (
          <VerifyQueue
            stores={stores.filter((s) => s.status === "pending" || s.status === "unverified")}
            onVerify={async (storeId, confirmed) => {
              await verifyStore(storeId, confirmed);
              awardPoints(5);
              showToast(confirmed ? "Confirmed! +5 points" : "Flagged · +5 points");
            }}
            onStoreClick={openStore}
          />
        )}
      </div>
      {toast && <Toast message={toast} />}
    </div>
  );
}
