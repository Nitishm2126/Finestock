import os
import sys
import json
import urllib.request
import urllib.error

# Ensure app can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

BASE_URL = "http://localhost:5000/api/auth"


def request(url: str, method: str = "GET", data: dict = None, token: str = None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}


def run_tests():
    # Pre-test cleanup for idempotence
    with engine.connect() as conn:
        conn.execute(
            text("DELETE FROM users WHERE email = :email"),
            {"email": "admin@finestock.com"}
        )
        conn.commit()

    print("--- 1. Testing Registration ---")
    reg_payload = {
        "organization_name": "Fine Stock Demo Corp",
        "first_name": "Admin",
        "last_name": "User",
        "email": "admin@finestock.com",
        "password": "StrongPassword123!",
    }
    status, res = request(f"{BASE_URL}/register", method="POST", data=reg_payload)
    print(f"Register status: {status}")
    assert status == 201, f"Expected 201, got {status}: {res}"
    assert res["success"] is True
    assert "access_token" in res
    token = res["access_token"]
    assert res["user"]["email"] == "admin@finestock.com"
    assert res["user"]["role"] == "ADMIN"
    assert "password" not in res["user"]
    assert "password_hash" not in res["user"]
    print("[OK] Registration passed! Token generated.")

    print("\n--- 2. Testing Password Storage in Database ---")
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT email, password_hash, is_active FROM users WHERE email = :email"),
            {"email": "admin@finestock.com"}
        ).fetchone()
        assert row is not None, "User not found in DB"
        email, pwd_hash, is_active = row
        print(f"Stored email: {email}")
        print(f"Stored hash prefix: {pwd_hash[:7]} (length: {len(pwd_hash)})")
        assert pwd_hash.startswith("$2b$") or pwd_hash.startswith("$2a$"), "Password is NOT a bcrypt hash!"
        assert "StrongPassword123!" not in pwd_hash, "Plaintext password leak detected!"
        assert is_active is True
    print("[OK] Database password security verified (Bcrypt hash enforced, no plaintext).")

    print("\n--- 3. Testing Duplicate Registration ---")
    status, res = request(f"{BASE_URL}/register", method="POST", data=reg_payload)
    print(f"Duplicate register status: {status}")
    assert status == 409, f"Expected 409, got {status}: {res}"
    print("[OK] Duplicate registration rejection passed.")

    print("\n--- 4. Testing Login (Valid Credentials) ---")
    login_payload = {
        "email": "admin@finestock.com",
        "password": "StrongPassword123!",
    }
    status, res = request(f"{BASE_URL}/login", method="POST", data=login_payload)
    print(f"Login status: {status}")
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res["success"] is True
    assert "access_token" in res
    login_token = res["access_token"]
    print("[OK] Login passed!")

    print("\n--- 5. Testing Login (Wrong Password) ---")
    bad_login = {
        "email": "admin@finestock.com",
        "password": "WrongPassword999!",
    }
    status, res = request(f"{BASE_URL}/login", method="POST", data=bad_login)
    print(f"Wrong password status: {status}")
    assert status == 401, f"Expected 401, got {status}: {res}"
    print("[OK] Wrong password rejection passed.")

    print("\n--- 6. Testing /api/auth/me (Valid Token) ---")
    status, res = request(f"{BASE_URL}/me", method="GET", token=login_token)
    print(f"/me status: {status}")
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res["user"]["email"] == "admin@finestock.com"
    assert res["user"]["role"] == "ADMIN"
    print("[OK] /api/auth/me authenticated profile retrieval passed.")

    print("\n--- 7. Testing /api/auth/me (Missing Token) ---")
    status, res = request(f"{BASE_URL}/me", method="GET")
    print(f"/me without token status: {status}")
    assert status == 401, f"Expected 401, got {status}: {res}"
    print("[OK] Missing token rejection passed.")

    print("\n--- 8. Testing /api/auth/me (Invalid Token) ---")
    status, res = request(f"{BASE_URL}/me", method="GET", token="invalid.token.here")
    print(f"/me with invalid token status: {status}")
    assert status == 401, f"Expected 401, got {status}: {res}"
    print("[OK] Invalid token rejection passed.")

    print("\n==============================================")
    print("ALL BACKEND AUTHENTICATION TESTS PASSED 100%!")
    print("==============================================")


if __name__ == "__main__":
    run_tests()
