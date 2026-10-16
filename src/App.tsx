import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import CreditCardsScreen from './components/CreditCardsScreen';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import { useFinanceStore } from './store/useFinanceStore';

function App() {
  const { user, isAuthLoaded, setUser, fetchCreditCards, theme } = useFinanceStore();

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [setUser]);

  useEffect(() => {
    // Only fetch data if the user is authenticated
    if (user) {
      const unsubscribe = fetchCreditCards();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user, fetchCreditCards]);

  const getThemeBlobs = (t: string) => {
    switch (t) {
      case 'sunset':     return ['#FF3B30', '#FF9F0A', '#FFD60A'];
      case 'midnight':   return ['#5E5CE6', '#BF5AF2', '#32ADE6'];
      case 'forest':     return ['#30D158', '#34C759', '#32ADE6'];
      case 'aurora':     return ['#00F5A0', '#8B5CF6', '#06B6D4'];
      case 'desert':     return ['#E2A57E', '#C9415A', '#EDCA7F'];
      case 'ocean':      return ['#0EA5E9', '#0D9488', '#6366F1'];
      case 'vulcan':     return ['#FF4500', '#FF8C00', '#FF2D55'];
      case 'sakura':     return ['#FF85A2', '#D891EF', '#FFB6CE'];
      case 'cyberpunk':  return ['#FF00AA', '#00FFEA', '#FFE600'];
      case 'slate':      return ['#708090', '#708090', '#708090'];
      case 'black':      return ['#000000', '#000000', '#000000'];
      default:           return [undefined, undefined, undefined];
    }
  };
  const [b1, b2, b3] = getThemeBlobs(theme);

  if (!isAuthLoaded) {
    // Show a blank screen or a loading spinner while checking auth state
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1014' }}>
        {/* Simple CSS spinner or blank is fine */}
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="app-content-root">
      {/* Ambient background blobs for glassmorphism */}
      <div className="ambient-bg">
        <div className="blob blob-1" style={b1 ? { background: b1 } : undefined} />
        <div className="blob blob-2" style={b2 ? { background: b2 } : undefined} />
        <div className="blob blob-3" style={b3 ? { background: b3 } : undefined} />
      </div>
      
      <div style={{ position: 'relative', zIndex: 10, height: '100%' }}>
        <CreditCardsScreen />
        <Sidebar />
      </div>
    </div>
  );
}

export default App;
