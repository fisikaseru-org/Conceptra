#!/bin/bash
# Conceptra — Backend Startup Script
set -e

echo "🚀 Starting Conceptra Backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if GROQ_API_KEY is set
if [ -z "$GROQ_API_KEY" ]; then
    echo "⚠️  GROQ_API_KEY not set. Running in template fallback mode."
    echo "   Set it with: export GROQ_API_KEY=your_key_here"
else
    echo "✅ GROQ_API_KEY detected. Full LLM mode enabled."
fi

echo ""
echo "📡 Backend API: http://localhost:8000"
echo "📖 API Docs: http://localhost:8000/docs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$(dirname "$0")"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
