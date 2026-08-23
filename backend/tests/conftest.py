import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path):
    os.environ["VIRALY_DATABASE_PATH"] = str(tmp_path / "test.db")
    os.environ["VIRALY_DEV_TOKEN"] = "dev-tests"

    from app.config import Settings
    from app.database import Database
    from app.main import app

    app.state.db = Database(Settings().database_path)
    app.state.db.ensure_dev_session("dev-tests", "Test creator")
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def auth_headers():
    return {"Authorization": "Bearer dev-tests"}

