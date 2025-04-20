import { useState, useEffect } from 'react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/lib/themes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { authAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: 'filled_black' | 'filled_blue';
              size?: 'large' | 'medium' | 'small';
              width?: number | string;
            }
          ) => void;
        };
      };
    };
  }
}

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  // Reset fields when switching mode
  useEffect(() => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }, [isLogin]);

  // 🔁 Always re-render Google button on open or mode switch
  useEffect(() => {
    if (!isOpen) return;

    const renderGoogleButton = () => {
      const googleButton = document.getElementById('googleButton');
      if (googleButton && window.google?.accounts.id) {
        googleButton.innerHTML = ''; // clear existing button
        window.google.accounts.id.renderButton(googleButton, {
          theme: theme === 'dark' ? 'filled_black' : 'filled_blue',
          size: 'large',
          width: '100%',
        });
      }
    };

    // Defer rendering slightly to ensure DOM is ready
    const timeout = setTimeout(renderGoogleButton, 100);

    const handleGoogleSignIn = async (event: CustomEvent<{ credential: string }>) => {
      try {
        setIsLoading(true);
        const result = await authAPI.googleLogin(event.detail.credential);
        localStorage.setItem('token', result.token);
        toast.success(isLogin ? 'Login successful!' : 'Account created successfully!');
        onClose();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Google authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    window.addEventListener('googleSignIn', handleGoogleSignIn as unknown as EventListener);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('googleSignIn', handleGoogleSignIn as unknown as EventListener);
    };
  }, [isOpen, isLogin, theme, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = isLogin
        ? await authAPI.login(email, password)
        : await authAPI.signup(name, email, password);
      localStorage.setItem('token', response.token);
      toast.success(isLogin ? 'Login successful!' : 'Account created successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `${isLogin ? 'Login' : 'Signup'} failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isLogin
              ? 'Sign in to your account to continue'
              : 'Sign up to get started with Bolt'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                Full name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your full name"
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={isLogin ? 'Enter your password' : 'Create a password'}
              disabled={isLoading}
            />
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium">
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
                disabled={isLoading}
              />
            </div>
          )}

          {isLogin && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-primary hover:text-primary/90">
                  Forgot password?
                </a>
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="flex items-center">
              <input
                id="terms"
                type="checkbox"
                required
                className="h-4 w-4 rounded border-gray-300"
                disabled={isLoading}
              />
              <label htmlFor="terms" className="ml-2 block text-sm">
                I agree to the{' '}
                <a href="#" className="font-medium text-primary hover:text-primary/90">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="font-medium text-primary hover:text-primary/90">
                  Privacy Policy
                </a>
              </label>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? isLogin ? 'Signing in...' : 'Creating account...'
              : isLogin ? 'Sign in' : 'Create account'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div id="googleButton" className="w-full"></div>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-medium text-primary hover:text-primary/90"
            disabled={isLoading}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
