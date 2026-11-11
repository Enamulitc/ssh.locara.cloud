/**
 * Translates common psql backslash meta-commands into real SQL, since these are normally
 * handled client-side by the real `psql` binary and are meaningless to the Postgres server
 * itself (it correctly rejects them as a syntax error). Only covers PostgreSQL — MySQL's
 * CLI equivalents (SHOW DATABASES, SHOW TABLES, DESCRIBE ...) are already valid SQL the
 * server understands natively, so no translation is needed there.
 */
export type PsqlMetaCommand =
  | { kind: "sql"; sql: string }
  | { kind: "connect"; database: string }
  | { kind: "help"; text: string }
  | { kind: "unsupported"; command: string };

const HELP_TEXT = [
  "Supported meta-commands:",
  "  \\l                 list databases",
  "  \\dn                list schemas",
  "  \\dt                list tables in the search path",
  "  \\d <table>         describe a table's columns",
  "  \\du                list roles",
  "  \\c <database>      switch to another database on this connection",
  "  \\?                 this help",
].join("\r\n");

export function translatePsqlMeta(input: string): PsqlMetaCommand | null {
  if (!input.startsWith("\\")) return null;

  const [command, ...rest] = input.split(/\s+/);
  const arg = rest.join(" ").trim();

  switch (command) {
    case "\\l":
    case "\\list":
      return {
        kind: "sql",
        sql: "SELECT datname AS name, pg_catalog.pg_get_userbyid(datdba) AS owner, pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datistemplate = false ORDER BY 1",
      };
    case "\\dn":
      return { kind: "sql", sql: "SELECT schema_name FROM information_schema.schemata ORDER BY 1" };
    case "\\dt":
      return {
        kind: "sql",
        sql: "SELECT schemaname AS schema, tablename AS table FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1, 2",
      };
    case "\\du":
      return {
        kind: "sql",
        sql: "SELECT rolname AS role, rolsuper AS superuser, rolcreatedb AS create_db, rolcanlogin AS can_login FROM pg_roles ORDER BY 1",
      };
    case "\\d":
      if (!arg) return { kind: "unsupported", command: "\\d (missing table name — try \\dt to list tables)" };
      return {
        kind: "sql",
        sql: `SELECT column_name AS column, data_type AS type, is_nullable AS nullable, column_default AS default FROM information_schema.columns WHERE table_name = '${arg.replace(/'/g, "''")}' ORDER BY ordinal_position`,
      };
    case "\\c":
    case "\\connect":
      if (!arg) return { kind: "unsupported", command: "\\c (missing database name)" };
      return { kind: "connect", database: arg };
    case "\\?":
    case "\\h":
      return { kind: "help", text: HELP_TEXT };
    default:
      return { kind: "unsupported", command };
  }
}
