#!/bin/bash
# SIH26011 - Master Test Script
# This script tests all components of the system

echo "=========================================="
echo "SIH26011 - Master Test Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo "Test $TOTAL_TESTS: $test_name"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Test 1: SAT Algorithm
echo "=========================================="
echo "Testing SAT Overlap Detection Algorithm"
echo "=========================================="
run_test "SAT Algorithm Tests" "python test_sat.py"

# Test 2: Backend Compilation
echo "=========================================="
echo "Testing Backend Code"
echo "=========================================="
run_test "Backend Syntax Check" "python -m py_compile backend/app.py"

# Test 3: Frontend Build
echo "=========================================="
echo "Testing Frontend Build"
echo "=========================================="
run_test "Frontend TypeScript Check" "npm run typecheck"
run_test "Frontend Build" "npm run build"

# Test 4: Backend Endpoints (if backend is running)
echo "=========================================="
echo "Testing Backend Endpoints"
echo "=========================================="
echo "Note: Backend must be running on http://localhost:8000"
echo "Start backend with: cd backend && python app.py"
echo ""

if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    run_test "Backend API Tests" "python test_backend.py"
else
    echo -e "${YELLOW}⚠ Backend not running - skipping API tests${NC}"
    echo "  To test backend endpoints:"
    echo "  1. Start backend: cd backend && python app.py"
    echo "  2. Run: python test_backend.py"
    echo ""
fi

# Test 5: Database Schema
echo "=========================================="
echo "Testing Database Schema"
echo "=========================================="
echo "Note: PostgreSQL with PostGIS must be running"
echo ""

if command -v psql &> /dev/null; then
    if psql -U postgres -d sih26011 -c "SELECT 1;" > /dev/null 2>&1; then
        run_test "Database Connection" "psql -U postgres -d sih26011 -c 'SELECT PostGIS_Version();' > /dev/null"
        run_test "Schema Tables Exist" "psql -U postgres -d sih26011 -c '\dt' | grep -q land_parcel"
    else
        echo -e "${YELLOW}⚠ Database not accessible - skipping database tests${NC}"
        echo "  To test database:"
        echo "  1. Ensure PostgreSQL is running"
        echo "  2. Create database: psql -U postgres -c 'CREATE DATABASE sih26011;'"
        echo "  3. Run migration: psql -U postgres -d sih26011 -f migrations/001_initial_schema.sql"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠ psql not found - skipping database tests${NC}"
    echo ""
fi

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total Tests:  $TOTAL_TESTS"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start backend: cd backend && python app.py"
    echo "2. Start frontend: npm run dev"
    echo "3. Open http://localhost:5173"
    echo "4. Test import workflow with files in test-data/"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Please review the failed tests above and fix the issues."
    exit 1
fi
