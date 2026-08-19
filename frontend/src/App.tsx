import './App.css'

const completedDocs = [
  'Project Brief',
  'Tech Stack',
  'Database Design',
  'API Requirements',
  'Sprint Plan',
  'ERD',
  'System Flow',
  'Data Flow Diagram',
]

const nextSteps = [
  'Configure Entity Framework Core',
  'Connect PostgreSQL',
  'Create initial entities',
  'Implement authentication foundation',
]

function App() {
  return (
    <main className="app-shell">
      <section className="hero-section">
        <p className="eyebrow">Sprint 1 / Project Setup</p>
        <h1>Rodeo Barber Shop Management System</h1>
        <p className="hero-copy">
          Backend and frontend scaffolds are ready. The next milestone is the
          database and authentication foundation.
        </p>
      </section>

      <section className="status-grid" aria-label="Project status">
        <article className="status-card">
          <span className="status-label">Backend</span>
          <strong>ASP.NET Core Web API</strong>
          <p>Health endpoint and Swagger UI are configured.</p>
          <code>GET /api/health</code>
        </article>

        <article className="status-card">
          <span className="status-label">Frontend</span>
          <strong>React + TypeScript + Vite</strong>
          <p>Client app scaffold is ready for feature screens.</p>
          <code>npm run dev</code>
        </article>

        <article className="status-card">
          <span className="status-label">API Docs</span>
          <strong>Swagger UI</strong>
          <p>Interactive API testing is available while the backend runs.</p>
          <code>/swagger</code>
        </article>
      </section>

      <section className="content-grid">
        <div>
          <h2>Documentation Ready</h2>
          <ul className="check-list">
            {completedDocs.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2>Next Steps</h2>
          <ol className="step-list">
            {nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}

export default App
