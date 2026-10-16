import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { CreditCard as CardIcon } from 'lucide-react';

export default function LoginScreen() {
  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      alert("Failed to sign in. Please make sure Google Sign-In is enabled in the Firebase Console.");
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      {/* Background blobs for aesthetics */}
      <div className="ambient-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div style={{
        background: 'rgba(28, 28, 30, 0.5)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '48px 32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          width: '72px', height: '72px', borderRadius: '20px', 
          background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(10, 132, 255, 0.05))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px auto', border: '1px solid rgba(10, 132, 255, 0.3)'
        }}>
          <CardIcon size={36} color="#0A84FF" />
        </div>
        
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', color: '#fff', letterSpacing: '-0.5px' }}>
          Credit Card Stack
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--sys-label-secondary)', marginBottom: '40px', lineHeight: '1.5' }}>
          Your personal organization system. Track credit cards, cashback, and optimize your spending.
        </p>

        <button 
          onClick={handleSignIn}
          style={{
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: '14px',
            padding: '16px',
            width: '100%',
            fontSize: '16px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 12px rgba(255,255,255,0.1)'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onMouseUp={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        >
          {/* Google G Logo SVG */}
          <svg width="20" height="20" viewBox="0 0 48 48" style={{ display: 'block' }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign In with Google
        </button>
      </div>
    </div>
  );
}
