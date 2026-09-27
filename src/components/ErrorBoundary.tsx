/**
 * SIH26011 - Error Boundary
 * Catches Three.js/WebGL crashes gracefully
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { DOMAIN, SURFACE, BORDER, SHADOW, FONT, LABEL, onDomain } from '../design/tokens';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Could send to error reporting service here
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
          padding: 32,
          background: SURFACE.panel,
          border: BORDER,
          boxShadow: SHADOW,
          fontFamily: FONT.body,
          color: '#F4F1E8',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: `rgba(255, 59, 48, 0.15)`,
            border: `3px solid ${DOMAIN.conflict}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            fontSize: 28,
          }}>
            ⚠
          </div>

          <h2 style={{
            fontFamily: FONT.display,
            fontSize: 20,
            fontWeight: 600,
            margin: '0 0 12px',
            color: DOMAIN.conflict,
          }}>
            3D View Crashed
          </h2>

          <p style={{
            margin: '0 0 24px',
            color: '#9AA3B2',
            maxWidth: 400,
            lineHeight: 1.5,
          }}>
            The 3D renderer encountered an error. This can happen with complex scenes or 
            insufficient GPU memory. Your data is safe.
          </p>

          {this.state.error && (
            <details style={{
              textAlign: 'left',
              width: '100%',
              maxWidth: 500,
              marginBottom: 24,
              fontFamily: FONT.mono,
              fontSize: 11,
              color: '#6B7280',
            }}>
              <summary style={{ cursor: 'pointer', color: '#9AA3B2' }}>
                Error Details
              </summary>
              <pre style={{
                marginTop: 12,
                padding: 12,
                background: SURFACE.input,
                border: `2px solid #000`,
                overflow: 'auto',
                maxHeight: 200,
              }}>
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                background: DOMAIN.spatial,
                color: onDomain('spatial'),
                border: BORDER,
                boxShadow: SHADOW,
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              Retry 3D View
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: SURFACE.raised,
                color: '#F4F1E8',
                border: BORDER,
                boxShadow: SHADOW,
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}