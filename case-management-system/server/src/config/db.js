const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool = null;

async function initDB() {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}. Check your .env file.`);
    }
  }

  const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];
  const isRemote = !LOCAL_HOSTS.includes(process.env.DB_HOST);
  const poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  if (isRemote) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  pool = mysql.createPool(poolConfig);

  const conn = await pool.getConnection();
  logger.info(`MySQL connected: ${conn.config.host}:${conn.config.port}/${conn.config.database}`);
  conn.release();

  await createTables();
  return pool;
}

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL, role VARCHAR(20) DEFAULT 'staff', phone VARCHAR(50),
      avatar VARCHAR(500), firmName VARCHAR(255) DEFAULT '', company VARCHAR(255), panNumber VARCHAR(20),
      googleId VARCHAR(255), isActive TINYINT DEFAULT 1,
      lastLogin VARCHAR(50), passwordResetToken VARCHAR(255), passwordResetExpires VARCHAR(50),
      createdAt VARCHAR(50), updatedAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50), address TEXT, company VARCHAR(255),
      panNumber VARCHAR(20), aadharNumber VARCHAR(20), notes TEXT,
      portalEnabled TINYINT DEFAULT 0, portalPassword VARCHAR(255),
      portalLastAccessed VARCHAR(50), createdBy VARCHAR(36),
      createdAt VARCHAR(50), updatedAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id VARCHAR(36) PRIMARY KEY, caseNumber VARCHAR(50) UNIQUE NOT NULL,
      caseTitle TEXT NOT NULL, caseType VARCHAR(30) NOT NULL, court VARCHAR(30) NOT NULL,
      courtName VARCHAR(255), judgeName VARCHAR(255),
      clientId VARCHAR(36) NOT NULL, filingDate VARCHAR(50), nextHearingDate VARCHAR(50),
      lastHearingDate VARCHAR(50), status VARCHAR(30) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'medium', description TEXT,
      oppositeParty VARCHAR(255), oppositePartyLawyer VARCHAR(255),
      orders TEXT, hearingHistory TEXT,
      tags TEXT, reminders TEXT,
      createdBy VARCHAR(36), createdAt VARCHAR(50), updatedAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS case_advocates (
      caseId VARCHAR(36) NOT NULL, userId VARCHAR(36) NOT NULL,
      PRIMARY KEY (caseId, userId)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id VARCHAR(36) PRIMARY KEY, title VARCHAR(500) NOT NULL,
      fileName VARCHAR(500) NOT NULL, originalName VARCHAR(500) NOT NULL,
      filePath VARCHAR(1000) NOT NULL, fileSize BIGINT NOT NULL,
      mimeType VARCHAR(100) NOT NULL, caseId VARCHAR(36), uploadedBy VARCHAR(36) NOT NULL,
      category VARCHAR(30) DEFAULT 'other', tags TEXT,
      versions TEXT, accessLevel VARCHAR(20) DEFAULT 'team',
      createdAt VARCHAR(50), updatedAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(36) PRIMARY KEY, invoiceNumber VARCHAR(30) UNIQUE NOT NULL,
      clientId VARCHAR(36) NOT NULL, caseId VARCHAR(36),
      items TEXT, subtotal DOUBLE NOT NULL,
      tax DOUBLE DEFAULT 0, total DOUBLE NOT NULL,
      status VARCHAR(20) DEFAULT 'draft', dueDate VARCHAR(50), paidDate VARCHAR(50),
      paidAmount DOUBLE DEFAULT 0, paymentMethod VARCHAR(30),
      notes TEXT, createdBy VARCHAR(36),
      createdAt VARCHAR(50), updatedAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY, userId VARCHAR(36) NOT NULL,
      title VARCHAR(500) NOT NULL, message TEXT NOT NULL,
      type VARCHAR(30) DEFAULT 'system', caseId VARCHAR(36),
      isRead TINYINT DEFAULT 0, link VARCHAR(500), createdAt VARCHAR(50)
    )
  `);

  const indexStatements = [
    'CREATE INDEX idx_users_email ON users(email)',
    'CREATE INDEX idx_clients_email ON clients(email)',
    'CREATE INDEX idx_cases_clientId ON cases(clientId)',
    'CREATE INDEX idx_cases_status ON cases(status)',
    'CREATE INDEX idx_cases_nextHearing ON cases(nextHearingDate)',
    'CREATE INDEX idx_documents_caseId ON documents(caseId)',
    'CREATE INDEX idx_invoices_clientId ON invoices(clientId)',
    'CREATE INDEX idx_notifications_userId ON notifications(userId)',
  ];
  for (const sql of indexStatements) {
    try { await pool.query(sql); } catch (e) { if (e.code !== 'ER_DUP_KEYNAME') throw e; }
  }

  try { await pool.query("ALTER TABLE users ADD COLUMN googleId VARCHAR(255)"); } catch(e) {}
  try { await pool.query("ALTER TABLE users ADD COLUMN panNumber VARCHAR(20)"); } catch(e) {}
  try { await pool.query("ALTER TABLE users ADD COLUMN company VARCHAR(255)"); } catch(e) {}
  try { await pool.query("ALTER TABLE cases ADD COLUMN notes TEXT"); } catch(e) {}
  try { await pool.query("ALTER TABLE clients ADD COLUMN resetOtp VARCHAR(10)"); } catch(e) {}
  try { await pool.query("ALTER TABLE clients ADD COLUMN resetOtpExpiry VARCHAR(50)"); } catch(e) {}
  try { await pool.query("ALTER TABLE clients ADD COLUMN emergencyContact VARCHAR(255)"); } catch(e) {}
  try { await pool.query("ALTER TABLE clients ADD COLUMN profilePhoto VARCHAR(500)"); } catch(e) {}
  try { await pool.query("ALTER TABLE cases ADD COLUMN visibleToClient TINYINT DEFAULT 1"); } catch(e) {}
  try { await pool.query("ALTER TABLE cases ADD COLUMN cnr VARCHAR(20)"); } catch(e) {}
  try { await pool.query("CREATE INDEX idx_cases_cnr ON cases(cnr)"); } catch(e) {}
  try { await pool.query("ALTER TABLE documents ADD COLUMN visibleToClient TINYINT DEFAULT 1"); } catch(e) {}
  try { await pool.query("ALTER TABLE documents ADD COLUMN cloudUrl VARCHAR(1000)"); } catch(e) {}
  try { await pool.query("ALTER TABLE documents ADD COLUMN cloudPublicId VARCHAR(500)"); } catch(e) {}
  try { await pool.query("ALTER TABLE documents ADD COLUMN thumbnailUrl VARCHAR(1000)"); } catch(e) {}

  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_notifications (
      id VARCHAR(36) PRIMARY KEY,
      clientId VARCHAR(36) NOT NULL,
      title VARCHAR(500) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(30) DEFAULT 'system',
      caseId VARCHAR(36),
      isRead TINYINT DEFAULT 0,
      link VARCHAR(500),
      createdAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      senderId VARCHAR(36) NOT NULL,
      senderType VARCHAR(20) NOT NULL,
      receiverId VARCHAR(36) NOT NULL,
      receiverType VARCHAR(20) NOT NULL,
      caseId VARCHAR(36),
      text TEXT,
      attachments TEXT,
      isRead TINYINT DEFAULT 0,
      createdAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id VARCHAR(36) PRIMARY KEY,
      clientId VARCHAR(36) NOT NULL,
      advocateId VARCHAR(36) NOT NULL,
      caseId VARCHAR(36),
      meetingType VARCHAR(30) NOT NULL,
      requestedDate VARCHAR(50) NOT NULL,
      requestedTime VARCHAR(50),
      reason TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      notes TEXT,
      createdAt VARCHAR(50),
      updatedAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      caseId VARCHAR(36),
      assignedTo VARCHAR(36),
      assignedBy VARCHAR(36),
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      dueDate VARCHAR(50),
      taskType VARCHAR(50),
      createdAt VARCHAR(50),
      updatedAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hearings (
      id VARCHAR(36) PRIMARY KEY,
      caseId VARCHAR(36) NOT NULL,
      hearingDate VARCHAR(50) NOT NULL,
      court VARCHAR(255),
      courtName VARCHAR(255),
      courtHall VARCHAR(255),
      judgeName VARCHAR(255),
      notes TEXT,
      status VARCHAR(30) DEFAULT 'scheduled',
      outcome VARCHAR(255),
      nextHearingDate VARCHAR(50),
      createdBy VARCHAR(36),
      createdAt VARCHAR(50),
      updatedAt VARCHAR(50)
    )
  `);

  const clientIndexStatements = [
    'CREATE INDEX idx_client_notifications_clientId ON client_notifications(clientId)',
    'CREATE INDEX idx_messages_sender ON messages(senderId, senderType)',
    'CREATE INDEX idx_messages_receiver ON messages(receiverId, receiverType)',
    'CREATE INDEX idx_appointments_clientId ON appointments(clientId)',
    'CREATE INDEX idx_appointments_advocateId ON appointments(advocateId)',
  ];
  for (const sql of clientIndexStatements) {
    try { await pool.query(sql); } catch (e) { if (e.code !== 'ER_DUP_KEYNAME') throw e; }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(36) PRIMARY KEY,
      caseId VARCHAR(36) NOT NULL,
      clientId VARCHAR(36),
      amount DOUBLE NOT NULL,
      paymentMethod VARCHAR(30) DEFAULT 'cash',
      transactionRef VARCHAR(255),
      receiptNumber VARCHAR(100),
      paymentDate VARCHAR(50) NOT NULL,
      status VARCHAR(20) DEFAULT 'completed',
      notes TEXT,
      recordedBy VARCHAR(36),
      createdAt VARCHAR(50),
      updatedAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS case_updates (
      id VARCHAR(36) PRIMARY KEY,
      caseId VARCHAR(36) NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      priority VARCHAR(20) DEFAULT 'medium',
      relatedHearingDate VARCHAR(50),
      addedBy VARCHAR(36) NOT NULL,
      createdAt VARCHAR(50),
      updatedAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36),
      userName VARCHAR(255),
      action VARCHAR(100),
      entity VARCHAR(50),
      entityId VARCHAR(36),
      details TEXT,
      ipAddress VARCHAR(50),
      createdAt VARCHAR(50)
    )
  `);

  const paymentIndexStatements = [
    'CREATE INDEX idx_payments_caseId ON payments(caseId)',
    'CREATE INDEX idx_payments_clientId ON payments(clientId)',
    'CREATE INDEX idx_case_updates_caseId ON case_updates(caseId)',
    'CREATE INDEX idx_activity_logs_userId ON activity_logs(userId)',
    'CREATE INDEX idx_activity_logs_entity ON activity_logs(entity, entityId)',
  ];
  for (const sql of paymentIndexStatements) {
    try { await pool.query(sql); } catch (e) { if (e.code !== 'ER_DUP_KEYNAME') throw e; }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignment_history (
      id VARCHAR(36) PRIMARY KEY,
      caseId VARCHAR(36) NOT NULL,
      advocateId VARCHAR(36) NOT NULL,
      role VARCHAR(50) NOT NULL,
      assignedBy VARCHAR(36) NOT NULL,
      assignedByName VARCHAR(255),
      assignedAt VARCHAR(50) NOT NULL,
      unassignedAt VARCHAR(50),
      isActive TINYINT(1) DEFAULT 1,
      notes TEXT,
      createdAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_history (
      id VARCHAR(36) PRIMARY KEY,
      taskId VARCHAR(36) NOT NULL,
      action VARCHAR(100) NOT NULL,
      changedBy VARCHAR(36) NOT NULL,
      changedByName VARCHAR(255),
      previousValue TEXT,
      newValue TEXT,
      details TEXT,
      createdAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id VARCHAR(36) PRIMARY KEY,
      taskId VARCHAR(36) NOT NULL,
      userId VARCHAR(36) NOT NULL,
      userName VARCHAR(255),
      comment TEXT NOT NULL,
      attachmentUrl VARCHAR(500),
      attachmentName VARCHAR(255),
      createdAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_templates (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      createdBy VARCHAR(36) NOT NULL,
      isSystem TINYINT(1) DEFAULT 0,
      createdAt VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_template_items (
      id VARCHAR(36) PRIMARY KEY,
      templateId VARCHAR(36) NOT NULL,
      title VARCHAR(500) NOT NULL,
      taskCategory VARCHAR(100),
      priority VARCHAR(20) DEFAULT 'medium',
      estimatedDays INT DEFAULT 1,
      sortOrder INT DEFAULT 0
    )
  `);

  const newIndexStatements = [
    'CREATE INDEX idx_assignment_history_caseId ON assignment_history(caseId)',
    'CREATE INDEX idx_assignment_history_advocateId ON assignment_history(advocateId)',
    'CREATE INDEX idx_task_history_taskId ON task_history(taskId)',
    'CREATE INDEX idx_task_comments_taskId ON task_comments(taskId)',
    'CREATE INDEX idx_task_template_items_templateId ON task_template_items(templateId)',
  ];
  for (const sql of newIndexStatements) {
    try { await pool.query(sql); } catch (e) { if (e.code !== 'ER_DUP_KEYNAME') {} }
  }

  const alterStatements = [
    "ALTER TABLE cases ADD COLUMN caseCategory VARCHAR(50)",
    "ALTER TABLE cases ADD COLUMN courtNumber VARCHAR(50)",
    "ALTER TABLE cases ADD COLUMN location VARCHAR(255)",
    "ALTER TABLE cases ADD COLUMN caseRegistrationDate VARCHAR(50)",
    "ALTER TABLE cases ADD COLUMN caseStage VARCHAR(100)",
    "ALTER TABLE cases ADD COLUMN seniorAdvocateId VARCHAR(36)",
    "ALTER TABLE cases ADD COLUMN totalFee DOUBLE DEFAULT 0",
    "ALTER TABLE cases ADD COLUMN amountPaid DOUBLE DEFAULT 0",
    "ALTER TABLE cases ADD COLUMN amountPending DOUBLE DEFAULT 0",
    "ALTER TABLE cases ADD COLUMN nextPaymentDue VARCHAR(50)",
    "ALTER TABLE cases ADD COLUMN paymentDueDate VARCHAR(50)",
    "ALTER TABLE cases ADD COLUMN nextHearingPurpose TEXT",
    "ALTER TABLE cases ADD COLUMN caseOutcome VARCHAR(50)",
    "ALTER TABLE users ADD COLUMN barCouncilNumber VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN advocateId VARCHAR(50)",
    "ALTER TABLE hearings ADD COLUMN attendedBy VARCHAR(36)",
    "ALTER TABLE hearings ADD COLUMN purpose TEXT",
    "ALTER TABLE hearings ADD COLUMN argumentsPresented TEXT",
    "ALTER TABLE hearings ADD COLUMN documentsSubmitted TEXT",
    "ALTER TABLE hearings ADD COLUMN courtDirections TEXT",
    "ALTER TABLE hearings ADD COLUMN orderPassed TEXT",
    "ALTER TABLE hearings ADD COLUMN nextHearingPurpose TEXT",
    "ALTER TABLE hearings ADD COLUMN uploadedDocuments TEXT",
    "ALTER TABLE hearings ADD COLUMN summary TEXT",
    "ALTER TABLE tasks ADD COLUMN completedAt VARCHAR(50)",
    "ALTER TABLE tasks ADD COLUMN assignedByName VARCHAR(255)",
    "ALTER TABLE tasks ADD COLUMN completedByName VARCHAR(255)",
    "ALTER TABLE tasks ADD COLUMN completionNote TEXT",
    "ALTER TABLE tasks ADD COLUMN completionAttachments TEXT",
    "ALTER TABLE tasks ADD COLUMN startDate VARCHAR(50)",
    "ALTER TABLE tasks ADD COLUMN taskCategory VARCHAR(100)",
    "ALTER TABLE tasks ADD COLUMN relatedHearingDate VARCHAR(50)",
    "ALTER TABLE tasks ADD COLUMN relatedHearingId VARCHAR(36)",
    "ALTER TABLE tasks ADD COLUMN lastUpdatedBy VARCHAR(36)",
    "ALTER TABLE cases ADD COLUMN supportingAdvocateIds TEXT",
    "ALTER TABLE cases ADD COLUMN assignedOn VARCHAR(50)",
    "ALTER TABLE cases ADD COLUMN assignedBy VARCHAR(36)",
    "ALTER TABLE notifications ADD COLUMN entity VARCHAR(50)",
    "ALTER TABLE notifications ADD COLUMN entityId VARCHAR(36)",
    "ALTER TABLE cases ADD COLUMN juniorAdvocateId VARCHAR(36)",
    "ALTER TABLE activity_logs ADD COLUMN advocateId VARCHAR(50)",
    "ALTER TABLE activity_logs ADD COLUMN role VARCHAR(50)",
    "ALTER TABLE activity_logs ADD COLUMN module VARCHAR(50)",
    "ALTER TABLE activity_logs ADD COLUMN caseId VARCHAR(36)",
    "ALTER TABLE activity_logs ADD COLUMN oldValue TEXT",
    "ALTER TABLE activity_logs ADD COLUMN newValue TEXT",
    "ALTER TABLE activity_logs ADD COLUMN relatedId VARCHAR(36)",
    "ALTER TABLE cases ADD COLUMN courtLocation VARCHAR(50)",
  ];
  for (const sql of alterStatements) {
    try { await pool.query(sql); } catch (e) { console.error('ALTER TABLE failed:', sql, e.message); }
  }

  try { await pool.query("ALTER TABLE clients DROP INDEX idx_clients_email"); } catch (e) {}
  try { await pool.query("ALTER TABLE clients MODIFY COLUMN email VARCHAR(255) NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE clients ADD INDEX idx_clients_email (email)"); } catch (e) {}

  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id VARCHAR(36) PRIMARY KEY,
      recipientPhone VARCHAR(20) NOT NULL,
      recipientName VARCHAR(255),
      recipientType VARCHAR(20) DEFAULT 'client',
      messageType VARCHAR(20) DEFAULT 'template',
      templateName VARCHAR(100),
      templateParams TEXT,
      messageBody TEXT,
      status VARCHAR(20) DEFAULT 'queued',
      errorMessage TEXT,
      waMessageId VARCHAR(100),
      caseId VARCHAR(36),
      sentBy VARCHAR(36),
      sentByName VARCHAR(255),
      createdAt VARCHAR(50),
      deliveredAt VARCHAR(50),
      readAt VARCHAR(50)
    )
  `);

  const whatsappIndexStatements = [
    'CREATE INDEX idx_whatsapp_logs_phone ON whatsapp_logs(recipientPhone)',
    'CREATE INDEX idx_whatsapp_logs_status ON whatsapp_logs(status)',
    'CREATE INDEX idx_whatsapp_logs_created ON whatsapp_logs(createdAt)',
  ];
  for (const sql of whatsappIndexStatements) {
    try { await pool.query(sql); } catch (e) { if (e.code !== 'ER_DUP_KEYNAME') {} }
  }

  // Assign Advocate IDs to existing staff users who don't have one
  try {
    const usersWithoutId = await pool.query("SELECT id FROM users WHERE advocateId IS NULL AND role != 'client' ORDER BY createdAt ASC");
    const rows = usersWithoutId[0] || [];
    for (let i = 0; i < rows.length; i++) {
      const advId = 'ADV' + String(i + 1).padStart(3, '0');
      await pool.query('UPDATE users SET advocateId = ? WHERE id = ?', [advId, rows[i].id]);
    }
  } catch (e) { /* ignore */ }

  // Seed default task templates
  const { v4: uuidv4 } = require('uuid');
  const existingTemplates = await pool.query('SELECT COUNT(*) as c FROM task_templates');
  if (existingTemplates[0][0].c === 0) {
    const defaultTemplates = [
      {
        name: 'Hearing Preparation',
        description: 'Standard checklist for preparing for an upcoming court hearing',
        category: 'Hearing Preparation',
        items: [
          { title: 'Review previous hearing proceedings', taskCategory: 'Hearing Preparation', priority: 'high', estimatedDays: 2 },
          { title: 'Review court orders and directions', taskCategory: 'Hearing Preparation', priority: 'high', estimatedDays: 1 },
          { title: 'Review case documents and evidence', taskCategory: 'Document Work', priority: 'medium', estimatedDays: 2 },
          { title: 'Contact client before hearing', taskCategory: 'Client-Related', priority: 'medium', estimatedDays: 1 },
          { title: 'Prepare arguments', taskCategory: 'Case Preparation', priority: 'high', estimatedDays: 3 },
          { title: 'Prepare questions for examination', taskCategory: 'Case Preparation', priority: 'high', estimatedDays: 2 },
          { title: 'Prepare hearing notes', taskCategory: 'Case Preparation', priority: 'medium', estimatedDays: 1 },
          { title: 'Coordinate with Senior Advocate', taskCategory: 'Hearing Preparation', priority: 'medium', estimatedDays: 1 },
        ],
      },
      {
        name: 'Legal Research',
        description: 'Comprehensive legal research workflow for case preparation',
        category: 'Legal Research',
        items: [
          { title: 'Research relevant case laws', taskCategory: 'Legal Research', priority: 'high', estimatedDays: 3 },
          { title: 'Find similar judgments', taskCategory: 'Legal Research', priority: 'high', estimatedDays: 2 },
          { title: 'Research relevant Acts and Sections', taskCategory: 'Legal Research', priority: 'high', estimatedDays: 2 },
          { title: 'Research legal provisions and amendments', taskCategory: 'Legal Research', priority: 'medium', estimatedDays: 2 },
          { title: 'Research opposing party arguments', taskCategory: 'Legal Research', priority: 'medium', estimatedDays: 1 },
          { title: 'Verify legal citations', taskCategory: 'Legal Research', priority: 'high', estimatedDays: 1 },
          { title: 'Prepare research notes and memo', taskCategory: 'Legal Research', priority: 'medium', estimatedDays: 1 },
        ],
      },
      {
        name: 'Document Work',
        description: 'Standard document preparation and filing workflow',
        category: 'Document Work',
        items: [
          { title: 'Collect and verify documents from client', taskCategory: 'Client-Related', priority: 'high', estimatedDays: 3 },
          { title: 'Scan and organize case documents', taskCategory: 'Document Work', priority: 'medium', estimatedDays: 1 },
          { title: 'Prepare petition / application', taskCategory: 'Document Work', priority: 'high', estimatedDays: 3 },
          { title: 'Prepare affidavit', taskCategory: 'Document Work', priority: 'medium', estimatedDays: 2 },
          { title: 'Review and finalize documents', taskCategory: 'Document Work', priority: 'high', estimatedDays: 1 },
          { title: 'Upload documents to system', taskCategory: 'Document Work', priority: 'low', estimatedDays: 1 },
        ],
      },
      {
        name: 'Case Onboarding',
        description: 'New case setup and initial preparation checklist',
        category: 'Administrative',
        items: [
          { title: 'Verify case information and details', taskCategory: 'Administrative', priority: 'high', estimatedDays: 1 },
          { title: 'Collect all documents from client', taskCategory: 'Client-Related', priority: 'high', estimatedDays: 3 },
          { title: 'Review case file and understand facts', taskCategory: 'Case Preparation', priority: 'high', estimatedDays: 2 },
          { title: 'Research applicable laws and provisions', taskCategory: 'Legal Research', priority: 'medium', estimatedDays: 3 },
          { title: 'Prepare case summary', taskCategory: 'Case Preparation', priority: 'medium', estimatedDays: 1 },
          { title: 'Organize case records in system', taskCategory: 'Administrative', priority: 'low', estimatedDays: 1 },
        ],
      },
    ];

    for (const tpl of defaultTemplates) {
      const tplId = uuidv4();
      await pool.query(
        'INSERT INTO task_templates (id, name, description, category, createdBy, isSystem, createdAt) VALUES (?, ?, ?, ?, ?, 1, NOW())',
        [tplId, tpl.name, tpl.description, tpl.category, 'system']
      );
      for (let i = 0; i < tpl.items.length; i++) {
        const item = tpl.items[i];
        await pool.query(
          'INSERT INTO task_template_items (id, templateId, title, taskCategory, priority, estimatedDays, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), tplId, item.title, item.taskCategory, item.priority, item.estimatedDays, i]
        );
      }
    }
    logger.info('Default task templates seeded');
  }

  logger.info('MySQL tables ready');
}

function getDb() {
  if (!pool) throw new Error('Database not initialized. Call initDB() first.');
  return {
    execute: async (sql, params) => pool.query(sql, params),
  };
}

function saveDb() {
  // No-op for MySQL — data is already persisted
}

async function queryAll(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = { initDB, getDb, saveDb, queryAll, queryOne };
