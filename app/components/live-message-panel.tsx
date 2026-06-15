"use client";

import { useEffect, useState } from "react";

type ChatLog = {
  id: string;
  user_id: string | null;
  lark_message_id: string | null;
  question: string;
  answer: string | null;
  created_at: string;
};

type LatestResponse = {
  latest: ChatLog | null;
  error?: string;
};

export function LiveMessagePanel() {
  const [data, setData] = useState<LatestResponse>({ latest: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/monitor/latest", { cache: "no-store" });
        const json = (await res.json()) as LatestResponse;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    const timer = setInterval(load, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const latest = data.latest;
  const isPending = latest && !latest.answer;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.title}>Live received message</h2>
        <span style={styles.pill}>{loading ? "Loading" : isPending ? "Received" : "Answered"}</span>
      </div>

      {data.error ? (
        <p style={styles.error}>{data.error}</p>
      ) : latest ? (
        <>
          <div style={styles.meta}>Received at {new Date(latest.created_at).toLocaleString("vi-VN")}</div>
          <div style={styles.question}>{latest.question}</div>
          <div style={styles.answer}>
            {latest.answer ?? "Backend đã ghi nhận tin nhắn. Đang chờ xử lý tiếp."}
          </div>
        </>
      ) : (
        <p style={styles.empty}>Chưa có message nào được bot ghi nhận.</p>
      )}
    </div>
  );
}

const styles = {
  card: {
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "24px",
    background: "rgba(15, 23, 42, 0.72)",
    boxShadow: "0 24px 80px rgba(2, 6, 23, 0.35)",
    padding: "22px",
    backdropFilter: "blur(18px)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  title: {
    margin: 0,
    fontSize: "16px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "#93c5fd",
  },
  pill: {
    borderRadius: "999px",
    padding: "6px 10px",
    background: "rgba(59, 130, 246, 0.14)",
    color: "#bfdbfe",
    fontSize: "12px",
    border: "1px solid rgba(96, 165, 250, 0.28)",
  },
  meta: {
    marginTop: "18px",
    color: "#9fb0c6",
    fontSize: "13px",
  },
  question: {
    marginTop: "10px",
    padding: "14px 16px",
    borderRadius: "18px",
    background: "rgba(2, 6, 23, 0.42)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    color: "#f8fbff",
    fontSize: "15px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap" as const,
  },
  answer: {
    marginTop: "12px",
    padding: "14px 16px",
    borderRadius: "18px",
    background: "rgba(15, 23, 42, 0.92)",
    border: "1px solid rgba(34, 197, 94, 0.18)",
    color: "#d8e3f4",
    fontSize: "14px",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap" as const,
  },
  empty: {
    marginTop: "18px",
    color: "#9fb0c6",
    fontSize: "14px",
  },
  error: {
    marginTop: "18px",
    color: "#fca5a5",
    fontSize: "14px",
  },
} as const;
