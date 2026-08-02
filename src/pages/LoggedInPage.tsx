type LoggedInPageProps = {
  email: string
  apiError: string
  apiResponse: string
  isTestingBackend: boolean
  onSignOut: () => Promise<void>
  onTestBackend: () => Promise<void>
}

export function LoggedInPage({
  email,
  apiError,
  apiResponse,
  isTestingBackend,
  onSignOut,
  onTestBackend,
}: LoggedInPageProps) {
  return (
    <section className="auth-section" aria-label="Authenticated admin session">
      <h2 className="login-title">Signed in</h2>
      <p className="login-subtitle">
        Authenticated as <strong>{email}</strong>.
      </p>

      <div className="auth-actions">
        <button type="button" onClick={() => void onTestBackend()} disabled={isTestingBackend}>
          {isTestingBackend ? 'Testing backend...' : 'Test POST /v1/events'}
        </button>
        <button type="button" className="secondary-button" onClick={() => void onSignOut()}>
          Sign out
        </button>
      </div>

      {apiError ? <p className="error-text">{apiError}</p> : null}
      {apiResponse ? <pre className="api-response">{apiResponse}</pre> : null}
    </section>
  )
}
