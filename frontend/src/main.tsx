import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize Google OAuth
const initGoogleAuth = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: '384914323425-g3iiu9pioevu9k5bb4u7k72o2ccspnig.apps.googleusercontent.com',
        callback: (response: any) => {
          // Handle the Google Sign-In response
          if (response.credential) {
            // Dispatch a custom event that components can listen to
            window.dispatchEvent(new CustomEvent('googleSignIn', { 
              detail: { credential: response.credential } 
            }));
          }
        }
      });
      resolve(true);
    };
    document.head.appendChild(script);
  });
};

// Initialize Google Auth before rendering the app
initGoogleAuth().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
