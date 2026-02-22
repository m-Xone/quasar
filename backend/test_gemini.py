#!/usr/bin/env python3
"""
Test script to verify Google GenAI SDK setup and connection.

Usage:
    python test_gemini.py

This script will:
1. Check if the google-genai package is installed
2. Verify API key is configured
3. Test basic connection to Gemini API
4. Display available models
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

def test_imports():
    """Test if required packages are installed"""
    print("Testing imports...")
    try:
        from google import genai
        from google.genai import types
        print("✅ google-genai package is installed")
        return True
    except ImportError as e:
        print(f"❌ Failed to import google-genai: {e}")
        print("\nInstall with: pip install google-genai")
        return False


def test_env_variables():
    """Test if environment variables are set"""
    print("\nTesting environment variables...")

    # Try to load from .env file
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        print("❌ GOOGLE_API_KEY not found or not set")
        print("\nSet your API key in backend/.env:")
        print("  GOOGLE_API_KEY=your_actual_api_key")
        print("\nGet your API key: https://aistudio.google.com/app/apikey")
        return False

    print(f"✅ GOOGLE_API_KEY is set (ends with: ...{api_key[-4:]})")
    return True


def test_client_initialization():
    """Test if we can initialize the Gemini client"""
    print("\nTesting client initialization...")
    try:
        from dotenv import load_dotenv
        load_dotenv()

        from google import genai

        api_key = os.getenv("GOOGLE_API_KEY")
        client = genai.Client(api_key=api_key)

        print("✅ Client initialized successfully")
        return client
    except Exception as e:
        print(f"❌ Failed to initialize client: {e}")
        return None


def test_basic_generation(client):
    """Test basic text generation"""
    print("\nTesting basic text generation...")
    try:
        model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
        print(f"Using model: {model}")

        response = client.models.generate_content(
            model=model,
            contents="Say 'Hello from Gemini!' in exactly 5 words."
        )

        print(f"✅ Generation successful!")
        print(f"Response: {response.text}")
        return True
    except Exception as e:
        print(f"❌ Generation failed: {e}")
        print("\nPossible issues:")
        print("  - Invalid model name")
        print("  - API key doesn't have access to this model")
        print("  - Network connectivity issues")
        return False


def test_streaming(client):
    """Test streaming generation"""
    print("\nTesting streaming generation...")
    try:
        model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")

        print("Streaming response: ", end="", flush=True)
        for chunk in client.models.generate_content_stream(
            model=model,
            contents="Count from 1 to 5, one number at a time."
        ):
            if hasattr(chunk, 'text'):
                print(chunk.text, end="", flush=True)

        print("\n✅ Streaming successful!")
        return True
    except Exception as e:
        print(f"\n❌ Streaming failed: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("Google GenAI SDK Test Suite")
    print("=" * 60)

    # Test 1: Imports
    if not test_imports():
        sys.exit(1)

    # Test 2: Environment variables
    if not test_env_variables():
        sys.exit(1)

    # Test 3: Client initialization
    client = test_client_initialization()
    if not client:
        sys.exit(1)

    # Test 4: Basic generation
    if not test_basic_generation(client):
        sys.exit(1)

    # Test 5: Streaming
    if not test_streaming(client):
        sys.exit(1)

    # All tests passed!
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print("\nYour Google GenAI SDK setup is working correctly!")
    print("You can now run the backend server with: python main.py")


if __name__ == "__main__":
    main()
