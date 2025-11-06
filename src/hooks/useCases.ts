import { useEffect, useState } from "react";

export function useCases() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const r = await fetch(`${API_URL}/api/cases`);
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        setCases(data);
      } catch (e: any) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { cases, loading, error };
}
