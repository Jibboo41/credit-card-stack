import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useFinanceStore } from './store/useFinanceStore';
import LoginScreen from './components/LoginScreen';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { BestCardPage } from './pages/BestCardPage';
import { RewardsPage } from './pages/RewardsPage';
import { OffersPage } from './pages/OffersPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { RecurringPage } from './pages/RecurringPage';
import { CardsPage } from './pages/CardsPage';

export default function App() {
  const user = useFinanceStore(s => s.user);
  const isAuthLoaded = useFinanceStore(s => s.isAuthLoaded);
  const setUser = useFinanceStore(s => s.setUser);
  const subscribeToData = useFinanceStore(s => s.subscribeToData);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [setUser]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToData();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user, subscribeToData]);

  if (!isAuthLoaded) {
    return (
      <div className="splash">
        <div className="spin" style={{ width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="best-card" element={<BestCardPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="recurring" element={<RecurringPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
