import type { CSSProperties } from "react";
import { LiveMessagePanel } from "./components/live-message-panel";

const endpoints = [
  { name: "POST /api/lark/events", detail: "Lark webhook receiver for messages and callbacks." },
  { name: "POST /api/lark/sync-wiki", detail: "Sync folder content into Supabase with embeddings." },
  { name: "POST /api/lark/ask", detail: "Ask the wiki and get a grounded answer." },
];

const checks = [
  "Vercel deploy is live",
  "Supabase schema is applied",
  "OpenAI and Lark env vars are configured",
];

export default function HomePage() {
  return (
    <main style={styles.shell}>
      <section style={styles.hero}>
        <div style={styles.badge}>Mera Brain</div>
        <h1 style={styles.title}>Lark wiki bot, deployed and ready.</h1>
        <p style={styles.subtitle}>
          This project powers Lark event handling, wiki sync, and retrieval-based answers backed by Supabase and OpenAI.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Status</h2>
            <ul style={styles.list}>
              {checks.map((item) => (
                <li key={item} style={styles.listItem}>
                  <span style={styles.dot} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <LiveMessagePanel />

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>API</h2>
            <div style={styles.endpointList}>
              {endpoints.map((endpoint) => (
                <div key={endpoint.name} style={styles.endpoint}>
                  <div style={styles.endpointName}>{endpoint.name}</div>
                  <div style={styles.endpointDetail}>{endpoint.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(33, 150, 243, 0.16), transparent 34%), linear-gradient(180deg, #07111f 0%, #0b1220 44%, #0f172a 100%)",
    color: "#e5eefb",
    display: "grid",
    placeItems: "center",
    padding: "32px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  hero: {
    width: "min(980px, 100%)",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: "999px",
    padding: "8px 14px",
    background: "rgba(15, 23, 42, 0.66)",
    color: "#93c5fd",
    fontSize: "13px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "20px",
  },
  title: {
    margin: 0,
    fontSize: "clamp(42px, 7vw, 74px)",
    lineHeight: 0.98,
    letterSpacing: "-0.05em",
    maxWidth: "11ch",
  },
  subtitle: {
    margin: "18px 0 0",
    maxWidth: "62ch",
    fontSize: "18px",
    lineHeight: 1.7,
    color: "#a7b5ca",
  },
  grid: {
    marginTop: "34px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },
  card: {
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "24px",
    background: "rgba(15, 23, 42, 0.72)",
    boxShadow: "0 24px 80px rgba(2, 6, 23, 0.35)",
    padding: "22px",
    backdropFilter: "blur(18px)",
  },
  cardTitle: {
    margin: 0,
    fontSize: "16px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#93c5fd",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: "18px 0 0",
    display: "grid",
    gap: "12px",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#d8e3f4",
    fontSize: "15px",
  },
  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #38bdf8, #22c55e)",
    boxShadow: "0 0 0 6px rgba(56, 189, 248, 0.12)",
    flex: "0 0 auto",
  },
  endpointList: {
    marginTop: "18px",
    display: "grid",
    gap: "14px",
  },
  endpoint: {
    borderRadius: "18px",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    background: "rgba(2, 6, 23, 0.35)",
    padding: "16px",
  },
  endpointName: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#f8fbff",
  },
  endpointDetail: {
    marginTop: "6px",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#9fb0c6",
  },
};
