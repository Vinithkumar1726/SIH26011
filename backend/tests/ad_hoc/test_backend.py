#!/usr/bin/env python3
"""
Test script for SIH26011 backend
Run this after starting the backend to verify all endpoints work
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_endpoint(method, endpoint, data=None, files=None):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            if files:
                response = requests.post(url, files=files)
            elif data:
                response = requests.post(url, json=data)
            else:
                response = requests.post(url)
        else:
            print(f"❌ Unknown method: {method}")
            return False
        
        if response.status_code == 200:
            print(f"✅ {method} {endpoint} - {response.status_code}")
            return True
        else:
            print(f"❌ {method} {endpoint} - {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ {method} {endpoint} - ERROR: {e}")
        return False

def main():
    print("=" * 60)
    print("SIH26011 Backend Test Suite")
    print("=" * 60)
    print()
    
    # Check if backend is running
    print("Checking if backend is running...")
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=2)
        if response.status_code != 200:
            print("❌ Backend is not responding")
            sys.exit(1)
        print("✅ Backend is running")
    except:
        print("❌ Cannot connect to backend at http://localhost:8000")
        print("   Make sure backend is running: cd backend && python app.py")
        sys.exit(1)
    
    print()
    print("Testing endpoints...")
    print("-" * 60)
    
    passed = 0
    failed = 0
    
    # Test all endpoints
    tests = [
        ("GET", "/api/health"),
        ("GET", "/api/stats"),
        ("GET", "/api/parcels"),
        ("GET", "/api/statistics"),
        ("GET", "/api/statistics/buildings-by-height"),
        ("GET", "/api/statistics/validation-state"),
        ("GET", "/api/ai/candidates"),
        ("GET", "/api/ai/proposal"),
        ("GET", "/api/3d/geometry"),
        ("GET", "/api/spatial-identifiers"),
        ("GET", "/api/search?query=test"),
        ("GET", "/api/audit"),
        ("POST", "/api/validation/run"),
    ]
    
    for method, endpoint in tests:
        if test_endpoint(method, endpoint):
            passed += 1
        else:
            failed += 1
    
    print()
    print("-" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed > 0:
        sys.exit(1)
    
    print()
    print("✅ All endpoints working!")
    print()
    print("Next steps:")
    print("1. Start frontend: npm run dev")
    print("2. Open http://localhost:5173")
    print("3. Test import workflow with real GeoJSON files")

if __name__ == "__main__":
    main()
