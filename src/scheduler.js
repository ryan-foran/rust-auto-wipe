const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');

class WipeScheduler {
    constructor(wipeManager, io = null) {
        this.wipeManager = wipeManager;
        this.io = io;
        this.schedules = [];
        this.jobs = new Map();
        this.loadSchedules();
    }

    loadSchedules() {
        try {
            const schedulesPath = path.join(__dirname, '../data/schedules.json');
            if (fs.existsSync(schedulesPath)) {
                this.schedules = fs.readJsonSync(schedulesPath);
                this.setupJobs();
            }
        } catch (error) {
            console.error('[Scheduler] Failed to load schedules:', error.message);
            this.schedules = [];
        }
    }

    saveSchedules() {
        try {
            const dataDir = path.join(__dirname, '../data');
            fs.ensureDirSync(dataDir);
            const schedulesPath = path.join(dataDir, 'schedules.json');
            fs.writeJsonSync(schedulesPath, this.schedules, { spaces: 2 });
        } catch (error) {
            console.error('[Scheduler] Failed to save schedules:', error.message);
        }
    }

    setupJobs() {
        // Clear existing jobs
        for (const [id, job] of this.jobs) {
            job.stop();
        }
        this.jobs.clear();

        // Setup new jobs
        for (const schedule of this.schedules) {
            if (schedule.enabled) {
                this.createJob(schedule);
            }
        }
    }

    createJob(schedule) {
        try {
            if (!cron.validate(schedule.cronExpression)) {
                console.error(`[Scheduler] Invalid cron expression for schedule ${schedule.id}`);
                return;
            }

            const job = cron.schedule(schedule.cronExpression, async () => {
                console.log(`[Scheduler] Running scheduled wipe: ${schedule.name}`);
                try {
                    await this.wipeManager.performWipe(schedule.wipeOptions || {
                        type: schedule.wipeType || 'full',
                        mapMode: schedule.mapMode || 'seed',
                        seed: schedule.seed,
                        mapSize: schedule.mapSize,
                        mapId: schedule.mapId,
                        isForceWipe: schedule.isForceWipe || false,
                        updateServer: schedule.updateServer || false,
                        wipeTimerMinutes: schedule.wipeTimerMinutes !== undefined ? schedule.wipeTimerMinutes : 15
                    });
                    
                    if (this.io) {
                        this.io.emit('schedule:executed', {
                            scheduleId: schedule.id,
                            name: schedule.name,
                            time: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error(`[Scheduler] Failed to execute schedule ${schedule.name}:`, error.message);
                }
            }, {
                scheduled: true,
                timezone: schedule.timezone || process.env.TZ || 'UTC'
            });

            this.jobs.set(schedule.id, job);
            console.log(`[Scheduler] Created job for: ${schedule.name} (${schedule.cronExpression})`);
        } catch (error) {
            console.error(`[Scheduler] Failed to create job for ${schedule.name}:`, error.message);
        }
    }

    addSchedule(scheduleData) {
        const schedule = {
            id: uuidv4(),
            name: scheduleData.name,
            enabled: scheduleData.enabled !== false,
            cronExpression: scheduleData.cronExpression,
            timezone: scheduleData.timezone || process.env.TZ || 'UTC',
            wipeType: scheduleData.wipeType || 'full',
            mapMode: scheduleData.mapMode || 'seed',
            seed: scheduleData.seed !== undefined ? scheduleData.seed : null,
            mapSize: scheduleData.mapSize || null,
            mapId: scheduleData.mapId || null,
            isForceWipe: scheduleData.isForceWipe || false,
            updateServer: scheduleData.updateServer || false,
            wipeTimerMinutes: scheduleData.wipeTimerMinutes !== undefined ? scheduleData.wipeTimerMinutes : 15,
            wipeOptions: scheduleData.wipeOptions || {
                type: scheduleData.wipeType || 'full',
                mapMode: scheduleData.mapMode || 'seed',
                seed: scheduleData.seed !== undefined ? scheduleData.seed : null,
                mapSize: scheduleData.mapSize || null,
                mapId: scheduleData.mapId || null,
                isForceWipe: scheduleData.isForceWipe || false,
                updateServer: scheduleData.updateServer || false,
                wipeTimerMinutes: scheduleData.wipeTimerMinutes !== undefined ? scheduleData.wipeTimerMinutes : 15
            },
            description: scheduleData.description || '',
            createdAt: new Date().toISOString(),
            lastRun: null,
            nextRun: null
        };

        this.schedules.push(schedule);
        this.saveSchedules();
        
        if (schedule.enabled) {
            this.createJob(schedule);
        }

        return schedule;
    }

    updateSchedule(id, updates) {
        const index = this.schedules.findIndex(s => s.id === id);
        if (index === -1) return null;

        this.schedules[index] = { ...this.schedules[index], ...updates };
        this.saveSchedules();

        // Recreate job
        if (this.jobs.has(id)) {
            this.jobs.get(id).stop();
            this.jobs.delete(id);
        }
        
        if (this.schedules[index].enabled) {
            this.createJob(this.schedules[index]);
        }

        return this.schedules[index];
    }

    deleteSchedule(id) {
        const index = this.schedules.findIndex(s => s.id === id);
        if (index === -1) return false;

        if (this.jobs.has(id)) {
            this.jobs.get(id).stop();
            this.jobs.delete(id);
        }

        this.schedules.splice(index, 1);
        this.saveSchedules();
        return true;
    }

    toggleSchedule(id) {
        const schedule = this.schedules.find(s => s.id === id);
        if (!schedule) return null;

        schedule.enabled = !schedule.enabled;
        this.saveSchedules();

        if (schedule.enabled) {
            this.createJob(schedule);
        } else if (this.jobs.has(id)) {
            this.jobs.get(id).stop();
            this.jobs.delete(id);
        }

        return schedule;
    }

    getSchedules() {
        return this.schedules;
    }

    getSchedule(id) {
        return this.schedules.find(s => s.id === id);
    }

    // Helper to create cron expressions for common schedules
    createCronFromPreset(preset, time = '03:00') {
        const [hour, minute] = time.split(':');
        switch (preset) {
            case 'daily':
                return `${minute} ${hour} * * *`;
            case 'weekly_monday':
                return `${minute} ${hour} * * 1`;
            case 'weekly_wednesday':
                return `${minute} ${hour} * * 3`;
            case 'weekly_friday':
                return `${minute} ${hour} * * 5`;
            case 'weekly_sunday':
                return `${minute} ${hour} * * 0`;
            case 'biweekly':
                return `${minute} ${hour} * * 1/2`;
            case 'monthly':
                return `${minute} ${hour} 1 * *`;
            case 'force_wipe_thursday':
                // First Thursday of the month at specified time (19:00 UTC default)
                // Cron: minute hour * * 4#1 or use special handling
                return `${minute} ${hour} * * 4`;
            default:
                return preset; // Assume it's already a cron expression
        }
    }
}

module.exports = WipeScheduler;
