import { useState, useEffect, useCallback } from "react";
import { getDashboard } from "../services/api";
import { useEvent } from "./useEvent";

export function useDashboardData() {
  const { currentEventId } = useEvent();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDashboard(currentEventId);
      setData(res);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [currentEventId]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await getDashboard(currentEventId);
        if (!ignore) {
          setData(res);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Dashboard fetch error:", err);
          setError(err.message || "Failed to load dashboard data");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [currentEventId]);

  return { data, loading, error, refetch: fetchDashboard };
}
