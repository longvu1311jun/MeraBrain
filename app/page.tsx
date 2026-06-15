export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 32 }}>
      <h1>MERA Lark AI Bot</h1>
      <p>Backend webhook đang sẵn sàng.</p>
      <ul>
        <li>
          Health check: <code>/api/health</code>
        </li>
        <li>
          Lark event webhook: <code>/api/lark/events</code>
        </li>
      </ul>
    </main>
  );
}
