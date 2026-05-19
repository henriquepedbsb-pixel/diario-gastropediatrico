import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h2 style={{ color: '#dc2626' }}>Algo deu errado</h2>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
            Tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1.5rem',
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>
            Recarregar
          </button>
          <details style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            <summary>Detalhes do erro</summary>
            <pre style={{ textAlign: 'left', overflowX: 'auto' }}>
              {this.state.error.toString()}
            </pre>
          </details>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
