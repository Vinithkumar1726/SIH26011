/**
 * SIH26011 - Login Screen
 * Neo-brutalist login with JWT authentication
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from './AuthContext';
import { SURFACE, DOMAIN, BORDER, SHADOW, SHADOW_PRESSED, FONT, LABEL, onDomain } from '../design/tokens';

const DEMO_USERS = [
  { username: 'admin', role: 'admin' as const, label: 'System Administrator' },
  { username: 'rajesh.k', role: 'surveyor' as const, label: 'Rajesh Kumar (Surveyor)' },
  { username: 'priya.s', role: 'reviewer' as const, label: 'Priya Sharma (Reviewer)' },
  { username: 'amit.p', role: 'viewer' as const, label: 'Amit Patel (Viewer)' },
];

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login({ username, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser: typeof DEMO_USERS[0]) => {
    setError('');
    setLoading(true);
    setUsername(demoUser.username);
    setPassword('demo123');
    
    try {
      await login({ username: demoUser.username, password: 'demo123' });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: SURFACE.app,
      padding: 24,
      fontFamily: FONT.body,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          width: '100%',
          maxWidth: 420,
          background: SURFACE.panel,
          border: BORDER,
          boxShadow: SHADOW,
          padding: 40,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{
            fontFamily: FONT.display,
            fontSize: 28,
            fontWeight: 700,
            color: '#F4F1E8',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            SIH26011
          </h1>
          <p style={{
            marginTop: 8,
            color: '#9AA3B2',
            fontSize: 14,
            fontFamily: FONT.mono,
          }}>
            3D Cadastral Registry
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              background: 'rgba(255, 59, 48, 0.15)',
              border: `3px solid ${DOMAIN.conflict}`,
              color: DOMAIN.conflict,
              padding: 12,
              marginBottom: 20,
              fontFamily: FONT.mono,
              fontSize: 12,
              textAlign: 'left',
            }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              ...LABEL,
              color: '#9AA3B2',
              marginBottom: 8,
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 16px',
                background: SURFACE.input,
                border: BORDER,
                color: '#F4F1E8',
                fontFamily: FONT.body,
                fontSize: 14,
                outline: 'none',
              }}
              placeholder="Enter username"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              ...LABEL,
              color: '#9AA3B2',
              marginBottom: 8,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 16px',
                background: SURFACE.input,
                border: BORDER,
                color: '#F4F1E8',
                fontFamily: FONT.body,
                fontSize: 14,
                outline: 'none',
              }}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: DOMAIN.spatial,
              color: onDomain('spatial'),
              border: BORDER,
              boxShadow: SHADOW,
              fontFamily: FONT.body,
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'transform 0.05s, box-shadow 0.05s',
            }}
            onMouseDown={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.boxShadow = SHADOW_PRESSED;
                (e.currentTarget as HTMLElement).style.transform = 'translate(2px, 2px)';
              }
            }}
            onMouseUp={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.boxShadow = SHADOW;
                (e.currentTarget as HTMLElement).style.transform = 'translate(0, 0)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.boxShadow = SHADOW;
                (e.currentTarget as HTMLElement).style.transform = 'translate(0, 0)';
              }
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `2px solid #1B2233` }}>
          <p style={{
            ...LABEL,
            color: '#9AA3B2',
            marginBottom: 16,
            fontSize: 11,
          }}>
            Demo Accounts (password: demo123)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO_USERS.map((user) => (
              <button
                key={user.username}
                type="button"
                onClick={() => handleDemoLogin(user)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: SURFACE.raised,
                  border: BORDER,
                  boxShadow: SHADOW,
                  color: '#F4F1E8',
                  fontFamily: FONT.body,
                  fontSize: 13,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'transform 0.05s, box-shadow 0.05s, background 0.1s',
                }}
                onMouseDown={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.boxShadow = SHADOW_PRESSED;
                    (e.currentTarget as HTMLElement).style.transform = 'translate(2px, 2px)';
                  }
                }}
                onMouseUp={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.boxShadow = SHADOW;
                    (e.currentTarget as HTMLElement).style.transform = 'translate(0, 0)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.boxShadow = SHADOW;
                    (e.currentTarget as HTMLElement).style.transform = 'translate(0, 0)';
                  }
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.background = SURFACE.panel;
                  }
                }}
              >
                <span>{user.label}</span>
                <span style={{
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  color: DOMAIN.spatial,
                  background: 'rgba(0, 229, 255, 0.1)',
                  padding: '2px 8px',
                  border: `2px solid ${DOMAIN.spatial}`,
                }}>
                  {user.role.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p style={{
          marginTop: 24,
          textAlign: 'center',
          fontSize: 11,
          color: '#6B7280',
          fontFamily: FONT.mono,
        }}>
          Smart India Hackathon 2026 · SIH26011
        </p>
      </motion.div>
    </div>
  );
}