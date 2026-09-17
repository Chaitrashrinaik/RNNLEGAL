const cron = require('node-cron');
const { getDb, queryAll, queryOne, saveDb } = require('../config/db');
const Notification = require('../models/Notification');
const { formatDate } = require('../utils/helpers');
const logger = require('../utils/logger');

const scheduleHearingReminders = () => {
  cron.schedule('0 8 * * *', async () => {
    logger.info('[Cron] Running hearing reminder check...');
    try {
      const now = new Date().toISOString();
      const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const upcomingCases = await queryAll(
        `SELECT c.*, cl.name as client_name, cl.email as client_email, cl.phone as client_phone
         FROM cases c
         LEFT JOIN clients cl ON c.clientId = cl.id
         WHERE c.nextHearingDate >= ? AND c.nextHearingDate <= ?
         AND c.status IN ('active', 'in-progress', 'pending')`,
        [now, sevenDays]
      );

      for (const caseItem of upcomingCases) {
        const reminders = JSON.parse(caseItem.reminders || '[]');
        const alreadyNotified = reminders.some(
          (r) => r.type === 'hearing' && r.sent && new Date(r.date).toDateString() === new Date().toDateString()
        );
        if (alreadyNotified) continue;

        const advocates = await queryAll(
          `SELECT u.id, u.name, u.email, u.phone FROM case_advocates ca JOIN users u ON ca.userId = u.id WHERE ca.caseId = ?`,
          [caseItem.id]
        );

        const hearingDate = new Date(caseItem.nextHearingDate);
        const daysUntil = Math.ceil((hearingDate - new Date()) / (1000 * 60 * 60 * 24));

        for (const advocate of advocates) {
          await Notification.create({
            userId: advocate.id,
            title: `Hearing in ${daysUntil} day(s): ${caseItem.caseNumber}`,
            message: `Upcoming hearing for ${caseItem.caseTitle} on ${formatDate(caseItem.nextHearingDate)}`,
            type: 'hearing',
            caseId: caseItem.id,
            link: `/cases/${caseItem.id}`,
          });
        }

        reminders.push({ date: now, type: 'hearing', sent: true });
        await getDb().execute('UPDATE cases SET reminders = ? WHERE id = ?', [JSON.stringify(reminders), caseItem.id]);
      }

      saveDb();
      logger.info(`[Cron] Hearing reminders processed for ${upcomingCases.length} cases`);
    } catch (error) {
      logger.error('[Cron] Hearing reminder error:', error.message);
    }
  });
};

const scheduleCauseListGeneration = () => {
  cron.schedule('0 7 * * 1-5', async () => {
    console.log('[Cron] Generating daily cause list...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const todayCases = await queryAll(
        `SELECT c.* FROM cases c
         WHERE c.nextHearingDate >= ? AND c.nextHearingDate < ?
         AND c.status IN ('active', 'in-progress', 'pending')`,
        [today.toISOString(), tomorrow.toISOString()]
      );

      if (todayCases.length > 0) {
        const caseIds = todayCases.map(c => c.id);
        const placeholders = caseIds.map(() => '?').join(',');
        const advocates = await queryAll(
          `SELECT DISTINCT ca.userId, u.name, u.email
           FROM case_advocates ca JOIN users u ON ca.userId = u.id
           WHERE ca.caseId IN (${placeholders})`,
          caseIds
        );

        const advocateIds = [...new Set(advocates.map(a => a.userId))];
        for (const advocateId of advocateIds) {
          const advocateCases = await queryAll(
            `SELECT c.id, c.caseNumber, c.caseTitle FROM cases c
             JOIN case_advocates ca ON c.id = ca.caseId
             WHERE ca.userId = ? AND c.nextHearingDate >= ? AND c.nextHearingDate < ?`,
            [advocateId, today.toISOString(), tomorrow.toISOString()]
          );

          await Notification.create({
            userId: advocateId,
            title: `Today's Cause List - ${todayCases.length} cases`,
            message: `You have ${advocateCases.length} case(s) scheduled for today.`,
            type: 'system',
            link: '/calendar',
          });
        }
      }

      logger.info(`[Cron] Cause list generated for ${todayCases.length} cases`);
    } catch (error) {
      logger.error('[Cron] Cause list generation error:', error.message);
    }
  });
};

const scheduleOverdueInvoiceCheck = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Checking for overdue invoices...');
    try {
      const now = new Date().toISOString();
      const overdueInvoices = await queryAll(
        `SELECT i.*, cl.name as client_name
         FROM invoices i
         LEFT JOIN clients cl ON i.clientId = cl.id
         WHERE i.status IN ('sent', 'draft') AND i.dueDate < ?`,
        [now]
      );

      for (const invoice of overdueInvoices) {
        await getDb().execute("UPDATE invoices SET status = 'overdue', updatedAt = ? WHERE id = ?", [now, invoice.id]);
        saveDb();

        await Notification.create({
          userId: invoice.createdBy,
          title: `Invoice Overdue: ${invoice.invoiceNumber}`,
          message: `Invoice for ${invoice.client_name} (Rs. ${invoice.total}) is overdue.`,
          type: 'invoice',
          link: `/invoices/${invoice.id}`,
        });
      }

      logger.info(`[Cron] ${overdueInvoices.length} invoices marked as overdue`);
    } catch (error) {
      logger.error('[Cron] Overdue invoice check error:', error.message);
    }
  });
};

const scheduleNotificationCleanup = () => {
  cron.schedule('0 2 * * 0', async () => {
    console.log('[Cron] Cleaning up old notifications...');
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      await Notification.deleteOldread(ninetyDaysAgo.toISOString());
      logger.info('[Cron] Cleaned up old read notifications');
    } catch (error) {
      logger.error('[Cron] Notification cleanup error:', error.message);
    }
  });
};

const startAllCronJobs = () => {
  logger.info('[Cron] Starting all cron jobs...');
  scheduleHearingReminders();
  scheduleCauseListGeneration();
  scheduleOverdueInvoiceCheck();
  scheduleNotificationCleanup();
  logger.info('[Cron] All cron jobs started');
};

module.exports = { startAllCronJobs };
