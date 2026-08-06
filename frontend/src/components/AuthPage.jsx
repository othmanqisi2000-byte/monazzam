import React, { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LayoutDashboard, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

const AUTH_COPY = {
  login: {
    badge: 'Welcome back',
    title: 'Log in to your workspace',
    subtitle: 'Pick up right where your board left off and keep the team moving.',
    button: 'Log In',
    footer: "Don't have an account?",
    switchLabel: 'Create one',
  },
  register: {
    badge: 'Start organizing',
    title: 'Create your account',
    subtitle: 'Set up your workspace in seconds and start planning with clarity.',
    button: 'Create Account',
    footer: 'Already have an account?',
    switchLabel: 'Log in',
  },
};

const FEATURE_ITEMS = [
  {
    icon: LayoutDashboard,
    title: 'Focused board flow',
    text: 'Track every task in a clean Kanban layout built for fast daily use.',
  },
  {
    icon: ShieldCheck,
    title: 'Reliable task management',
    text: 'Keep your work organized with a simple, predictable workspace experience.',
  },
  {
    icon: Sparkles,
    title: 'Designed for momentum',
    text: 'Stay aligned with a lightweight interface that keeps planning friction low.',
  },
];

function AuthPage({ mode, onSwitchMode, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = AUTH_COPY[mode];

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    if (mode === 'register' && payload.password !== payload.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (submitError) {
      setError(submitError.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:flex-row lg:items-stretch lg:gap-6">
        <section className="relative hidden overflow-hidden rounded-[28px] bg-slate-900 px-8 py-10 text-white shadow-2xl lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.35),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.18),_transparent_30%)]" />
          <div className="relative">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur">
              monazzan workspace
            </div>
            <h1 className="mt-6 max-w-sm text-4xl font-bold leading-tight">
              Plan, track, and ship your work with calm clarity.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              A clean task flow for teams and solo operators who want structure without clutter.
            </p>
          </div>

          <div className="relative space-y-4">
            {FEATURE_ITEMS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-white/10 p-2 text-indigo-200">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center py-6 lg:py-10">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">{copy.badge}</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{copy.title}</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{copy.subtitle}</p>
              </div>
              <div className="hidden rounded-2xl bg-slate-100 p-3 sm:block">
                <CheckCircle2 className="text-indigo-600" size={24} />
              </div>
            </div>

            <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => onSwitchMode('login')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode('register')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Register
              </button>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {mode === 'register' && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">First name</span>
                    <input
                      type="text"
                      name="firstName"
                      placeholder="John"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Last name</span>
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Carter"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      required
                    />
                  </label>
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email address</span>
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-3 my-auto text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {mode === 'register' && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Confirm password</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                </label>
              )}

              <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span>{mode === 'login' ? 'Keep me signed in' : 'I agree to the terms and privacy policy'}</span>
                </label>
                {mode === 'login' && (
                  <button type="button" className="text-left font-medium text-indigo-600 transition hover:text-indigo-700">
                    Forgot password?
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Please wait...
                  </>
                ) : (
                  <>
                    {copy.button}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {copy.footer}{' '}
              <button
                type="button"
                onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
                className="font-semibold text-indigo-600 transition hover:text-indigo-700"
              >
                {copy.switchLabel}
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AuthPage;
