#!/bin/bash

echo "🚀 Claude Sub-Agent Manager Setup"
echo "================================"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy .env template
if [ ! -f backend/.env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.template backend/.env
    echo "✅ Created backend/.env"
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env and add your ANTHROPIC_API_KEY"
    echo "   Get your API key from: https://console.anthropic.com/"
else
    echo "✅ backend/.env already exists"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "To start the application:"
echo "  npm start"
echo ""
echo "Then open http://localhost:5173 in your browser" 