import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Dataset {
  id: string;
  filename: string;
  row_count: number;
  column_count: number;
  columns: string[];
  data: Record<string, any>[];
  summary: Record<string, any>;
  created_at: string;
}

export const useDataset = () => {
  const { user } = useAuth();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLatestDataset = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("datasets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setDataset({
        ...data,
        data: (data.data as any) || [],
        summary: (data.summary as any) || {},
      });
    } else {
      setDataset(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLatestDataset();
  }, [user]);

  return { dataset, loading, refetch: fetchLatestDataset };
};
