import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';
import { loginSchema, type LoginInput } from '@tdc/shared';
import { CoupleIllustration } from '../components/motion/CoupleIllustration';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { useAuth } from '../features/auth/AuthContext';
import { ApiError, api } from '../lib/api';

interface DemoCredentials {
  password: string;
  users: { username: string; name: string; role: string; title: string }[];
}

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [demo, setDemo] = useState<DemoCredentials | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  useEffect(() => {
    // Only available when the API explicitly enables it (development by default).
    api
      .get<DemoCredentials>('/auth/demo-credentials')
      .then((res) => setDemo(res.data))
      .catch(() => setDemo(null));
  }, []);

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401)
        setServerError('That username/email and password don’t match. Please try again.');
      else if (err instanceof ApiError && err.status === 429) setServerError(err.message);
      else setServerError(err instanceof Error ? err.message : 'Sign-in failed.');
      setFocus('password');
    }
  });

  const fillDemo = (username: string) => {
    if (!demo) return;
    setValue('identifier', username, { shouldValidate: true });
    setValue('password', demo.password, { shouldValidate: true });
    setServerError(null);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-brand-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 font-serif text-xl font-semibold text-white">
            T
          </span>
          <span className="font-serif text-xl font-semibold text-white">TDC</span>
        </div>
        <div className="relative mx-auto w-full max-w-md text-center">
          <div className="mb-10 animate-rise-in">
            <CoupleIllustration />
          </div>
          <p
            className="animate-rise-in font-serif text-3xl font-medium leading-snug text-white"
            style={{ animationDelay: '150ms' }}
          >
            Every introduction is a considered one.
          </p>
          <p
            className="mt-4 animate-rise-in text-sm leading-relaxed text-brand-200"
            style={{ animationDelay: '250ms' }}
          >
            Manage your clients’ journeys, review explainable compatibility suggestions, and keep a clear
            record of every conversation and introduction.
          </p>
        </div>
        <p className="relative text-xs text-brand-300">Internal tool · authorised TDC matchmakers only</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm animate-rise-in">
          <div className="mb-8 lg:hidden">
            <span className="font-serif text-2xl font-semibold text-stone-900">TDC</span>
            <p className="text-sm text-stone-500">Matchmaker console</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Sign in</h1>
          <p className="mt-1 text-sm text-stone-500">Use your matchmaker username or work email.</p>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            {serverError && (
              <div
                role="alert"
                className="flex gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {serverError}
              </div>
            )}
            <Field label="Username or email" error={errors.identifier?.message}>
              {(a) => (
                <Input
                  {...a}
                  {...register('identifier')}
                  autoComplete="username"
                  autoFocus
                  placeholder="e.g. ananya"
                />
              )}
            </Field>
            <Field label="Password" error={errors.password?.message}>
              {(a) => (
                <div className="relative">
                  <Input
                    {...a}
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-stone-400 hover:text-stone-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </Field>
            <Button
              type="submit"
              className="w-full"
              loading={isSubmitting}
              icon={<LockKeyhole className="h-4 w-4" />}
            >
              Sign in
            </Button>
          </form>

          {demo && (
            <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white/60 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                <KeyRound className="h-3.5 w-3.5" aria-hidden /> Demo accounts (development only)
              </p>
              <p className="mt-1.5 text-xs text-stone-500">
                Password for all:{' '}
                <code className="rounded bg-stone-100 px-1 py-0.5 text-stone-800">{demo.password}</code>
              </p>
              <div className="mt-3 space-y-1.5">
                {demo.users.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => fillDemo(u.username)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-brand-50"
                  >
                    <span>
                      <span className="font-medium text-stone-800">{u.username}</span>
                      <span className="text-stone-500"> · {u.name}</span>
                    </span>
                    <span className="text-xs text-stone-500">{u.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
