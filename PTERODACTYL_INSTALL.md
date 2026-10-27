# Pterodactyl Installation & Setup Guide

This guide will walk you through installing the Rust Auto-Wipe Panel on a Pterodactyl panel and connecting it to your Rust server.

## Prerequisites

- A working Pterodactyl Panel installation
- A Rust server already set up on Pterodactyl
- Access to your Pterodactyl panel as admin or with server creation permissions
- Node.js knowledge (basic) - the panel handles this for you

## Step 1: Create a New Server for the Wipe Panel

1. Login to your Pterodactyl panel
2. Go to `Admin > Servers > Create New`
3. Fill in the server details:
   - **Server Name**: `Rust Auto-Wipe Panel`
   - **Owner**: Your admin user
   - **Node**: Choose the same node your Rust server is on (recommended)
4. Under `Allocation`:
   - Assign a port (e.g., `3000`) - make sure it's not in use
5. Under `Egg`:
   - Select `Node.js` egg (if you don't have one, you'll need to import it or use a generic Node.js egg)
   - If using a custom egg, ensure it supports `npm install` and `node`
6. Under `Docker Image`:
   - Use `ghcr.io/pterodactyl/yolks:nodejs_18` or similar Node.js 18 image
7. Under `Startup`:
   - Set startup command to: `npm start`
8. Create the server

## Step 2: Upload the Panel Files

1. Go to your newly created Wipe Panel server in Pterodactyl
2. Navigate to `File Manager`
3. Upload all files from the `rust-wipe-panel` directory to the root of this server
   - You can zip them on your local machine and upload the zip, then extract
4. Ensure these key files are present:
   - `package.json`
   - `src/` folder
   - `public/` folder
   - `.env.example`

## Step 3: Configure Environment Variables

1. In the File Manager, copy `.env.example` to `.env`
2. Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0

# Rust Server RCON Configuration
RUST_HOST=172.18.0.1  # Or use your Rust server's internal IP
RUST_RCON_PORT=28016
RUST_RCON_PASSWORD=your_rust_rcon_password
RUST_SERVER_DIR=/home/container/rustserver  # Mounted path to your Rust server

# Pterodactyl Integration (Optional but recommended for force wipes)
PTERODACTYL_API_KEY=ptlc_xxxxxxxxxxxxx
PTERODACTYL_PANEL_URL=https://panel.yourdomain.com
PTERODACTYL_SERVER_ID=abc123-def456-ghi789

# Timezone
TZ=America/New_York

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_THIS_PASSWORD
SESSION_SECRET=generate_a_random_string_here
```

### Finding your values:

- **RUST_HOST**: If both servers are on the same node, use the Docker internal network IP or `host.docker.internal`. Often `172.18.0.1` works on Pterodactyl's default network.
- **RUST_RCON_PORT**: Found in your Rust server's startup/config (usually 28016 by default)
- **RUST_RCON_PASSWORD**: Found in your Rust server's startup variables or `server.cfg`
- **RUST_SERVER_DIR**: This will be the mounted path (see Step 4)

## Step 4: Mount Your Rust Server Directory

This is the most important step for file-based wipes to work.

1. Go to your **Rust server** in Pterodactyl
2. Go to `Settings > Mounts` (or `Mounts` tab)
3. Create a new mount:
   - **Source**: Leave as is or use the server's files directory
   - **Target**: `/home/container/rustserver` (this is what you'll use in RUST_SERVER_DIR)
   - **Read/Write**: Yes

Alternatively, if mounts aren't available, you can symlink or use the same node's filesystem. The key is that the Wipe Panel server can read/write the Rust server's files.

**For the Wipe Panel server:**
1. Go to your Wipe Panel server
2. Go to `Mounts`
3. Mount the same Rust server directory to `/home/container/rustserver` (or match your `RUST_SERVER_DIR`)

## Step 5: Install Dependencies & Start

1. Go to your Wipe Panel server's `Console`
2. Run the following commands:

```bash
npm install
```

This may take a minute or two to install all dependencies.

3. Once installed, start the server:
```bash
npm start
```

Or just restart from the Pterodactyl console/start button.

4. Check the console for output like:
```
========================================
Rust Auto-Wipe Panel
========================================
Server running on: http://0.0.0.0:3000
RCON: 172.18.0.1:28016 [Connected]
Timezone: America/New_York
========================================
```

## Step 6: Access the Panel

1. Open your browser and go to `http://YOUR_NODE_IP:3000` or `http://YOUR_DOMAIN:3000`
2. You should see the Rust Auto-Wipe Panel dashboard
3. Change the default login credentials in `.env` immediately (`ADMIN_USERNAME` and `ADMIN_PASSWORD`)

## Step 7: Configure Pterodactyl API (For Auto-Updates)

If you want automatic server updates on force wipes:

1. Go to your Pterodactyl panel as admin
2. Go to `Account Settings > API Credentials`
3. Create a new API Key with the following permissions:
   - `Server: Control` (for restart)
   - `Server: Power Action` (for restart)
4. Copy the API key to your `.env` as `PTERODACTYL_API_KEY`
5. Get your panel URL (e.g., `https://panel.example.com`)
6. Get your Rust server's UUID from its settings page URL or server info

## Troubleshooting

### RCON Not Connecting
- Verify RCON is enabled on your Rust server
- Check `rcon.port` and `rcon.password` in your Rust server config
- Ensure the port is open between containers
- Try using the internal Docker IP instead of `127.0.0.1`

### File Wipes Not Working
- Confirm the mount is properly set up on both servers
- Check `RUST_SERVER_DIR` path is correct and accessible
- Ensure the panel has read/write permissions to the directory
- Test by checking if you can see files in the mounted directory from the panel's file manager

### Panel Not Accessible
- Check if the port is allocated and not conflicting
- Verify firewall rules allow the port
- Make sure the startup command is `npm start`
- Check the console for errors

### Map Pool File Not Loading
- Remember: files are relative to `RUST_SERVER_DIR`
- If your map is in `rustserver/maps/test.map` and `RUST_SERVER_DIR` points to `rustserver/`, use `maps/test.map`
- For procedural maps, using seeds is much more reliable

## Tips & Best Practices

- **Use the same node**: Keep both servers on the same node for easier networking and mounting
- **Set a strong password**: Change default admin credentials immediately
- **Use a reverse proxy**: Put the panel behind nginx/Cloudflare for HTTPS
- **Test first**: Do a manual wipe with a timer to test everything before setting up schedules
- **Backups**: The panel has a backup option, but it's good to have your own backup solution too

## Recommended .env Template

```env
PORT=3000
HOST=0.0.0.0
RUST_HOST=172.18.0.1
RUST_RCON_PORT=28016
RUST_RCON_PASSWORD=your_secure_rcon_password
RUST_SERVER_DIR=/home/container/rustserver
PTERODACTYL_API_KEY=
PTERODACTYL_PANEL_URL=
PTERODACTYL_SERVER_ID=
TZ=UTC
ADMIN_USERNAME=your_admin_user
ADMIN_PASSWORD=very_secure_password
SESSION_SECRET=generate_random_32_char_string
```

Need help generating a session secret? Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
