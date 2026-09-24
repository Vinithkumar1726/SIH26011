"""Bulk-approve all pending AI proposals (demo prep).

Reads the live review queue and APPROVES every REVIEW_REQUIRED proposal so
approved parcels materialize into cadastral_parcels for the 3D scene.
Run only when the backend is live: python bulk_approve.py
"""
import requests

BASE = "http://127.0.0.1:8000"


def main():
    cands = requests.get(f"{BASE}/api/ai/candidates", timeout=30).json()
    ids = [p["id"] for p in cands.get("proposals", [])]
    total = len(ids)
    print(f"Pending proposals: {total}")
    for i, pid in enumerate(ids, 1):
        r = requests.post(
            f"{BASE}/api/ai/review/{pid}",
            json={"decision": "APPROVED"},
            timeout=60,
        )
        status = r.json().get("status", f"HTTP {r.status_code}")
        print(f"Approved {i}/{total}... ({status})")
    print(f"Approved {total}/{total}. Done!")


if __name__ == "__main__":
    main()
