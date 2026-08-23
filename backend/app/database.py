from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Database:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.lock = threading.RLock()
        self._migrate()

    def _migrate(self) -> None:
        with self.lock, self.connection:
            self.connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT,
                    name TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    expires_at TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );
                CREATE TABLE IF NOT EXISTS ai_usage (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    feature TEXT NOT NULL,
                    model TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS analyses (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS strategies (
                    user_id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS calendar_events (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    time TEXT NOT NULL,
                    type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    hook TEXT NOT NULL,
                    cta TEXT NOT NULL,
                    status TEXT NOT NULL,
                    source TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_events_user_date
                    ON calendar_events(user_id, date, time);
                CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created
                    ON ai_usage(user_id, created_at);
                """
            )

    def ensure_dev_session(self, token: str, name: str = "Créateur test") -> str:
        user_id = f"usr_{token.removeprefix('dev-')[:32] or 'preview'}"
        created_at = now_iso()
        with self.lock, self.connection:
            self.connection.execute(
                "INSERT OR IGNORE INTO users(id, name, created_at) VALUES (?, ?, ?)",
                (user_id, name, created_at),
            )
            self.connection.execute(
                "INSERT OR REPLACE INTO sessions(token, user_id, created_at) VALUES (?, ?, ?)",
                (token, user_id, created_at),
            )
        return user_id

    def ensure_preview_session(
        self, token: str, user_id: str, expires_at: str, name: str = "Créateur test"
    ) -> str:
        created_at = now_iso()
        with self.lock, self.connection:
            self.connection.execute(
                "INSERT OR IGNORE INTO users(id, name, created_at) VALUES (?, ?, ?)",
                (user_id, name, created_at),
            )
            self.connection.execute(
                "INSERT OR REPLACE INTO sessions(token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
                (token, user_id, expires_at, created_at),
            )
        return user_id

    def user_for_session(self, token: str) -> str | None:
        row = self.connection.execute(
            "SELECT user_id, expires_at FROM sessions WHERE token = ?", (token,)
        ).fetchone()
        if not row:
            return None
        if row["expires_at"] and row["expires_at"] < now_iso():
            return None
        return str(row["user_id"])

    def record_ai_usage(self, user_id: str, feature: str, model: str) -> None:
        with self.lock, self.connection:
            self.connection.execute(
                "INSERT INTO ai_usage(id, user_id, feature, model, created_at) VALUES (?, ?, ?, ?, ?)",
                (f"ai_{uuid.uuid4().hex}", user_id, feature, model, now_iso()),
            )

    def daily_ai_usage(self, user_id: str) -> int:
        day = now_iso()[:10]
        row = self.connection.execute(
            "SELECT COUNT(*) AS count FROM ai_usage WHERE user_id = ? AND substr(created_at, 1, 10) = ?",
            (user_id, day),
        ).fetchone()
        return int(row["count"] if row else 0)

    def save_analysis(self, user_id: str, kind: str, payload: dict[str, Any]) -> str:
        analysis_id = f"ana_{uuid.uuid4().hex}"
        with self.lock, self.connection:
            self.connection.execute(
                "INSERT INTO analyses(id, user_id, kind, payload, created_at) VALUES (?, ?, ?, ?, ?)",
                (analysis_id, user_id, kind, json.dumps(payload), now_iso()),
            )
        return analysis_id

    def latest_analysis(self, user_id: str, kind: str) -> dict[str, Any] | None:
        row = self.connection.execute(
            "SELECT payload FROM analyses WHERE user_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 1",
            (user_id, kind),
        ).fetchone()
        return json.loads(row["payload"]) if row else None

    def save_strategy(self, user_id: str, payload: dict[str, Any]) -> None:
        with self.lock, self.connection:
            self.connection.execute(
                "INSERT OR REPLACE INTO strategies(user_id, payload, updated_at) VALUES (?, ?, ?)",
                (user_id, json.dumps(payload), now_iso()),
            )

    def get_strategy(self, user_id: str) -> dict[str, Any] | None:
        row = self.connection.execute(
            "SELECT payload FROM strategies WHERE user_id = ?", (user_id,)
        ).fetchone()
        return json.loads(row["payload"]) if row else None

    def list_events(self, user_id: str, start: str | None, end: str | None) -> list[dict[str, Any]]:
        query = "SELECT * FROM calendar_events WHERE user_id = ?"
        params: list[Any] = [user_id]
        if start:
            query += " AND date >= ?"
            params.append(start)
        if end:
            query += " AND date <= ?"
            params.append(end)
        query += " ORDER BY date, time"
        rows = self.connection.execute(query, params).fetchall()
        return [dict(row) for row in rows]

    def create_event(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        event_id = f"evt_{uuid.uuid4().hex}"
        timestamp = now_iso()
        record = {
            "id": event_id,
            "user_id": user_id,
            "status": payload.get("status", "planned"),
            "source": payload.get("source", "manual"),
            "created_at": timestamp,
            "updated_at": timestamp,
            **payload,
        }
        fields = [
            "id", "user_id", "date", "time", "type", "title", "hook", "cta",
            "status", "source", "created_at", "updated_at",
        ]
        with self.lock, self.connection:
            self.connection.execute(
                f"INSERT INTO calendar_events({','.join(fields)}) VALUES ({','.join('?' for _ in fields)})",
                [record[field] for field in fields],
            )
        return record

    def update_event(self, user_id: str, event_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        current = self.connection.execute(
            "SELECT * FROM calendar_events WHERE id = ? AND user_id = ?", (event_id, user_id)
        ).fetchone()
        if not current:
            return None
        allowed = {"date", "time", "type", "title", "hook", "cta", "status"}
        updates = {key: value for key, value in payload.items() if key in allowed and value is not None}
        updates["updated_at"] = now_iso()
        assignments = ", ".join(f"{key} = ?" for key in updates)
        with self.lock, self.connection:
            self.connection.execute(
                f"UPDATE calendar_events SET {assignments} WHERE id = ? AND user_id = ?",
                [*updates.values(), event_id, user_id],
            )
        row = self.connection.execute(
            "SELECT * FROM calendar_events WHERE id = ?", (event_id,)
        ).fetchone()
        return dict(row) if row else None

    def delete_event(self, user_id: str, event_id: str) -> bool:
        with self.lock, self.connection:
            cursor = self.connection.execute(
                "DELETE FROM calendar_events WHERE id = ? AND user_id = ?", (event_id, user_id)
            )
        return cursor.rowcount > 0
