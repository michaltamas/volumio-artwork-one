/**
 * A screen that throws while rendering must not take the whole interface down to a blank page:
 * the rail and the player stay, the screen's place says what happened, and a reload is one tap away.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import Icon from './Icon';

interface Props { children: ReactNode; name?: string }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[artwork] screen failed', this.props.name || '', error, info.componentStack); }
  render() {
    const { error } = this.state;
    if (!error) { return this.props.children; }
    return (
      <div className="aw-crash" role="alert">
        <Icon name="error" />
        <h2 className="aw-crash__title">This screen could not be shown</h2>
        <p className="aw-crash__text">Something on it went wrong. Reloading usually helps; if it keeps happening, please report it with the line below.</p>
        <pre className="aw-crash__detail mono">{String(error && error.message || error)}</pre>
        <div className="aw-crash__actions">
          <button type="button" className="aw-btn aw-btn--primary" onClick={() => window.location.reload()}><span>Reload</span></button>
          <button type="button" className="aw-btn" onClick={() => { this.setState({ error: null }); window.history.back(); }}><span>Go back</span></button>
        </div>
      </div>
    );
  }
}
