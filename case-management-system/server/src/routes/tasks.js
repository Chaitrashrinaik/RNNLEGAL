const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { logFromRequest } = require('../utils/activityLogger');

const router = express.Router();
router.use(auth);

const TASK_CATEGORIES = {
  'Case Preparation': ['Review case file', 'Prepare case summary', 'Study previous hearing', 'Prepare arguments', 'Prepare counter arguments', 'Prepare hearing notes', 'Prepare cross-examination questions', 'Review opposing party arguments'],
  'Legal Research': ['Research case laws', 'Find similar judgments', 'Research relevant Acts/Sections', 'Research legal provisions', 'Research opposing arguments', 'Verify legal citations', 'Prepare research notes'],
  'Document Work': ['Collect documents', 'Verify documents', 'Scan documents', 'Upload documents', 'Organize case documents', 'Prepare petition', 'Prepare application', 'Prepare affidavit', 'Prepare written statement', 'Review court order', 'Upload court order'],
  'Hearing Preparation': ['Prepare for upcoming hearing', 'Review previous hearing', 'Review court directions', 'Prepare arguments', 'Prepare questions', 'Prepare witnesses', 'Contact client before hearing', 'Coordinate with Senior Advocate', 'Attend hearing', 'Update hearing proceedings after hearing', 'Upload hearing documents', 'Record next hearing date'],
  'Client-Related': ['Contact client', 'Schedule client meeting', 'Request missing documents', 'Verify client information', 'Collect additional case information', 'Explain hearing update to client', 'Follow up with client'],
  'Court / Follow-Up': ['Check case status', 'Verify next hearing date', 'Follow up on application', 'Follow up on filing', 'Check order status', 'Download latest order', 'Upload latest order', 'Follow up with opposing counsel'],
  'Administrative': ['Verify case information', 'Update case details', 'Organize case records', 'Payment reminder', 'Verify receipt'],
};

// GET /api/tasks/categories - Task categories and subcategories
router.get('/categories', (req, res) => {
  res.json({ success: true, data: TASK_CATEGORIES });
});

// GET /api/tasks/templates - List templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await queryAll('SELECT * FROM task_templates ORDER BY isSystem DESC, name ASC');
    for (const t of templates) {
      t.items = await queryAll('SELECT * FROM task_template_items WHERE templateId = ? ORDER BY sortOrder', [t.id]);
    }
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tasks/templates - Create template
router.post('/templates', async (req, res) => {
  try {
    const { name, description, category, items } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await queryAll(
      'INSERT INTO task_templates (id, name, description, category, createdBy, isSystem, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [id, name, description || null, category || null, req.user.id, now]
    );
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await queryAll(
          'INSERT INTO task_template_items (id, templateId, title, taskCategory, priority, estimatedDays, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), id, item.title, item.taskCategory || null, item.priority || 'medium', item.estimatedDays || 1, i]
        );
      }
    }
    const template = await queryOne('SELECT * FROM task_templates WHERE id = ?', [id]);
    template.items = await queryAll('SELECT * FROM task_template_items WHERE templateId = ? ORDER BY sortOrder', [id]);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tasks/templates/:id/apply - Apply template to create tasks
router.post('/templates/:id/apply', async (req, res) => {
  try {
    const { caseId, assignedTo, baseDate, relatedHearingDate, relatedHearingId } = req.body;
    const template = await queryOne('SELECT * FROM task_templates WHERE id = ?', [req.params.id]);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const items = await queryAll('SELECT * FROM task_template_items WHERE templateId = ? ORDER BY sortOrder', [template.id]);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const base = baseDate ? new Date(baseDate) : new Date();
    const createdTasks = [];

    for (const item of items) {
      const due = new Date(base);
      due.setDate(due.getDate() + (item.estimatedDays || 1));
      const taskId = uuidv4();
      await queryAll(
        `INSERT INTO tasks (id, title, description, caseId, assignedTo, assignedBy, assignedByName, priority, status, dueDate, startDate, taskCategory, relatedHearingDate, relatedHearingId, taskType, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not started', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [taskId, item.title, null, caseId, assignedTo, req.user.id, req.user.name, item.priority, due.toISOString().slice(0, 19).replace('T', ' '), base.toISOString().slice(0, 19).replace('T', ' '), item.taskCategory || null, relatedHearingDate || null, relatedHearingId || null, item.title, now, now]
      );
      createdTasks.push(taskId);
    }

    res.json({ success: true, data: { taskIds: createdTasks, count: createdTasks.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tasks/overdue-count - Count overdue tasks for current user
router.get('/overdue-count', async (req, res) => {
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const isAdvocate = req.user.role === 'advocate';
    let where = "WHERE status NOT IN ('completed','cancelled','overdue') AND dueDate IS NOT NULL AND dueDate < ?";
    const params = [now];
    if (isAdvocate) { where += ' AND assignedTo = ?'; params.push(req.user.id); }
    const result = await queryOne(`SELECT COUNT(*) as count FROM tasks ${where}`, params);
    await queryAll(`UPDATE tasks SET status = 'overdue', updatedAt = ? ${where}`, [now, ...params]);
    res.json({ success: true, data: { count: result?.count || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tasks - List tasks (admin sees all, advocate sees own)
router.get('/', async (req, res) => {
  try {
    const { status, priority, assignedTo, caseId, category, dueDate, page = 1, limit = 50 } = req.query;
    const isAdvocate = req.user.role === 'advocate';
    const userId = req.user.id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE 1=1';
    const params = [];

    if (status) { where += ' AND t.status = ?'; params.push(status); }
    if (priority) { where += ' AND t.priority = ?'; params.push(priority); }
    if (assignedTo && !isAdvocate) { where += ' AND t.assignedTo = ?'; params.push(assignedTo); }
    if (caseId) { where += ' AND t.caseId = ?'; params.push(caseId); }
    if (category) { where += ' AND t.taskCategory = ?'; params.push(category); }

    if (isAdvocate) {
      where += ' AND t.assignedTo = ?';
      params.push(userId);
    }

    const countSql = `SELECT COUNT(*) as total FROM tasks t ${where}`;
    const total = (await queryOne(countSql, params))?.total || 0;

    const sql = `SELECT t.*, c.caseNumber, c.caseTitle, u.name as assigneeName, a.name as assignerName
      FROM tasks t
      LEFT JOIN cases c ON t.caseId = c.id
      LEFT JOIN users u ON t.assignedTo = u.id
      LEFT JOIN users a ON t.assignedBy = a.id
      ${where}
      ORDER BY
        CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
        CASE WHEN t.dueDate IS NULL THEN 1 ELSE 0 END, t.dueDate ASC
      LIMIT ? OFFSET ?`;
    const tasks = await queryAll(sql, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: tasks.map(t => {
        const parsed = { ...t };
        if (parsed.dueDate) parsed.dueDate = new Date(parsed.dueDate).toISOString();
        if (parsed.startDate) parsed.startDate = new Date(parsed.startDate).toISOString();
        if (parsed.completedAt) parsed.completedAt = new Date(parsed.completedAt).toISOString();
        if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt).toISOString();
        return parsed;
      }),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get tasks error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching tasks' });
  }
});

// GET /api/tasks/my - Junior advocate's own tasks grouped
router.get('/my', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const today = new Date().toISOString().slice(0, 10);

    const tasks = await queryAll(
      `SELECT t.*, c.caseNumber, c.caseTitle, c.nextHearingDate
       FROM tasks t LEFT JOIN cases c ON t.caseId = c.id
       WHERE t.assignedTo = ? ORDER BY
       CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
       CASE WHEN t.dueDate IS NULL THEN 1 ELSE 0 END, t.dueDate ASC`,
      [userId]
    );

    const grouped = {
      today: [],
      upcoming: [],
      overdue: [],
      inProgress: [],
      completed: [],
      notStarted: [],
    };

    for (const t of tasks) {
      const dueDate = t.dueDate ? t.dueDate.slice(0, 10) : null;
      if (t.status === 'completed') { grouped.completed.push(t); }
      else if (t.status === 'cancelled') { /* skip */ }
      else if (t.status === 'in-progress') { grouped.inProgress.push(t); }
      else if (dueDate && dueDate < today) { grouped.overdue.push(t); }
      else if (dueDate === today) { grouped.today.push(t); }
      else if (dueDate && dueDate > today) { grouped.upcoming.push(t); }
      else { grouped.notStarted.push(t); }
    }

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Get my tasks error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/tasks/stats - Task statistics
router.get('/stats', async (req, res) => {
  try {
    const isAdvocate = req.user.role === 'advocate';
    const userId = req.user.id;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const today = new Date().toISOString().slice(0, 10);

    let where = '';
    const params = [];
    if (isAdvocate) { where = 'WHERE assignedTo = ?'; params.push(userId); }

    const all = await queryAll(`SELECT status, dueDate, priority FROM tasks ${where}`, params);
    const stats = {
      total: all.length,
      notStarted: all.filter(t => t.status === 'not started').length,
      inProgress: all.filter(t => t.status === 'in-progress').length,
      completed: all.filter(t => t.status === 'completed').length,
      overdue: all.filter(t => t.status === 'overdue' || (t.dueDate && t.dueDate.slice(0, 10) < today && !['completed', 'cancelled'].includes(t.status))).length,
      today: all.filter(t => t.dueDate && t.dueDate.slice(0, 10) === today && !['completed', 'cancelled'].includes(t.status)).length,
      upcoming: all.filter(t => t.dueDate && t.dueDate.slice(0, 10) > today && !['completed', 'cancelled'].includes(t.status)).length,
      urgent: all.filter(t => t.priority === 'urgent' && !['completed', 'cancelled'].includes(t.status)).length,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tasks/:id - Get single task with history and comments
router.get('/:id', async (req, res) => {
  try {
    const task = await queryOne(
      `SELECT t.*, c.caseNumber, c.caseTitle, c.nextHearingDate, u.name as assigneeName, a.name as assignerName
       FROM tasks t LEFT JOIN cases c ON t.caseId = c.id LEFT JOIN users u ON t.assignedTo = u.id LEFT JOIN users a ON t.assignedBy = a.id WHERE t.id = ?`,
      [req.params.id]
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const history = await queryAll('SELECT * FROM task_history WHERE taskId = ? ORDER BY createdAt DESC', [task.id]);
    const comments = await queryAll('SELECT * FROM task_comments WHERE taskId = ? ORDER BY createdAt DESC', [task.id]);

    if (task.dueDate) task.dueDate = new Date(task.dueDate).toISOString();
    if (task.startDate) task.startDate = new Date(task.startDate).toISOString();
    if (task.completedAt) task.completedAt = new Date(task.completedAt).toISOString();

    res.json({ success: true, data: { ...task, history, comments } });
  } catch (error) {
    console.error('Get task error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tasks - Create task
router.post('/', async (req, res) => {
  try {
    const { title, description, caseId, assignedTo, priority, dueDate, startDate, taskCategory, taskType, relatedHearingDate, relatedHearingId } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await queryAll(
      `INSERT INTO tasks (id, title, description, caseId, assignedTo, assignedBy, assignedByName, priority, status, dueDate, startDate, taskCategory, taskType, relatedHearingDate, relatedHearingId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not started', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description || null, caseId || null, assignedTo || null, req.user.id, req.user.name || req.user.email, priority || 'medium',
       dueDate ? new Date(dueDate).toISOString().slice(0, 19).replace('T', ' ') : null,
       startDate ? new Date(startDate).toISOString().slice(0, 19).replace('T', ' ') : null,
       taskCategory || null, taskType || title, relatedHearingDate || null, relatedHearingId || null, now, now]
    );

    // Record history
    await queryAll(
      'INSERT INTO task_history (id, taskId, action, changedBy, changedByName, newValue, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), id, 'created', req.user.id, req.user.name || req.user.email, title, `Priority: ${priority || 'medium'}`, now]
    );

    // Notify assigned advocate
    if (assignedTo) {
      const assignee = await queryOne('SELECT name FROM users WHERE id = ?', [assignedTo]);
      const caseRow = await queryOne('SELECT caseNumber FROM cases WHERE id = ?', [caseId]);
      await queryAll(
        'INSERT INTO notifications (id, userId, title, message, type, entity, entityId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
        [uuidv4(), assignedTo, 'New Task Assigned', `You have been assigned task "${title}" for case ${caseRow?.caseNumber || caseId}`, 'task', 'task', id, now]
      );
    }

    const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: task });

    logFromRequest(req, { action: 'task_created', entity: 'task', entityId: id, caseId: req.body.caseId, module: 'Tasks', details: `Task created: ${req.body.title}`, newValue: { title: req.body.title, priority: req.body.priority, assignedTo: req.body.assignedTo, dueDate: req.body.dueDate } });
  } catch (error) {
    console.error('Create task error:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error creating task' });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });

    const { title, description, caseId, assignedTo, priority, status, dueDate, startDate, taskCategory, taskType, relatedHearingDate, relatedHearingId, completionNote, completionAttachments } = req.body;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const newStatus = status || existing.status;
    const completedAt = newStatus === 'completed' && existing.status !== 'completed' ? now : existing.completedAt;
    const completedByName = newStatus === 'completed' && existing.status !== 'completed' ? (req.user.name || req.user.email) : existing.completedByName;

    // Track changes for history
    const changes = [];
    if (priority && priority !== existing.priority) changes.push({ field: 'priority', from: existing.priority, to: priority });
    if (dueDate && dueDate !== existing.dueDate) changes.push({ field: 'dueDate', from: existing.dueDate, to: dueDate });
    if (assignedTo && assignedTo !== existing.assignedTo) changes.push({ field: 'assignedTo', from: existing.assignedTo, to: assignedTo });
    if (status && status !== existing.status) changes.push({ field: 'status', from: existing.status, to: status });
    if (title && title !== existing.title) changes.push({ field: 'title', from: existing.title, to: title });

    await queryAll(
      `UPDATE tasks SET title = ?, description = ?, caseId = ?, assignedTo = ?, assignedByName = ?, priority = ?, status = ?, dueDate = ?, startDate = ?, taskCategory = ?, taskType = ?, relatedHearingDate = ?, relatedHearingId = ?, completedAt = ?, completedByName = ?, completionNote = ?, completionAttachments = ?, lastUpdatedBy = ?, updatedAt = ? WHERE id = ?`,
      [
        title || existing.title, description !== undefined ? description : existing.description,
        caseId !== undefined ? caseId : existing.caseId, assignedTo !== undefined ? assignedTo : existing.assignedTo,
        existing.assignedByName, priority || existing.priority, newStatus,
        dueDate ? new Date(dueDate).toISOString().slice(0, 19).replace('T', ' ') : existing.dueDate,
        startDate ? new Date(startDate).toISOString().slice(0, 19).replace('T', ' ') : existing.startDate,
        taskCategory !== undefined ? taskCategory : existing.taskCategory,
        taskType !== undefined ? taskType : existing.taskType,
        relatedHearingDate || existing.relatedHearingDate, relatedHearingId || existing.relatedHearingId,
        completedAt, completedByName,
        completionNote || existing.completionNote, completionAttachments || existing.completionAttachments,
        req.user.id, now, req.params.id,
      ]
    );

    // Record each change in history
    for (const change of changes) {
      await queryAll(
        'INSERT INTO task_history (id, taskId, action, changedBy, changedByName, previousValue, newValue, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), req.params.id, `${change.field}_changed`, req.user.id, req.user.name || req.user.email, String(change.from), String(change.to), `${change.field} updated`, now]
      );
    }

    if (newStatus === 'completed' && existing.status !== 'completed') {
      await queryAll(
        'INSERT INTO task_history (id, taskId, action, changedBy, changedByName, newValue, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), req.params.id, 'completed', req.user.id, req.user.name || req.user.email, 'completed', completionNote || 'Task completed', now]
      );
      // Notify admin
      if (existing.assignedBy && existing.assignedBy !== req.user.id) {
        await queryAll(
          'INSERT INTO notifications (id, userId, title, message, type, entity, entityId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
          [uuidv4(), existing.assignedBy, 'Task Completed', `Task "${existing.title}" has been completed by ${req.user.name || req.user.email}`, 'task', 'task', req.params.id, now]
        );
      }
    }

    if (changes.some(c => c.field === 'priority')) {
      const assignee = await queryOne('SELECT name FROM users WHERE id = ?', [assignedTo || existing.assignedTo]);
      if (assignee && (assignedTo || existing.assignedTo) !== req.user.id) {
        await queryAll(
          'INSERT INTO notifications (id, userId, title, message, type, entity, entityId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
          [uuidv4(), assignedTo || existing.assignedTo, 'Task Priority Changed', `Priority of task "${existing.title}" changed to ${priority}`, 'task', 'task', req.params.id, now]
        );
      }
    }

    const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: task });

    logFromRequest(req, { action: 'task_updated', entity: 'task', entityId: req.params.id, caseId: existing?.caseId, module: 'Tasks', details: `Task updated: ${existing?.title || ''}` });
  } catch (error) {
    console.error('Update task error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating task' });
  }
});

// POST /api/tasks/:id/comment - Add comment to task
router.post('/:id/comment', async (req, res) => {
  try {
    const { comment, attachmentUrl, attachmentName } = req.body;
    if (!comment) return res.status(400).json({ success: false, message: 'Comment is required' });

    const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await queryAll(
      'INSERT INTO task_comments (id, taskId, userId, userName, comment, attachmentUrl, attachmentName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.params.id, req.user.id, req.user.name || req.user.email, comment, attachmentUrl || null, attachmentName || null, now]
    );

    await queryAll(
      'INSERT INTO task_history (id, taskId, action, changedBy, changedByName, newValue, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.params.id, 'comment_added', req.user.id, req.user.name || req.user.email, comment.slice(0, 200), 'Comment added', now]
    );

    // Notify assignee if admin commented, notify admin if assignee commented
    const notifyUserId = req.user.id === task.assignedBy ? task.assignedTo : task.assignedBy;
    if (notifyUserId && notifyUserId !== req.user.id) {
      await queryAll(
        'INSERT INTO notifications (id, userId, title, message, type, entity, entityId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
        [uuidv4(), notifyUserId, 'New Comment on Task', `${req.user.name || req.user.email} commented on task "${task.title}"`, 'task', 'task', req.params.id, now]
      );
    }

    const newComment = await queryOne('SELECT * FROM task_comments WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: newComment });

    logFromRequest(req, { action: 'task_comment_added', entity: 'task', entityId: req.params.id, module: 'Tasks', details: `Comment added to task` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/tasks/:id - Delete task (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role === 'advocate') {
      return res.status(403).json({ success: false, message: 'Employees cannot delete tasks' });
    }
    const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    await queryAll('DELETE FROM task_comments WHERE taskId = ?', [req.params.id]);
    await queryAll('DELETE FROM task_history WHERE taskId = ?', [req.params.id]);
    await queryAll('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Task deleted' });

    logFromRequest(req, { action: 'task_deleted', entity: 'task', entityId: req.params.id, module: 'Tasks', details: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error.message);
    res.status(500).json({ success: false, message: 'Server error deleting task' });
  }
});

// PATCH /api/tasks/:id/reassign - Admin reassigns task to another employee
router.patch('/:id/reassign', async (req, res) => {
  try {
    if (req.user.role === 'advocate') {
      return res.status(403).json({ success: false, message: 'Employees cannot reassign tasks' });
    }
    const { assignedTo } = req.body;
    if (!assignedTo) return res.status(400).json({ success: false, message: 'assignedTo is required' });

    const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const newAssignee = await queryOne('SELECT id, name FROM users WHERE id = ?', [assignedTo]);
    if (!newAssignee) return res.status(404).json({ success: false, message: 'User not found' });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await queryAll('UPDATE tasks SET assignedTo = ?, assignedByName = ?, lastUpdatedBy = ?, updatedAt = ? WHERE id = ?',
      [assignedTo, req.user.name || req.user.email, req.user.id, now, req.params.id]);

    await queryAll(
      'INSERT INTO task_history (id, taskId, action, changedBy, changedByName, previousValue, newValue, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.params.id, 'reassigned', req.user.id, req.user.name || req.user.email, task.assignedTo, assignedTo, `Reassigned to ${newAssignee.name}`, now]
    );

    // Notify new assignee
    await queryAll(
      'INSERT INTO notifications (id, userId, title, message, type, entity, entityId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
      [uuidv4(), assignedTo, 'Task Reassigned', `Task "${task.title}" has been assigned to you by ${req.user.name || req.user.email}`, 'task', 'task', req.params.id, now]
    );

    const updated = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });

    logFromRequest(req, { action: 'task_reassigned', entity: 'task', entityId: req.params.id, module: 'Tasks', details: `Task reassigned to ${newAssignee.name}` });
  } catch (error) {
    console.error('Reassign task error:', error.message);
    res.status(500).json({ success: false, message: 'Server error reassigning task' });
  }
});

// PATCH /api/tasks/:id/status - Employee updates their own task status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['not started', 'in-progress', 'completed', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Employees can only update their own tasks
    if (req.user.role === 'advocate' && task.assignedTo !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only update your own tasks' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const completedAt = status === 'completed' && task.status !== 'completed' ? now : task.completedAt;
    const completedByName = status === 'completed' && task.status !== 'completed' ? (req.user.name || req.user.email) : task.completedByName;

    await queryAll('UPDATE tasks SET status = ?, completedAt = ?, completedByName = ?, lastUpdatedBy = ?, updatedAt = ? WHERE id = ?',
      [status, completedAt, completedByName, req.user.id, now, req.params.id]);

    await queryAll(
      'INSERT INTO task_history (id, taskId, action, changedBy, changedByName, previousValue, newValue, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.params.id, 'status_changed', req.user.id, req.user.name || req.user.email, task.status, status, `Status changed to ${status}`, now]
    );

    // Notify admin when employee completes task
    if (status === 'completed' && task.assignedBy && task.assignedBy !== req.user.id) {
      await queryAll(
        'INSERT INTO notifications (id, userId, title, message, type, entity, entityId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
        [uuidv4(), task.assignedBy, 'Task Completed', `Task "${task.title}" has been completed by ${req.user.name || req.user.email}`, 'task', 'task', req.params.id, now]
      );
    }

    const updated = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });

    logFromRequest(req, { action: 'task_status_changed', entity: 'task', entityId: req.params.id, module: 'Tasks', details: `Status changed to ${status}` });
  } catch (error) {
    console.error('Update task status error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating status' });
  }
});

module.exports = router;
