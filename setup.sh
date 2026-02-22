#!/bin/bash

# Video Summarizer Setup Script
# This script sets up both backend and frontend

echo "🎥 Video Summarizer - Setup Script"
echo "===================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi
echo "✅ Python found: $(python3 --version)"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi
echo "✅ Node.js found: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi
echo "✅ npm found: $(npm --version)"

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  Warning: FFmpeg is not installed. Some features may not work."
    echo "   Install with: brew install ffmpeg (macOS) or sudo apt install ffmpeg (Linux)"
else
    echo "✅ FFmpeg found: $(ffmpeg -version | head -n1)"
fi

echo ""
echo "Setting up backend..."
echo "--------------------"

# Backend setup
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env and add your GOOGLE_API_KEY"
    echo "   Get your API key from: https://aistudio.google.com/app/apikey"
fi

cd ..

echo ""
echo "Setting up frontend..."
echo "--------------------"

# Frontend setup
cd frontend

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your Google API key to backend/.env"
echo "   Get it from: https://aistudio.google.com/app/apikey"
echo ""
echo "2. Start the backend:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python main.py"
echo ""
echo "3. In a new terminal, start the frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "Happy summarizing! 🎥✨"
