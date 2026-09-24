"""pytest configuration for backend tests"""
import sys
from pathlib import Path

# Add backend directory to Python path so 'app' module can be imported
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Ad-hoc request scripts parked under tests/ad_hoc are archival material,
# not pytest tests (import-time HTTP, stale imports, live writes).
# Keep the canonical suite hermetic: never collect them.
collect_ignore = ["tests/ad_hoc"]