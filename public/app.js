const socket = io();

// Update status indicators
function updateStatus() {
    fetch('/api/status')
        .then(res => res.json())
        .then(data => {
            const rconStatus = document.getElementById('rconStatus');
            const rconStatusText = document.getElementById('rconStatusText');
            const uptime = document.getElementById('uptime');
            
            if (data.rconConnected) {
                rconStatus.className = 'status-indicator status-connected';
                rconStatusText.textContent = 'Connected';
            } else {
                rconStatus.className = 'status-indicator status-disconnected';
                rconStatusText.textContent = 'Disconnected';
            }
            
            const hours = Math.floor(data.uptime / 3600);
            const minutes = Math.floor((data.uptime % 3600) / 60);
            uptime.textContent = `${hours}h ${minutes}m`;
        });
}

// Manual wipe form
document.getElementById('manualWipeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = document.getElementById('wipeType').value;
    const mapMode = document.getElementById('mapMode').value;
    const seed = document.getElementById('mapSeed').value;
    const mapSize = document.getElementById('mapSize').value;
    const announce = document.getElementById('announceWipe').checked;
    const saveBackup = document.getElementById('saveBackup').checked;
    const wipeTimerMinutes = parseInt(document.getElementById('manualWipeTimer').value) || 0;
    
    if (wipeTimerMinutes < 0 || wipeTimerMinutes > 15) {
        alert('Timer must be between 0 and 15 minutes');
        return;
    }
    
    if (!confirm(`Are you sure you want to start a ${type} wipe with ${wipeTimerMinutes} minute timer?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/wipe/manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                type, 
                mapMode,
                seed: seed === '' ? null : seed, 
                mapSize: mapSize === '' ? null : mapSize, 
                announce, 
                saveBackup,
                wipeTimerMinutes
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Wipe countdown started!');
            loadHistory();
        } else {
            alert('Wipe failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

function toggleManualMapOptions() {
    const mapMode = document.getElementById('mapMode').value;
    const seedDiv = document.getElementById('manualSeedDiv');
    if (mapMode === 'seed') {
        seedDiv.style.display = 'block';
    } else {
        seedDiv.style.display = 'none';
    }
}

function toggleScheduleMapOptions() {
    const mapMode = document.getElementById('scheduleMapMode').value;
    const seedDiv = document.getElementById('scheduleSeedDiv');
    if (mapMode === 'seed') {
        seedDiv.style.display = 'block';
    } else {
        seedDiv.style.display = 'none';
    }
}

function togglePoolMapInput() {
    const type = document.getElementById('poolMapType').value;
    document.getElementById('poolSeedDiv').style.display = type === 'seed' ? 'block' : 'none';
    document.getElementById('poolUrlDiv').style.display = type === 'url' ? 'block' : 'none';
    document.getElementById('poolFileDiv').style.display = type === 'file' ? 'block' : 'none';
}

// Load maps
async function loadMaps() {
    try {
        const response = await fetch('/api/maps');
        const data = await response.json();
        const tbody = document.getElementById('mapsTable');
        tbody.innerHTML = '';
        
        data.maps.forEach(map => {
            const row = tbody.insertRow();
            let value = '-';
            if (map.type === 'seed' && map.seed) value = map.seed;
            else if (map.type === 'url' && map.url) value = map.url.length > 30 ? map.url.substring(0, 30) + '...' : map.url;
            else if (map.type === 'file' && map.file) value = map.file;
            
            row.innerHTML = `
                <td>${map.name}</td>
                <td><span class="badge bg-secondary">${map.type || 'seed'}</span></td>
                <td>${value}</td>
                <td>${map.size || '-'}</td>
                <td>
                    <span class="badge ${map.enabled !== false ? 'bg-success' : 'bg-secondary'}">
                        ${map.enabled !== false ? 'Enabled' : 'Disabled'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-${map.enabled !== false ? 'warning' : 'success'}" onclick="toggleMap('${map.id}')">
                        <i class="bi bi-${map.enabled !== false ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMap('${map.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Failed to load maps:', error);
    }
}

async function addMap() {
    const name = document.getElementById('mapName').value;
    const type = document.getElementById('poolMapType').value;
    const seed = document.getElementById('poolMapSeed').value;
    const url = document.getElementById('poolMapUrl').value;
    const file = document.getElementById('poolMapFile').value;
    const size = document.getElementById('poolMapSize').value;
    const description = document.getElementById('mapDescription').value;
    
    if (!name) {
        alert('Please enter a map name');
        return;
    }
    
    try {
        const response = await fetch('/api/maps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name,
                type,
                seed: seed === '' ? null : seed,
                url: url === '' ? null : url,
                file: file === '' ? null : file,
                size: size === '' ? null : size,
                description
            })
        });
        const data = await response.json();
        if (data.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addMapModal'));
            if (modal) modal.hide();
            document.getElementById('addMapForm').reset();
            togglePoolMapInput();
            loadMaps();
            alert('Map added successfully!');
        } else {
            alert('Failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function toggleMap(id) {
    try {
        const response = await fetch(`/api/maps/${id}/toggle`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            loadMaps();
        } else {
            alert('Failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteMap(id) {
    if (!confirm('Are you sure you want to delete this map?')) return;
    try {
        const response = await fetch(`/api/maps/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            loadMaps();
        } else {
            alert('Failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Load custom files
async function loadCustomFiles() {
    try {
        const response = await fetch('/api/custom-files');
        const data = await response.json();
        const tbody = document.getElementById('customFilesTable');
        tbody.innerHTML = '';
        
        data.rules.forEach(rule => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${rule.name}</td>
                <td><code>${rule.pattern}</code></td>
                <td><span class="badge bg-info">${rule.wipeType}</span></td>
                <td>
                    <span class="badge ${rule.enabled !== false ? 'bg-success' : 'bg-secondary'}">
                        ${rule.enabled !== false ? 'Enabled' : 'Disabled'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-${rule.enabled !== false ? 'warning' : 'success'}" onclick="toggleCustomFileRule('${rule.id}')">
                        <i class="bi bi-${rule.enabled !== false ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCustomFileRule('${rule.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Failed to load custom files:', error);
    }
}

async function addCustomFileRule() {
    const name = document.getElementById('customRuleName').value;
    const pattern = document.getElementById('customRulePattern').value;
    const wipeType = document.getElementById('customRuleWipeType').value;
    const description = document.getElementById('customRuleDescription').value;
    
    if (!name || !pattern) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetch('/api/custom-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, pattern, wipeType, description })
        });
        const data = await response.json();
        if (data.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addCustomFileModal'));
            if (modal) modal.hide();
            document.getElementById('addCustomFileForm').reset();
            loadCustomFiles();
            alert('Rule added successfully!');
        } else {
            alert('Failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function toggleCustomFileRule(id) {
    try {
        const response = await fetch(`/api/custom-files/${id}/toggle`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            loadCustomFiles();
        } else {
            alert('Failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteCustomFileRule(id) {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
        const response = await fetch(`/api/custom-files/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            loadCustomFiles();
        } else {
            alert('Failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Load schedules
async function loadSchedules() {
    try {
        const response = await fetch('/api/schedules');
        const data = await response.json();
        const tbody = document.getElementById('schedulesTable');
        tbody.innerHTML = '';
        
        data.schedules.forEach(schedule => {
            const row = tbody.insertRow();
            const mapModeBadge = schedule.mapMode === 'pool' ? 'bg-primary' : 
                                schedule.mapMode === 'random' ? 'bg-warning' : 'bg-secondary';
            const mapModeText = schedule.mapMode === 'pool' ? 'Pool' : 
                               schedule.mapMode === 'random' ? 'Random' : 'Seed';
            const flags = [];
            if (schedule.isForceWipe) flags.push('<span class="badge bg-danger">Force</span>');
            if (schedule.updateServer) flags.push('<span class="badge bg-info">Update</span>');
            
            row.innerHTML = `
                <td>${schedule.name}</td>
                <td><span class="badge bg-info">${schedule.wipeType}</span></td>
                <td><span class="badge ${mapModeBadge}">${mapModeText}</span></td>
                <td><code>${schedule.cronExpression}</code></td>
                <td>${schedule.timezone}</td>
                <td>${flags.join(' ') || '-'} ${schedule.wipeTimerMinutes !== undefined ? `<span class="badge bg-secondary">${schedule.wipeTimerMinutes}m</span>` : ''}</td>
                <td>
                    <span class="badge ${schedule.enabled ? 'bg-success' : 'bg-secondary'}">
                        ${schedule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-${schedule.enabled ? 'warning' : 'success'}" onclick="toggleSchedule('${schedule.id}')">
                        <i class="bi bi-${schedule.enabled ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${schedule.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Failed to load schedules:', error);
    }
}

// Load history
async function loadHistory() {
    try {
        const response = await fetch('/api/wipe/history');
        const data = await response.json();
        const tbody = document.getElementById('historyTable');
        tbody.innerHTML = '';
        
        data.history.forEach(wipe => {
            const row = tbody.insertRow();
            const date = new Date(wipe.startTime).toLocaleString();
            const statusBadge = wipe.status === 'completed' ? 'bg-success' : 
                               wipe.status === 'failed' ? 'bg-danger' : 'bg-warning';
            const duration = wipe.duration ? wipe.duration.toFixed(1) + 's' : '-';
            
            row.innerHTML = `
                <td>${date}</td>
                <td><span class="badge bg-info">${wipe.type}</span></td>
                <td><span class="badge ${statusBadge}">${wipe.status}</span></td>
                <td>${duration}</td>
            `;
        });
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

// Add schedule
async function addSchedule() {
    const name = document.getElementById('scheduleName').value;
    const wipeType = document.getElementById('scheduleWipeType').value;
    const mapMode = document.getElementById('scheduleMapMode').value;
    const seed = document.getElementById('scheduleSeed').value;
    const mapSize = document.getElementById('scheduleMapSize').value;
    const wipeTimerMinutes = parseInt(document.getElementById('scheduleWipeTimer').value) || 15;
    const preset = document.getElementById('schedulePreset').value;
    const time = document.getElementById('scheduleTime').value;
    const cronExpression = document.getElementById('cronExpression').value;
    const timezone = document.getElementById('scheduleTimezone').value;
    const isForceWipe = document.getElementById('scheduleIsForceWipe').checked;
    const updateServer = document.getElementById('scheduleUpdateServer').checked;
    
    if (wipeTimerMinutes < 0 || wipeTimerMinutes > 15) {
        alert('Timer must be between 0 and 15 minutes');
        return;
    }
    
    if (!name || !cronExpression) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        let body;
        if (preset !== 'custom') {
            body = { 
                preset, 
                time, 
                name, 
                wipeType,
                mapMode,
                seed: seed === '' ? null : seed,
                mapSize: mapSize === '' ? null : mapSize,
                isForceWipe,
                updateServer,
                wipeTimerMinutes
            };
            const response = await fetch('/api/schedules/preset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (data.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addScheduleModal'));
                if (modal) modal.hide();
                document.getElementById('addScheduleForm').reset();
                document.getElementById('scheduleTime').value = '19:00';
                document.getElementById('scheduleTimezone').value = 'UTC';
                document.getElementById('scheduleIsForceWipe').checked = false;
                document.getElementById('scheduleUpdateServer').checked = false;
                document.getElementById('scheduleWipeTimer').value = '15';
                document.getElementById('schedulePreset').value = 'custom';
                document.getElementById('cronExpression').value = '';
                updateCronFromPreset();
                loadSchedules();
                alert('Schedule added successfully!');
            } else {
                alert('Failed: ' + data.error);
            }
        } else {
            body = { 
                name, 
                wipeType, 
                mapMode,
                seed: seed === '' ? null : seed,
                mapSize: mapSize === '' ? null : mapSize,
                cronExpression, 
                timezone,
                isForceWipe,
                updateServer,
                wipeTimerMinutes
            };
            const response = await fetch('/api/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (data.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addScheduleModal'));
                if (modal) modal.hide();
                document.getElementById('addScheduleForm').reset();
                document.getElementById('scheduleTime').value = '19:00';
                document.getElementById('scheduleTimezone').value = 'UTC';
                document.getElementById('scheduleIsForceWipe').checked = false;
                document.getElementById('scheduleUpdateServer').checked = false;
                document.getElementById('scheduleWipeTimer').value = '15';
                loadSchedules();
                alert('Schedule added successfully!');
            } else {
                alert('Failed: ' + data.error);
            }
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Update cron from preset
function updateCronFromPreset() {
    const preset = document.getElementById('schedulePreset').value;
    const time = document.getElementById('scheduleTime').value;
    const cronDiv = document.getElementById('cronDiv');
    const timeDiv = document.getElementById('timeDiv');
    const forceWipeCheck = document.getElementById('scheduleIsForceWipe');
    const updateServerCheck = document.getElementById('scheduleUpdateServer');
    
    if (preset === 'custom') {
        cronDiv.style.display = 'block';
        timeDiv.style.display = 'none';
    } else {
        cronDiv.style.display = 'block';
        timeDiv.style.display = 'block';
        if (time) {
            const [hour, minute] = time.split(':');
            let cron = '';
            switch (preset) {
                case 'daily': cron = `${minute} ${hour} * * *`; break;
                case 'weekly_monday': cron = `${minute} ${hour} * * 1`; break;
                case 'weekly_wednesday': cron = `${minute} ${hour} * * 3`; break;
                case 'weekly_friday': cron = `${minute} ${hour} * * 5`; break;
                case 'weekly_sunday': cron = `${minute} ${hour} * * 0`; break;
                case 'monthly': cron = `${minute} ${hour} 1 * *`; break;
                case 'force_wipe_thursday': 
                    cron = `${minute} ${hour} * * 4`; 
                    if (forceWipeCheck) forceWipeCheck.checked = true;
                    if (updateServerCheck) updateServerCheck.checked = true;
                    break;
            }
            document.getElementById('cronExpression').value = cron;
        }
    }
}

// Toggle schedule
async function toggleSchedule(id) {
    try {
        const response = await fetch(`/api/schedules/${id}/toggle`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            loadSchedules();
        } else {
            alert('Failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Delete schedule
async function deleteSchedule(id) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
        const response = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            loadSchedules();
        } else {
            alert('Failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// RCON
async function sendRconCommand() {
    const cmdInput = document.getElementById('rconCommand');
    const command = cmdInput.value;
    if (!command) return;
    
    const output = document.getElementById('rconOutput');
    output.innerHTML += `> ${command}\n`;
    
    try {
        const response = await fetch('/api/rcon/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        const data = await response.json();
        if (data.success) {
            output.innerHTML += data.response + '\n\n';
        } else {
            output.innerHTML += `ERROR: ${data.error}\n\n`;
        }
    } catch (error) {
        output.innerHTML += `ERROR: ${error.message}\n\n`;
    }
    
    output.scrollTop = output.scrollHeight;
    cmdInput.value = '';
}

document.getElementById('rconCommand').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendRconCommand();
    }
});

async function reconnectRcon() {
    try {
        const response = await fetch('/api/rcon/reconnect');
        const data = await response.json();
        if (data.success) {
            alert('RCON reconnected!');
            updateStatus();
        } else {
            alert('Failed to reconnect RCON');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Socket events
socket.on('wipe:start', (data) => {
    console.log('Wipe started:', data);
    alert('Server wipe in progress...');
});

socket.on('wipe:complete', (data) => {
    console.log('Wipe completed:', data);
    alert('Wipe completed!');
    loadHistory();
});

socket.on('wipe:failed', (data) => {
    console.log('Wipe failed:', data);
    alert('Wipe failed: ' + data.error);
    loadHistory();
});

socket.on('schedule:executed', (data) => {
    console.log('Schedule executed:', data);
});

// Discord functions
async function loadDiscordConfig() {
    try {
        const response = await fetch('/api/discord/config');
        const data = await response.json();
        if (data.success) {
            document.getElementById('discordEnabled').checked = data.config.enabled;
            document.getElementById('discordWebhookUrl').value = data.config.webhookUrl || '';
            document.getElementById('discordServerName').value = data.config.serverName || '';
            document.getElementById('discordServerIp').value = data.config.serverIp || '';
            document.getElementById('discordSidebarColor').value = data.config.sidebarColor || '#FF0000';
        }
    } catch (error) {
        console.error('Failed to load Discord config:', error);
    }
}

const discordForm = document.getElementById('discordConfigForm');
if (discordForm) {
    discordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const config = {
            enabled: document.getElementById('discordEnabled').checked,
            webhookUrl: document.getElementById('discordWebhookUrl').value,
            serverName: document.getElementById('discordServerName').value,
            serverIp: document.getElementById('discordServerIp').value,
            sidebarColor: document.getElementById('discordSidebarColor').value
        };
        
        try {
            const response = await fetch('/api/discord/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            const data = await response.json();
            if (data.success) {
                alert('Saved');
            } else {
                alert('Failed: ' + data.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
}

async function testDiscord() {
    try {
        const response = await fetch('/api/discord/test', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            alert('Test sent');
        } else {
            alert('Failed: ' + (data.message || data.error));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Initialize
updateStatus();
loadSchedules();
loadHistory();
loadMaps();
loadCustomFiles();
loadDiscordConfig();
setInterval(updateStatus, 30000);
setInterval(loadSchedules, 60000);
updateCronFromPreset();
toggleManualMapOptions();
toggleScheduleMapOptions();
togglePoolMapInput();
