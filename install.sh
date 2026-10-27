#!/bin/bash

echo "========================================"
echo "Rust Auto-Wipe Panel Installer"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo ""
    echo "Please edit .env with your server configuration:"
    echo "  - RUST_HOST"
    echo "  - RUST_RCON_PORT"
    echo "  - RUST_RCON_PASSWORD"
    echo "  - RUST_SERVER_DIR"
    echo "  - ADMIN_USERNAME/PASSWORD"
    echo ""
    read -p "Press enter to continue after editing .env..."
fi

# Create data directories
mkdir -p data backups public

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "To start the panel:"
echo "  npm start"
echo ""
echo "Or use PM2 for production:"
echo "  npm install -g pm2"
echo "  pm2 start src/server.js --name rust-wipe-panel"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
echo "Access the panel at: http://localhost:3000"
echo "========================================"
