import { supabase } from "./supabase"

/**
 * Check if the main table ("courses") exists.
 * Returns `true` if it does, `false` otherwise.
 */
export async function checkTablesExist(): Promise<boolean> {
  try {
    const { error } = await supabase.from("courses").select("id", { head: true, limit: 1 }) // head → no rows

    // PostgREST error code for “relation does not exist”
    if (error && error.code === "PGRST116") return false

    return !error
  } catch {
    return false
  }
}

/**
 * Create (or recreate) the schema: courses → lessons → donations.
 * Triggered by the “Setup Database” buttons in the UI.
 */
export async function createTables(): Promise<{ success: boolean; error?: unknown }> {
  try {
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Drop in dependency-safe order
        DROP TABLE IF EXISTS donations;
        DROP TABLE IF EXISTS lessons;
        DROP TABLE IF EXISTS courses;

        /* ---------- courses ---------- */
        CREATE TABLE courses (
          id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title          VARCHAR(255) NOT NULL,
          description    TEXT,
          creator_wallet VARCHAR(42)  NOT NULL,
          created_at     TIMESTAMPTZ  DEFAULT now(),
          updated_at     TIMESTAMPTZ  DEFAULT now()
        );

        /* ---------- lessons ---------- */
        CREATE TABLE lessons (
          id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          course_id    UUID REFERENCES courses(id) ON DELETE CASCADE,
          title        VARCHAR(255) NOT NULL,
          description  TEXT,
          youtube_url  VARCHAR(500) NOT NULL,
          order_index  INT  NOT NULL DEFAULT 0,
          created_at   TIMESTAMPTZ DEFAULT now(),
          updated_at   TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX idx_lessons_course ON lessons(course_id, order_index);

        /* ---------- donations ---------- */
        CREATE TABLE donations (
          id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          course_id     UUID REFERENCES courses(id) ON DELETE CASCADE,
          donor_wallet  VARCHAR(42) NOT NULL,
          amount        VARCHAR(50) NOT NULL,
          tx_hash       VARCHAR(66) NOT NULL,
          created_at    TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX idx_donations_course ON donations(course_id);
      `,
    })

    if (error) return { success: false, error }
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}
