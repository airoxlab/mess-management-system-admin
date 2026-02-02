'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { playSound, formatDate, formatTime } from '@/lib/utils';
import { MEAL_TYPE_LABELS, TOKEN_STATUS } from '@/lib/constants';

export default function VerifyPage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [recentTokens, setRecentTokens] = useState([]);
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load recent collected tokens
  useEffect(() => {
    loadRecentTokens();
  }, []);

  const loadRecentTokens = async () => {
    try {
      const response = await fetch('/api/verify?recent=true');
      if (response.ok) {
        const data = await response.json();
        setRecentTokens(data.tokens || []);
      }
    } catch (err) {
      console.error('Failed to load recent tokens:', err);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();

    if (!tokenInput.trim()) {
      setError('Please enter a token number or scan QR code');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setToken(null);

      const response = await fetch(`/api/verify?token=${encodeURIComponent(tokenInput.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Token not found');
      }

      setToken(data.token);

      if (data.token.status === TOKEN_STATUS.COLLECTED) {
        playSound('/sounds/error.mp3');
        toast.warning('Token already collected!');
      } else {
        playSound('/sounds/success.mp3');
      }
    } catch (err) {
      setError(err.message);
      playSound('/sounds/error.mp3');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCollect = async () => {
    if (!token || token.status === TOKEN_STATUS.COLLECTED) return;

    try {
      setLoading(true);

      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId: token.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to collect token');
      }

      setToken(data.token);
      playSound('/sounds/success.mp3');
      toast.success(`Token #${token.token_no} collected!`);

      // Refresh recent tokens
      loadRecentTokens();

      // Clear input for next scan
      setTokenInput('');
      inputRef.current?.focus();
    } catch (err) {
      setError(err.message);
      playSound('/sounds/error.mp3');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setToken(null);
    setError(null);
    setTokenInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Token Verification</h1>
                <p className="text-sm text-gray-500">Verify and collect meal tokens</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600">Collection Point</p>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Search Section */}
          <div className="space-y-6">
            {/* Search Form */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Enter Token Number
              </h2>
              <form onSubmit={handleSearch} className="space-y-4">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Token # or scan QR code"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="text-2xl text-center"
                  inputClassName="text-center text-2xl py-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClear}
                    className="flex-1"
                    disabled={loading}
                  >
                    Clear
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    loading={loading}
                  >
                    Search
                  </Button>
                </div>
              </form>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Token Result */}
            {token && (
              <div className={`rounded-xl shadow-sm overflow-hidden ${
                token.status === TOKEN_STATUS.COLLECTED
                  ? 'bg-gray-100 border-2 border-gray-300'
                  : 'bg-white border-2 border-green-500'
              }`}>
                {/* Token Header */}
                <div className={`p-4 text-white text-center ${
                  token.status === TOKEN_STATUS.COLLECTED
                    ? 'bg-gray-500'
                    : 'bg-green-500'
                }`}>
                  <p className="text-sm opacity-80">Token Number</p>
                  <p className="text-4xl font-bold">
                    #{String(token.token_no).padStart(3, '0')}
                  </p>
                </div>

                {/* Token Details */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Member</span>
                    <span className="font-medium text-gray-900">
                      {token.member?.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Member ID</span>
                    <span className="font-medium text-gray-900">
                      {token.member?.member_id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Meal Type</span>
                    <span className="font-medium text-gray-900">
                      {MEAL_TYPE_LABELS[token.meal_type]}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Generated</span>
                    <span className="font-medium text-gray-900">
                      {formatTime(token.token_time)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      token.status === TOKEN_STATUS.COLLECTED
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {token.status}
                    </span>
                  </div>

                  {token.status === TOKEN_STATUS.COLLECTED && token.collected_at && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-500 text-center">
                        Collected at: {formatTime(token.collected_at)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Collect Button */}
                {token.status !== TOKEN_STATUS.COLLECTED && (
                  <div className="p-4 bg-gray-50 border-t">
                    <Button
                      variant="success"
                      fullWidth
                      size="lg"
                      onClick={handleCollect}
                      loading={loading}
                      className="text-lg py-4"
                    >
                      COLLECT TOKEN
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Collections */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Collections
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {recentTokens.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No recent collections today
                </p>
              ) : (
                recentTokens.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        #{String(t.token_no).padStart(3, '0')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t.member?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        Collected
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(t.collected_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
