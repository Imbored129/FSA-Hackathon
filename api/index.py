import sys
import os

# Add backend directory to path so main.py and its imports work
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from main import app
