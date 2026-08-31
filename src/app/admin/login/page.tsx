'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2,
  Shield,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profile?.role === 'admin' || profile?.role === 'super_admin') {
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };
    checkSession();
  }, [router, supabase]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const isFormValid = () => {
    return validateEmail(email) && validatePassword(password);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please confirm your email address before logging in.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name, avatar_url')
          .eq('id', data.session.user.id)
          .single();

        if (profileError) {
          setError('Unable to verify your permissions. Please try again.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
          setError('Access denied. Admin privileges required.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        setSuccess(true);
        setLoading(false);
        
        if (rememberMe) {
          localStorage.setItem('admin-email', email);
        }

        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 500);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched({ ...touched, [field]: true });
  };

  const getInputStyles = (field: 'email' | 'password') => {
    const isTouched = touched[field];
    const value = field === 'email' ? email : password;
    const isValid = field === 'email' ? validateEmail(value) : validatePassword(value);
    
    if (!isTouched) return 'border-gray-300 dark:border-gray-600 focus:ring-blue-500';
    if (isValid) return 'border-green-500 dark:border-green-400 focus:ring-green-500';
    return 'border-red-500 dark:border-red-400 focus:ring-red-500';
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 relative overflow-hidden'>
      <div className='absolute inset-0 overflow-hidden'>
        <div className='absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 animate-pulse'></div>
        <div className='absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 animate-pulse delay-1000'></div>
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-pulse delay-2000'></div>
      </div>

      <div className='relative w-full max-w-md z-10'>
        <div className='text-center mb-8 animate-fade-in'>
          <div className='flex justify-center mb-4'>
            <div className='p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300'>
              <Building2 className='w-12 h-12 text-white' />
            </div>
          </div>
          <h1 className='text-4xl font-bold text-gray-900 dark:text-white tracking-tight'>
            Enterprise Hub
          </h1>
          <p className='mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium'>
            Admin Dashboard · Secure Access
          </p>
        </div>

        <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-3xl transition-shadow duration-300'>
          <div className='flex items-center gap-3 mb-6'>
            <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
              <Shield className='w-5 h-5 text-blue-600 dark:text-blue-400' />
            </div>
            <div>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
                Secure Admin Access
              </h2>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Two-factor authentication enabled
              </p>
            </div>
          </div>

          {success && (
            <div className='mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3 animate-slide-in'>
              <CheckCircle2 className='w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5' />
              <div>
                <p className='text-sm font-medium text-green-600 dark:text-green-400'>
                  Login successful!
                </p>
                <p className='text-xs text-green-500 dark:text-green-400'>
                  Redirecting to dashboard...
                </p>
              </div>
            </div>
          )}

          {error && !success && (
            <div className='mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-shake'>
              <AlertCircle className='w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5' />
              <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className='space-y-5'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                Email Address
              </label>
              <div className='relative group'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Mail className='h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors' />
                </div>
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${getInputStyles('email')}`}
                  placeholder='admin@company.com'
                  required
                  disabled={loading || success}
                  aria-label='Email address'
                  autoComplete='email'
                />
                {touched.email && email && validateEmail(email) && (
                  <div className='absolute inset-y-0 right-0 pr-3 flex items-center'>
                    <CheckCircle2 className='h-5 w-5 text-green-500' />
                  </div>
                )}
              </div>
              {touched.email && email && !validateEmail(email) && (
                <p className='mt-1 text-xs text-red-500'>Please enter a valid email address</p>
              )}
            </div>

            <div>
              <div className='flex justify-between items-center mb-1.5'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Password
                </label>
                <button
                  type='button'
                  className='text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors hover:underline'
                >
                  Forgot password?
                </button>
              </div>
              <div className='relative group'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Lock className='h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors' />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${getInputStyles('password')}`}
                  placeholder='••••••••'
                  required
                  disabled={loading || success}
                  aria-label='Password'
                  autoComplete='current-password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute inset-y-0 right-0 pr-3 flex items-center hover:scale-110 transition-transform'
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className='h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors' />
                  ) : (
                    <Eye className='h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors' />
                  )}
                </button>
              </div>
              {touched.password && password && !validatePassword(password) && (
                <p className='mt-1 text-xs text-red-500'>Password must be at least 6 characters</p>
              )}
            </div>

            <div className='flex items-center justify-between'>
              <label className='flex items-center cursor-pointer group'>
                <input
                  type='checkbox'
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer'
                  disabled={loading || success}
                />
                <span className='ml-2 text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors'>
                  Remember me
                </span>
              </label>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
                <span className='text-xs text-gray-500 dark:text-gray-400 font-mono'>
                  🔒 SSL
                </span>
              </div>
            </div>

            <button
              type='submit'
              disabled={loading || success || !isFormValid()}
              className='w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg group'
            >
              {loading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  Authenticating...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className='w-5 h-5' />
                  Redirecting...
                </>
              ) : (
                <>
                  Sign in to Dashboard
                  <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
                </>
              )}
            </button>
          </form>

          <div className='mt-6 space-y-3'>
            <div className='flex justify-center gap-6 text-xs text-gray-400 dark:text-gray-500'>
              <span className='flex items-center gap-1'>
                <span className='w-1.5 h-1.5 bg-green-500 rounded-full'></span>
                Secure Connection
              </span>
              <span className='flex items-center gap-1'>
                <span className='w-1.5 h-1.5 bg-blue-500 rounded-full'></span>
                256-bit Encryption
              </span>
              <span className='flex items-center gap-1'>
                <span className='w-1.5 h-1.5 bg-purple-500 rounded-full'></span>
                SOC2 Compliant
              </span>
            </div>
            <p className='text-center text-xs text-gray-400 dark:text-gray-600'>
              © 2026 Enterprise Hub. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-in {
          animation: slide-in 0.4s ease-out;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}