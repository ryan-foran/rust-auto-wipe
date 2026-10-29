# Rust Auto-Wipe Panel

A standalone auto-wipe panel for Rust game servers that can be installed on any server panel (Pterodactyl, Pelican, Multicraft, etc.). Features scheduled wipes, blueprint wipes, multi-map support, map pools, custom file deletion, and a web-based admin interface.

## Features

- 🕒 **Scheduled Wipes** - Set up automatic map and/or blueprint wipes on specific days and times with customizable timezones
- 🗺️ **Multi-Map Support** - Choose between specific seed, random map, or map pool selection
- 🎰 **Map Pool** - Create a pool of maps to randomly select from on each wipe
- 🧬 **Blueprint Wipes** - Separate control for player blueprints
- 🗂️ **Custom File Deletion** - Define patterns for files to delete on specific wipe types
- ⚡ **Force Wipe Support** - Special handling for Rust's monthly force wipes (first Thursday)
- 🔄 **Pterodactyl Integration** - Auto-update/restart server via Pterodactyl API on force wipes
- 🎮 **Admin Controls** - Manual wipe triggers via web UI or API
- 🔌 **RCON Integration** - Connects directly to your Rust server via RCON
- 🖥️ **Web Panel** - Clean web interface for managing wipes
- 🐳 **Easy Installation** - Works with Pterodactyl eggs, Docker, or standalone

## Installation

### Method 1: Pterodactyl Panel (Recommended)

1. Create a new server in Pterodactyl using a Node.js egg
2. Upload all files from this repository to your server
3. Copy `.env.example` to `.env` and configure it
4. Install dependencies: `npm install`
5. Start the server: `npm start`
6. Access the panel at `http://your-server-ip:PORT`

### Method 2: Direct Installation

1. Clone/download this repository to your server
2. Install Node.js (v16+ recommended)
3. Run `npm install`
4. Configure `.env` with your Rust server RCON details
5. Run `npm start`

## Configuration

Edit your `.env` file:

```env
PORT=3000
RUST_HOST=127.0.0.1
RUST_RCON_PORT=28016
RUST_RCON_PASSWORD=your_rcon_password
RUST_SERVER_DIR=/path/to/rust/server
TZ=UTC

# Pterodactyl Integration (for auto-updates on force wipes)
PTERODACTYL_API_KEY=your_client_api_key
PTERODACTYL_PANEL_URL=https://your-panel.com
PTERODACTYL_SERVER_ID=your_server_uuid
```

## Usage

### Web Panel
Access `http://your-ip:3000` and login with your admin credentials.

### Creating a Scheduled Wipe
1. Go to "Schedules" tab
2. Click "Add Schedule"
3. Set name, wipe type (Map, Blueprint, or Full)
4. Choose map selection: Specific Seed (defaults to 1 if empty), Random Map, or Map Pool
5. Set schedule (preset or custom cron) with timezone
6. Optionally mark as Force Wipe and enable Pterodactyl auto-update
7. Save

### Map Pool
1. Go to "Map Pool" tab
2. Add maps with name, seed (optional), and size (optional)
3. Enable/disable maps as needed
4. Use "Map Pool" mode in schedules/wipes to randomly select

### Custom Files
1. Go to "Custom Files" tab
2. Add rules with file patterns (use * wildcards)
3. Choose which wipe types trigger deletion
4. Files matching patterns will be deleted on those wipes

### Manual Wipe
1. Go to "Dashboard" tab
2. Select wipe type and map options
3. Click "Execute Wipe"

## Wipe Types

- **Map Wipe**: Deletes `proceduralmap.*`, `map.*` files and resets the world
- **Blueprint Wipe**: Deletes `player.blueprints.*` or resets blueprints via RCON
- **Full Wipe**: Both map and blueprints

## Map Selection Modes

- **Specific Seed**: Use a specific seed, defaults to seed 1 if not provided
- **Random Map**: Generate a random seed for each wipe
- **Map Pool**: Randomly select from enabled maps in your map pool

## Force Wipes

- Use the "Force Wipe - First Thursday of Month" preset (19:00 UTC by default)
- Enable "Update server via Pterodactyl" to automatically restart/update the server
- Mark as "Force Wipe" for tracking

## API Endpoints

- `GET /api/status` - Server status
- `POST /api/wipe/manual` - Trigger manual wipe
- `GET /api/wipe/history` - Wipe history
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule
- `GET /api/maps` - List map pool
- `POST /api/maps` - Add map to pool
- `GET /api/custom-files` - List custom file rules
- `POST /api/custom-files` - Add custom file rule

## Security

- Change default admin credentials
- Use strong SESSION_SECRET
- Restrict access to panel (firewall/VPN)
- Use HTTPS in production
- Keep Pterodactyl API keys secure
