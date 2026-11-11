import type { FastifyInstance } from "fastify";
import mysql, { type Connection as MysqlConnection, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";
import pg from "pg";
import { requireAuth } from "../lib/auth.js";
import { canAccessDbConnection } from "../lib/dbAccess.js";
import { loadDbConnectionConfig, openTunnel, type Tunnel } from "../lib/dbConnection.js";
import { formatTable } from "../lib/formatTable.js";
import { translatePsqlMeta } from "../lib/psqlMeta.js";
import { prisma } from "../lib/prisma.js";

type ClientMessage =
  | { type: "data"; data: string }
  | { type: "resize"; cols: number; rows: number };

type ServerMessage =
  | { type: "data"; data: string }
  | { type: "error"; message: string }
  | { type: "exit" };

type Driver = { engine: "MYSQL"; conn: MysqlConnection } | { engine: "POSTGRES"; conn: pg.Client };

interface QueryResult {
  columns: string[];
  rows: unknown[][];
  message?: string;
}

async function runQuery(driver: Driver, sql: string): Promise<QueryResult> {
  if (driver.engine === "MYSQL") {
    const [result, fields] = await driver.conn.query(sql);
    if (Array.isArray(result)) {
      const columns = (fields ?? []).map((f) => f.name);
      const rows = (result as RowDataPacket[]).map((row) => columns.map((c) => row[c]));
      return { columns, rows };
    }
    const header = result as ResultSetHeader;
    return { columns: [], rows: [], message: `OK, ${header.affectedRows} row(s) affected` };
  }

  const result = await driver.conn.query(sql);
  const columns = result.fields.map((f) => f.name);
  if (columns.length === 0) {
    return { columns: [], rows: [], message: `OK, ${result.rowCount ?? 0} row(s) affected` };
  }
  const rows = result.rows.map((row) => columns.map((c) => row[c]));
  return { columns, rows };
}

export async function dbWsRoutes(app: FastifyInstance) {
  app.get(
    "/ws/db/:connectionId",
    { websocket: true, preHandler: requireAuth },
    async (socket, request) => {
      const { connectionId } = request.params as { connectionId: string };
      const send = (msg: ServerMessage) => socket.send(JSON.stringify(msg));

      if (!(await canAccessDbConnection(request.user!.id, connectionId))) {
        send({ type: "error", message: "Database connection not found or access denied" });
        socket.close();
        return;
      }

      let config: Awaited<ReturnType<typeof loadDbConnectionConfig>>;
      try {
        config = await loadDbConnectionConfig(connectionId);
      } catch {
        send({ type: "error", message: "Could not load connection credentials" });
        socket.close();
        return;
      }

      let tunnel: Tunnel | null = null;
      let driver: Driver | null = null;
      let host = config.host;
      let port = config.port;

      function cleanup() {
        if (driver?.engine === "MYSQL") driver.conn.end().catch(() => {});
        else if (driver?.engine === "POSTGRES") driver.conn.end().catch(() => {});
        tunnel?.close();
      }

      // The underlying connection can emit a bare "error" at any time (dropped
      // connection, server restart) independent of any in-flight query — an
      // EventEmitter with no "error" listener throws and crashes the whole process,
      // so this must be attached unconditionally, not just around individual queries.
      function onConnectionError(connErr: Error) {
        send({ type: "data", data: `\r\nConnection lost: ${connErr.message}\r\n` });
        send({ type: "exit" });
        cleanup();
        socket.close();
      }

      async function connectDriver(database: string): Promise<Driver> {
        if (config.engine === "MYSQL") {
          const conn = await mysql.createConnection({ host, port, user: config.username, password: config.password, database });
          conn.on("error", onConnectionError);
          return { engine: "MYSQL", conn };
        }
        const conn = new pg.Client({ host, port, user: config.username, password: config.password, database });
        await conn.connect();
        conn.on("error", onConnectionError);
        return { engine: "POSTGRES", conn };
      }

      try {
        if (config.tunnelHostId) {
          tunnel = await openTunnel(config.tunnelHostId, config.host, config.port);
          host = "127.0.0.1";
          port = tunnel.port;
        }
        driver = await connectDriver(config.database);
      } catch (err) {
        send({ type: "error", message: `Could not connect: ${(err as Error).message}` });
        cleanup();
        socket.close();
        return;
      }

      prisma.dbConnection.update({ where: { id: connectionId }, data: { lastConnectedAt: new Date() } }).catch(() => {});

      let currentDatabase = config.database;
      let prompt = `${currentDatabase}> `;
      let buffer = "";
      let inEscape = false;

      send({
        type: "data",
        data: `Connected to ${config.engine === "MYSQL" ? "MySQL" : "PostgreSQL"} (${config.database}).\r\n${prompt}`,
      });

      // Process messages one at a time (never two queries concurrently on one connection).
      const inbox: string[] = [];
      let draining = false;

      async function drain() {
        if (draining) return;
        draining = true;
        while (inbox.length > 0) {
          const data = inbox.shift()!;
          await handleData(data);
        }
        draining = false;
      }

      async function handleData(data: string) {
        for (const ch of data) {
          const code = ch.charCodeAt(0);

          if (inEscape) {
            if (/[a-zA-Z~]/.test(ch)) inEscape = false;
            continue;
          }
          if (code === 0x1b) {
            inEscape = true;
            continue;
          }
          if (code === 0x03) {
            buffer = "";
            send({ type: "data", data: `^C\r\n${prompt}` });
            continue;
          }
          if (ch === "\r" || ch === "\n") {
            send({ type: "data", data: "\r\n" });
            const sql = buffer.trim();
            buffer = "";
            if (!sql) {
              send({ type: "data", data: prompt });
              continue;
            }
            const meta = config.engine === "POSTGRES" ? translatePsqlMeta(sql) : null;

            if (meta?.kind === "help") {
              send({ type: "data", data: `${meta.text}\r\n${prompt}` });
              continue;
            }
            if (meta?.kind === "unsupported") {
              send({ type: "data", data: `Unsupported meta-command: ${meta.command}. Try \\?\r\n${prompt}` });
              continue;
            }
            if (meta?.kind === "connect") {
              try {
                const nextDriver = await connectDriver(meta.database);
                if (driver?.engine === "MYSQL") driver.conn.end().catch(() => {});
                else if (driver?.engine === "POSTGRES") driver.conn.end().catch(() => {});
                driver = nextDriver;
                currentDatabase = meta.database;
                prompt = `${currentDatabase}> `;
                send({ type: "data", data: `Connected to ${currentDatabase}.\r\n${prompt}` });
              } catch (err) {
                send({ type: "data", data: `ERROR: ${(err as Error).message}\r\n${prompt}` });
              }
              continue;
            }

            const effectiveSql = meta?.kind === "sql" ? meta.sql : sql;
            try {
              const result = await runQuery(driver!, effectiveSql);
              const text =
                result.columns.length > 0 ? formatTable(result.columns, result.rows) : `${result.message}\r\n`;
              send({ type: "data", data: text + prompt });
            } catch (err) {
              send({ type: "data", data: `ERROR: ${(err as Error).message}\r\n${prompt}` });
            }
            continue;
          }
          if (code === 0x7f || code === 0x08) {
            if (buffer.length > 0) {
              buffer = buffer.slice(0, -1);
              send({ type: "data", data: "\b \b" });
            }
            continue;
          }
          if (code < 0x20) continue;

          buffer += ch;
          send({ type: "data", data: ch });
        }
      }

      socket.on("message", (raw: Buffer) => {
        let msg: ClientMessage;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (msg.type === "data") {
          inbox.push(msg.data);
          drain();
        }
        // resize is a no-op — this console has no real pty to resize.
      });

      socket.on("close", cleanup);
    }
  );
}
