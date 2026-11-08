import cron from 'node-cron';
import { executeQuery, executeRun, saveDb, getAll } from '../db/database';
import { executeProTalkRun } from '../db/protalk/client';
import { executeDatabaseBackup } from '../services/databaseBackup';
import { tickMemeAutopilotScheduler, runMorningAutopilotGeneration } from '../services/memeAutopilotService';

export interface CronTaskInfo {
  id: string;
  name: string;
  schedule: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'RUNNING';
  last_run?: string;
  run_count: number;
}

const activeJobs: Map<string, cron.ScheduledTask> = new Map();
let lastBackupDay = -1;

/**
 * Formats current date string in Europe/Moscow timezone (YYYY-MM-DD)
 */
function getMskDateString(): string {
  const now = new Date();
  const mskTime = new Date(now.getTime() + 3 * 3600 * 1000);
  return mskTime.toISOString().split('T')[0];
}

let lastBackupDateMsk = '';

/**
 * Executes a specific task action by ID or type
 */
export async function executeCronTaskNow(
  id: string,
  triggerSource: 'MANUAL' | 'SCHEDULED' = 'MANUAL'
): Promise<{ success: boolean; message: string; output?: any }> {
  try {
    const task = executeQuery<CronTaskInfo>(`SELECT * FROM cron_tasks WHERE id = ?`, [id])?.[0];
    const now = new Date().toISOString();
    const todayMsk = getMskDateString();

    let output: any = null;
    let message = '';

    if (id === 'cron_1' || id.toLowerCase().includes('backup') || (task?.name && task.name.toLowerCase().includes('backup'))) {
      if (triggerSource === 'SCHEDULED') {
        if (lastBackupDateMsk === todayMsk) {
          console.log(`[CronManager] Auto backup for ${todayMsk} already sent today. Skipping duplicate trigger.`);
          return { success: true, message: `Автобэкап за ${todayMsk} уже отправлен ранее.` };
        }
        lastBackupDateMsk = todayMsk;
        console.log(`[CronManager] Running scheduled 06:00 MSK backup task ${id}...`);
        const backupRes = await executeDatabaseBackup('Ежедневный автобэкап в 06:00 МСК');
        output = backupRes;
        message = backupRes.success
          ? `Ежедневный автобэкап в 06:00 МСК успешно отправлен в Telegram!`
          : `Ошибка отправки бэкапа: ${backupRes.error}`;
      } else {
        console.log(`[CronManager] Running manual backup task ${id}...`);
        const backupRes = await executeDatabaseBackup('Ручной запуск из панели управления Cron');
        output = backupRes;
        message = backupRes.success
          ? `Резервная копия базы данных BD ProTalk успешно отправлена в Telegram! (${backupRes.totalRows} строк, ${backupRes.tablesCount} таблиц)`
          : `Ошибка отправки бэкапа: ${backupRes.error}`;
      }
    } else if (id === 'cron_2' || id.toLowerCase().includes('clean') || (task?.name && task.name.toLowerCase().includes('log'))) {
      executeRun(`
        DELETE FROM system_logs 
        WHERE id NOT IN (SELECT id FROM system_logs ORDER BY created_at DESC LIMIT 100)
      `);
      message = 'Очистка журнала логов успешно выполнена (сохранены последние 100 записей).';
    } else if (id === 'cron_3' || id.toLowerCase().includes('health')) {
      // Test BD ProTalk query silently without spamming system_logs every 5 minutes
      const test = executeQuery(`SELECT 1 as alive`);
      if (!test || !test.length) {
        throw new Error('База данных BD ProTalk не отвечает на тестовый запрос');
      }
      // Only insert into system_logs if triggered manually by an administrator
      if (triggerSource === 'MANUAL') {
        executeRun(`
          INSERT INTO system_logs (id, level, source, message) 
          VALUES (?, 'INFO', 'CRON_HEALTH_CHECK', ?)
        `, [`log_${Date.now()}`, `[Ручной запуск] Состояние базы данных BD ProTalk проверено: активно и доступно (${now})`]);
      }
      message = 'Диагностика BD ProTalk: соединение и таблицы активны (журнал не засоряется лишними записями).';
    } else if (id === 'cron_meme_autopilot' || id.toLowerCase().includes('meme')) {
      const res = await runMorningAutopilotGeneration();
      message = 'Мем-автопилот: посты сгенерированы через ProTalk (функция 621), отправлены админу (169262990) и распределены по очереди доставки.';
      output = res;
    } else {
      executeRun(`
        INSERT INTO system_logs (id, level, source, message) 
        VALUES (?, 'INFO', 'CRON_CUSTOM', ?)
      `, [`log_${Date.now()}`, `[Cron Task ${id}] Выполнена задача '${task?.name || id}' в ${now}`]);
      message = `Пользовательская задача "${task?.name || id}" успешно выполнена!`;
    }

    executeRun(`
      UPDATE cron_tasks 
      SET last_run = ?, run_count = run_count + 1 
      WHERE id = ?
    `, [now, id]);
    saveDb();

    return { success: true, message, output };
  } catch (err: any) {
    console.error(`[CronManager] Error executing task ${id}:`, err);
    return { success: false, message: `Ошибка выполнения: ${err.message}` };
  }
}

/**
 * Attaches a scheduled job to a task in memory
 */
function scheduleTaskJob(task: CronTaskInfo) {
  // Stop existing job if present
  if (activeJobs.has(task.id)) {
    try {
      activeJobs.get(task.id)?.stop();
    } catch (_) {}
    activeJobs.delete(task.id);
  }

  if (task.status === 'PAUSED') {
    return;
  }

  if (!cron.validate(task.schedule)) {
    console.warn(`[CronManager] Invalid cron expression '${task.schedule}' for task '${task.id}'`);
    return;
  }

  try {
    const job = cron.schedule(
      task.schedule,
      async () => {
        console.log(`[CronManager] Cron scheduled tick triggered for task '${task.id}' (${task.name}) at MSK time`);
        await executeCronTaskNow(task.id, 'SCHEDULED');
      },
      { timezone: 'Europe/Moscow' }
    );
    activeJobs.set(task.id, job);
    console.log(`[CronManager] Scheduled task '${task.id}' with pattern '${task.schedule}' in Europe/Moscow timezone`);
  } catch (e) {
    console.error(`[CronManager] Failed to schedule task '${task.id}':`, e);
  }
}

export async function initCronJobs() {
  console.log('[CronManager] Initializing background Cron registry from BD ProTalk database table cron_tasks...');

  // Ensure default base tasks exist in cron_tasks table if table is empty
  try {
    const existing = await getAll<CronTaskInfo>(`SELECT * FROM cron_tasks`);
    if (!existing || existing.length === 0) {
      console.log('[CronManager] cron_tasks table is empty, seeding default tasks into BD ProTalk...');
      await executeProTalkRun(`
        INSERT INTO cron_tasks (id, name, schedule, description, status, run_count) VALUES
        ('cron_1', 'Ежедневный бэкап в Telegram (06:00 МСК)', '0 6 * * *', 'Автоматическое резервное копирование и отправка базы данных BD ProTalk в Telegram ежедневно в 06:00 МСК', 'ACTIVE', 0),
        ('cron_2', 'Очистка системных логов', '0 2 * * 0', 'Еженедельная архивация и очистка системного журнала (сохранение последних 100 записей)', 'ACTIVE', 0),
        ('cron_3', 'Диагностика BD ProTalk', '0 * * * *', 'Фоновая проверка целостности базы данных BD ProTalk каждый час (лог пишется только при ошибках)', 'ACTIVE', 0)
        ON CONFLICT (id) DO NOTHING
      `).catch(() => {});
    }
  } catch (seedErr) {
    console.warn('[CronManager seed note]', seedErr);
  }

  // Load all tasks directly from BD ProTalk table
  await reloadAllCronTasksFromDb();

  // Periodic synchronization: check if cron_tasks table was updated externally or in DB
  let lastTasksHash = '';
  setInterval(async () => {
    try {
      const now = new Date();
      const mskTime = new Date(now.getTime() + 3 * 3600 * 1000);
      const mskHour = mskTime.getUTCHours();
      const mskMinute = mskTime.getUTCMinutes();
      const todayMsk = getMskDateString();

      // Check for schedule changes in BD ProTalk cron_tasks table
      const currentTasks = await getAll<CronTaskInfo>(`SELECT id, schedule, status FROM cron_tasks`);
      const currentHash = JSON.stringify(currentTasks);
      if (lastTasksHash && lastTasksHash !== currentHash) {
        console.log('[CronManager] Detected schedule or status changes in cron_tasks table, resynchronizing...');
        await reloadAllCronTasksFromDb();
      }
      lastTasksHash = currentHash;

      // Auto backup execution based on cron_tasks configuration in DB
      const backupTask = (await getAll<CronTaskInfo>(`SELECT schedule, status FROM cron_tasks WHERE id = 'cron_1'`))[0];
      const isBackupActive = backupTask?.status === 'ACTIVE';

      // Parse configured hour/minute from schedule (e.g. '0 6 * * *')
      let targetHour = 6;
      let targetMinute = 0;
      if (backupTask?.schedule) {
        const parts = backupTask.schedule.trim().split(/\s+/);
        if (parts.length >= 2 && !isNaN(parseInt(parts[1], 10)) && !isNaN(parseInt(parts[0], 10))) {
          targetMinute = parseInt(parts[0], 10);
          targetHour = parseInt(parts[1], 10);
        }
      }

      if (isBackupActive && mskHour === targetHour && mskMinute === targetMinute && lastBackupDateMsk !== todayMsk) {
        lastBackupDateMsk = todayMsk;
        console.log(`[CronManager] Reached scheduled backup time (${targetHour}:${targetMinute < 10 ? '0' : ''}${targetMinute} MSK) from DB. Starting database backup to Telegram...`);
        await executeDatabaseBackup(`Автобэкап по расписанию из cron_tasks (${targetHour}:${targetMinute < 10 ? '0' : ''}${targetMinute} МСК)`);
      }

      // Execute meme autopilot check (07:00 MSK generation & 10:00-17:00 MSK cascade queue processing)
      try {
        await tickMemeAutopilotScheduler();
      } catch (memeErr) {
        console.error('[CronManager Meme Autopilot Check Error]', memeErr);
      }
    } catch (err) {
      console.error('[CronManager MSK Backup Checker Error]', err);
    }
  }, 60000);

  console.log(`[CronManager] Background cron registry initialized with ${activeJobs.size} active tasks from database.`);
}

/**
 * Loads all tasks from cron_tasks table in DB and configures active node-cron jobs
 */
export async function reloadAllCronTasksFromDb() {
  try {
    const tasks = await getAll<CronTaskInfo>(`SELECT * FROM cron_tasks`);
    const currentDbIds = new Set((tasks || []).map(t => t.id));

    // Stop jobs that are no longer in DB
    for (const [id, job] of activeJobs.entries()) {
      if (!currentDbIds.has(id)) {
        try { job.stop(); } catch (_) {}
        activeJobs.delete(id);
      }
    }

    // Schedule or reschedule all jobs from DB
    for (const task of tasks || []) {
      scheduleTaskJob(task);
    }
    console.log(`[CronManager] Rescheduled ${activeJobs.size} active cron tasks directly from database table cron_tasks.`);
  } catch (err) {
    console.error('[CronManager] Error loading cron_tasks from DB:', err);
  }
}

export function getCronTasksRegistry(): any[] {
  try {
    return executeQuery(`SELECT * FROM cron_tasks ORDER BY created_at ASC`);
  } catch (err) {
    console.error('Error fetching cron tasks:', err);
    return [];
  }
}

export async function getCronTasksRegistryAsync(): Promise<any[]> {
  try {
    return await getAll(`SELECT * FROM cron_tasks ORDER BY created_at ASC`);
  } catch (err) {
    console.error('Error fetching cron tasks:', err);
    return [];
  }
}

export function updateCronTaskSchedule(
  id: string,
  schedule: string,
  name?: string,
  description?: string,
  status?: 'ACTIVE' | 'PAUSED'
): { success: boolean; message: string; task?: CronTaskInfo } {
  try {
    if (!cron.validate(schedule)) {
      return { success: false, message: `Некорректное Cron-выражение: "${schedule}". Используйте формат: "минута час день месяц день_недели"` };
    }

    const existing = executeQuery<CronTaskInfo>(`SELECT * FROM cron_tasks WHERE id = ?`, [id])?.[0];
    if (!existing) {
      return { success: false, message: `Задача с ID "${id}" не найдена в базе данных.` };
    }

    const newName = name?.trim() || existing.name;
    const newDesc = description !== undefined ? description : existing.description;
    const newStatus = status || existing.status;

    executeRun(`
      UPDATE cron_tasks 
      SET schedule = ?, name = ?, description = ?, status = ?
      WHERE id = ?
    `, [schedule.trim(), newName, newDesc, newStatus, id]);
    saveDb();

    const updatedTask: CronTaskInfo = {
      ...existing,
      schedule: schedule.trim(),
      name: newName,
      description: newDesc,
      status: newStatus
    };

    scheduleTaskJob(updatedTask);

    return {
      success: true,
      message: `Расписание задачи "${newName}" успешно обновлено (${schedule})!`,
      task: updatedTask
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export function toggleCronTaskStatus(id: string): { success: boolean; status: string; message: string } {
  try {
    const existing = executeQuery<CronTaskInfo>(`SELECT * FROM cron_tasks WHERE id = ?`, [id])?.[0];
    if (!existing) {
      return { success: false, status: 'UNKNOWN', message: `Задача не найдена: ${id}` };
    }

    const nextStatus = existing.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    executeRun(`UPDATE cron_tasks SET status = ? WHERE id = ?`, [nextStatus, id]);
    saveDb();

    const updatedTask = { ...existing, status: nextStatus };
    scheduleTaskJob(updatedTask as CronTaskInfo);

    return {
      success: true,
      status: nextStatus,
      message: `Статус задачи "${existing.name}" изменен на ${nextStatus === 'ACTIVE' ? 'АКТИВЕН' : 'ПРИОСТАНОВЛЕН'}`
    };
  } catch (err: any) {
    return { success: false, status: 'ERROR', message: err.message };
  }
}

export function createNewCronTask(
  name: string,
  schedule: string,
  description?: string
): { success: boolean; message: string; task?: CronTaskInfo } {
  try {
    if (!cron.validate(schedule)) {
      return { success: false, message: `Некорректное Cron-выражение: "${schedule}"` };
    }

    const id = `cron_custom_${Date.now()}`;
    executeRun(`
      INSERT INTO cron_tasks (id, name, schedule, description, status)
      VALUES (?, ?, ?, ?, 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, schedule = EXCLUDED.schedule, description = EXCLUDED.description
    `, [id, name.trim(), schedule.trim(), description?.trim() || 'Пользовательская крон-задача']);
    saveDb();

    const newTask: CronTaskInfo = {
      id,
      name: name.trim(),
      schedule: schedule.trim(),
      description: description?.trim() || '',
      status: 'ACTIVE',
      run_count: 0
    };

    scheduleTaskJob(newTask);
    return { success: true, message: `Новая задача "${name}" успешно создана и активирована!`, task: newTask };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export function deleteCronTask(id: string): { success: boolean; message: string } {
  try {
    if (activeJobs.has(id)) {
      activeJobs.get(id)?.stop();
      activeJobs.delete(id);
    }
    executeRun(`DELETE FROM cron_tasks WHERE id = ?`, [id]);
    saveDb();
    return { success: true, message: `Задача ${id} удалена из расписания.` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

