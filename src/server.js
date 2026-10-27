const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs-extra');

dotenv.config();

const RustRcon = require('./rcon');
const WipeManager = require('./wipeManager');
const WipeScheduler = require('./scheduler');
const MapManager = require('./mapManager');
const CustomFilesManager = require('./customFiles');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Initialize components
const rcon = new RustRcon({
    host: process.env.RUST_HOST,
    port: process.env.RUST_RCON_PORT,
    password: process.env.RUST_RCON_PASSWORD
});

const wipeManager = new WipeManager(rcon, process.env.RUST_SERVER_DIR, io);
const scheduler = new WipeScheduler(wipeManager, io);
const mapManager = new MapManager();
const customFilesManager = new CustomFilesManager(process.env.RUST_SERVER_DIR);

// Connect to RCON on startup
rcon.connect().catch(err => {
    console.error('[Server] Failed to connect to RCON:', err.message);
});

// API Routes
app.get('/api/status', async (req, res) => {
    res.json({
        status: 'ok',
        rconConnected: rcon.connected,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/api/server/info', async (req, res) => {
    try {
        const info = await rcon.getServerInfo();
        res.json({ success: true, info });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/wipe/manual', async (req, res) => {
    try {
        const { type, mapMode = 'seed', seed, mapSize, mapId, saveBackup = true, announce = true, isForceWipe = false, updateServer = false, wipeTimerMinutes = 5 } = req.body;
        const result = await wipeManager.performWipe({
            type: type || 'full',
            mapMode,
            seed,
            mapSize,
            mapId,
            saveBackup,
            announce,
            isForceWipe,
            updateServer,
            wipeTimerMinutes
        });
        res.json({ success: true, wipe: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/wipe/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json({ success: true, history: wipeManager.getHistory(limit) });
});

app.get('/api/schedules', (req, res) => {
    res.json({ success: true, schedules: scheduler.getSchedules() });
});

app.post('/api/schedules', (req, res) => {
    try {
        const schedule = scheduler.addSchedule(req.body);
        res.json({ success: true, schedule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Map routes
app.get('/api/maps', (req, res) => {
    res.json({ success: true, maps: mapManager.getMaps() });
});

app.post('/api/maps', (req, res) => {
    try {
        const map = mapManager.addMap(req.body);
        res.json({ success: true, map });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/maps/:id', (req, res) => {
    try {
        const map = mapManager.updateMap(req.params.id, req.body);
        if (!map) {
            return res.status(404).json({ success: false, error: 'Map not found' });
        }
        res.json({ success: true, map });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/maps/:id', (req, res) => {
    try {
        const deleted = mapManager.deleteMap(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Map not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/maps/:id/toggle', (req, res) => {
    try {
        const map = mapManager.toggleMap(req.params.id);
        if (!map) {
            return res.status(404).json({ success: false, error: 'Map not found' });
        }
        res.json({ success: true, map });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Custom files routes
app.get('/api/custom-files', (req, res) => {
    res.json({ success: true, rules: customFilesManager.getRules() });
});

app.post('/api/custom-files', (req, res) => {
    try {
        const rule = customFilesManager.addRule(req.body);
        res.json({ success: true, rule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/custom-files/:id', (req, res) => {
    try {
        const rule = customFilesManager.updateRule(req.params.id, req.body);
        if (!rule) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }
        res.json({ success: true, rule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/custom-files/:id', (req, res) => {
    try {
        const deleted = customFilesManager.deleteRule(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/custom-files/:id/toggle', (req, res) => {
    try {
        const rule = customFilesManager.toggleRule(req.params.id);
        if (!rule) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }
        res.json({ success: true, rule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/schedules/:id', (req, res) => {
    try {
        const schedule = scheduler.updateSchedule(req.params.id, req.body);
        if (!schedule) {
            return res.status(404).json({ success: false, error: 'Schedule not found' });
        }
        res.json({ success: true, schedule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/schedules/:id', (req, res) => {
    try {
        const deleted = scheduler.deleteSchedule(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Schedule not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/schedules/:id/toggle', (req, res) => {
    try {
        const schedule = scheduler.toggleSchedule(req.params.id);
        if (!schedule) {
            return res.status(404).json({ success: false, error: 'Schedule not found' });
        }
        res.json({ success: true, schedule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/schedules/preset', (req, res) => {
    try {
        const { preset, time, name, wipeType = 'full', mapMode = 'seed', seed, mapSize, mapId, isForceWipe = false, updateServer = false, wipeTimerMinutes = 15 } = req.body;
        const cronExpression = scheduler.createCronFromPreset(preset, time);
        const schedule = scheduler.addSchedule({
            name: name || `${preset} wipe at ${time}`,
            cronExpression,
            wipeType,
            mapMode,
            seed,
            mapSize,
            mapId,
            isForceWipe,
            updateServer,
            wipeTimerMinutes,
            wipeOptions: { type: wipeType, mapMode, seed, mapSize, mapId, isForceWipe, updateServer, wipeTimerMinutes },
            enabled: true
        });
        res.json({ success: true, schedule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/rcon/command', async (req, res) => {
    try {
        const { command } = req.body;
        const response = await rcon.sendCommand(command);
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/rcon/reconnect', async (req, res) => {
    try {
        await rcon.disconnect();
        const connected = await rcon.connect();
        res.json({ success: connected, rconConnected: rcon.connected });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.io
io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);
    
    socket.emit('status', {
        rconConnected: rcon.connected,
        timestamp: new Date().toISOString()
    });
    
    socket.on('disconnect', () => {
        console.log('[Socket] Client disconnected:', socket.id);
    });
});

// Create necessary directories
fs.ensureDirSync(path.join(__dirname, '../data'));
fs.ensureDirSync(path.join(__dirname, '../backups'));
fs.ensureDirSync(path.join(__dirname, '../public'));

// Start server
server.listen(PORT, HOST, () => {
    console.log(`\n========================================`);
    console.log(`Rust Auto-Wipe Panel`);
    console.log(`========================================`);
    console.log(`Server running on: http://${HOST}:${PORT}`);
    console.log(`RCON: ${process.env.RUST_HOST}:${process.env.RUST_RCON_PORT} [${rcon.connected ? 'Connected' : 'Disconnected'}]`);
    console.log(`Timezone: ${process.env.TZ || 'UTC'}`);
    console.log(`========================================\n`);
});
