// サーバー専用の Supabase クライアント（service_role 鍵・スキーマ taikyokukan 固定）
// ⚠️ このファイルをブラウザ側コードから import しないこと
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type TaikyokukanClient = SupabaseClient<any, any, "taikyokukan">;

let client: TaikyokukanClient | null = null;

export function supabaseServer(): TaikyokukanClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase の環境変数が設定されていません");
  client = createClient(url, key, {
    db: { schema: "taikyokukan" },
    auth: { persistSession: false },
  });
  return client;
}
