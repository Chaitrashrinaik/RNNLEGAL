const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { initDB, getDb, queryAll, queryOne, saveDb } = require('./config/db');
require('dotenv').config();

const futureDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const pastDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const seedData = async () => {
  try {
    await initDB();
    console.log('Database initialized');

    const db = getDb();

    await db.execute('DELETE FROM notifications');
    await db.execute('DELETE FROM invoices');
    await db.execute('DELETE FROM documents');
    await db.execute('DELETE FROM case_advocates');
    await db.execute('DELETE FROM cases');
    await db.execute('DELETE FROM clients');
    await db.execute('DELETE FROM users');
    console.log('Cleared existing data');

    const now = new Date().toISOString();

    // === USERS ===
    const users = [];
    const userData = [
      { name: 'Advocate Rajesh Kumar', email: 'rajesh@lawfirm.com', password: 'admin123', role: 'admin', phone: '+91 98765 43210', firmName: 'Kumar & Associates' },
      { name: 'Priya Sharma', email: 'priya@lawfirm.com', password: 'manager123', role: 'manager', phone: '+91 98765 43211', firmName: 'Kumar & Associates' },
      { name: 'Advocate Amit Verma', email: 'amit@lawfirm.com', password: 'advocate123', role: 'advocate', phone: '+91 98765 43212', firmName: 'Kumar & Associates' },
      { name: 'Sneha Patel', email: 'sneha@lawfirm.com', password: 'advocate123', role: 'advocate', phone: '+91 98765 43213', firmName: 'Kumar & Associates' },
      { name: 'Rahul Mehta', email: 'rahul@lawfirm.com', password: 'staff123', role: 'staff', phone: '+91 98765 43214', firmName: 'Kumar & Associates' },
      { name: 'Vikram Singhania', email: 'vikram@techcorp.in', password: 'client123', role: 'client', phone: '+91 99887 76655', firmName: '' },
      { name: 'Deepak Malhotra', email: 'deepak@malhotraexports.in', password: 'client123', role: 'client', phone: '+91 33221 10099', firmName: '' },
    ];

    for (const u of userData) {
      const id = crypto.randomUUID();
      const hash = await bcrypt.hash(u.password, 12);
      await db.execute(
        'INSERT INTO users (id,name,email,password,role,phone,firmName,isActive,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [id, u.name, u.email.toLowerCase(), hash, u.role, u.phone, u.firmName, 1, now, now]
      );
      users.push({ id, ...u });
    }
    console.log(`Created ${users.length} users`);

    // === CLIENTS ===
    const clients = [];
    const clientData = [
      { name: 'Vikram Singhania', email: 'vikram@techcorp.in', phone: '+91 99887 76655', address: { street: '42 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', country: 'India' }, company: 'TechCorp India Pvt Ltd', panNumber: 'AAACT1234A', notes: 'Major corporate client. handles all their IP matters.', portalEnabled: 1, portalPassword: 'client123', createdBy: users[0].id },
      { name: 'Ananya Reddy', email: 'ananya.reddy@gmail.com', phone: '+91 88776 65544', address: { street: '15 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500033', country: 'India' }, company: '', panNumber: 'ABCPA5678B', notes: 'Family law client. Very cooperative.', portalEnabled: 1, portalPassword: 'client123', createdBy: users[0].id },
      { name: 'Pradeep Joshi', email: 'pradeep.joshi@realestate.co', phone: '+91 77665 54433', address: { street: '88 Baner Road', city: 'Pune', state: 'Maharashtra', pincode: '411045', country: 'India' }, company: 'Joshi Real Estate Developers', panNumber: 'AADPJ9012C', notes: 'Real estate developer. Multiple ongoing property disputes.', portalEnabled: 0, portalPassword: null, createdBy: users[0].id },
      { name: 'Meera Nair', email: 'meera@startupx.in', phone: '+91 66554 43322', address: { street: '22 Koramangala', city: 'Bangalore', state: 'Karnataka', pincode: '560034', country: 'India' }, company: 'StartupX Innovations', panNumber: 'AABCM3456D', notes: 'Tech startup founder. Needs help with employee disputes.', portalEnabled: 0, portalPassword: null, createdBy: users[0].id },
      { name: 'Sunil Agarwal', email: 'sunil@agarwaltrading.com', phone: '+91 55443 32211', address: { street: '56 Nehru Place', city: 'New Delhi', state: 'Delhi', pincode: '110019', country: 'India' }, company: 'Agarwal Trading Co', panNumber: 'AABSA7890E', notes: 'Long-standing client. Consumer court matters.', portalEnabled: 0, portalPassword: null, createdBy: users[0].id },
      { name: 'Kavitha Lakshmi', email: 'kavitha.l@outlook.com', phone: '+91 44332 21100', address: { street: '33 T Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017', country: 'India' }, company: '', panNumber: 'AABCK1234F', notes: 'Labor dispute case. Works in manufacturing sector.', portalEnabled: 0, portalPassword: null, createdBy: users[1].id },
      { name: 'Deepak Malhotra', email: 'deepak@malhotraexports.in', phone: '+91 33221 10099', address: { street: '7 Salt Lake', city: 'Kolkata', state: 'West Bengal', pincode: '700091', country: 'India' }, company: 'Malhotra Exports International', panNumber: 'AABDM5678G', notes: 'International trade dispute. Complex NCLT matter.', portalEnabled: 1, portalPassword: 'client123', createdBy: users[0].id },
      { name: 'Fathima Khan', email: 'fathima.k@hospital.org', phone: '+91 22110 09988', address: { street: '9 MG Road', city: 'Bangalore', state: 'Karnataka', pincode: '560001', country: 'India' }, company: 'City Hospital Trust', panNumber: 'AABCF9012H', notes: 'Medical negligence case. Sensitive matter.', portalEnabled: 0, portalPassword: null, createdBy: users[1].id },
      { name: 'Raman Iyer', email: 'raman@iyerlaw.in', phone: '+91 11009 98877', address: { street: '41 Anna Salai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002', country: 'India' }, company: 'Iyer & Sons Textiles', panNumber: 'AABRI3456I', notes: 'NCLT insolvency matter. Corporate restructuring.', portalEnabled: 0, portalPassword: null, createdBy: users[2].id },
      { name: 'Shruti Gupta', email: 'shruti@designstudio.co', phone: '+91 99887 00112', address: { street: '20 Hauz Khas Village', city: 'New Delhi', state: 'Delhi', pincode: '110016', country: 'India' }, company: 'Shruti Design Studio', panNumber: 'AABSG7890J', notes: 'Intellectual property and copyright matter.', portalEnabled: 0, portalPassword: null, createdBy: users[3].id },
    ];

    for (const c of clientData) {
      const id = crypto.randomUUID();
      await db.execute(
        'INSERT INTO clients (id,name,email,phone,address,company,panNumber,notes,portalEnabled,portalPassword,createdBy,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [id, c.name, c.email.toLowerCase(), c.phone, JSON.stringify(c.address), c.company, c.panNumber, c.notes, c.portalEnabled, c.portalPassword, c.createdBy, now, now]
      );
      clients.push({ id, ...c });
    }
    console.log(`Created ${clients.length} clients`);

    // === CASES ===
    const cases = [];
    const caseData = [
      { caseNumber: 'DC/CVL/2024/1001', caseTitle: 'Vikram Singhania vs. GlobalTech Solutions - Breach of Contract', caseType: 'civil', court: 'district', courtName: 'Bombay City Civil Court', judgeName: "Hon'ble Justice Suresh Patil", clientId: clients[0].id, advocates: [users[0].id, users[2].id], filingDate: pastDate(120), nextHearingDate: futureDate(5), lastHearingDate: pastDate(15), status: 'in-progress', priority: 'high', description: 'Breach of software development contract worth Rs. 5 Crores. Defendant failed to deliver the agreed upon ERP system within the stipulated timeline causing massive losses to our client.', oppositeParty: 'GlobalTech Solutions Pvt Ltd', oppositePartyLawyer: 'Advocate Sanjay Bhatt', orders: [{ date: pastDate(60), description: 'Court directed both parties to file written submissions within 30 days.' }, { date: pastDate(20), description: 'Interim application dismissed. Main suit to proceed.' }], hearingHistory: [{ date: pastDate(90), notes: 'Framing of issues. Both parties presented their arguments.', outcome: 'Issues framed. Next date for evidence.' }, { date: pastDate(45), notes: 'Cross-examination of plaintiff witness PW-1.', outcome: 'Cross-examination completed.' }, { date: pastDate(15), notes: 'Arguments on admissibility of document Exhibit P-7.', outcome: 'Document admitted.' }], tags: ['contract', 'breach', 'technology', 'high-value'], createdBy: users[0].id },
      { caseNumber: 'HC/FAM/2024/2001', caseTitle: 'Ananya Reddy vs. Kiran Reddy - Divorce Petition', caseType: 'family', court: 'high', courtName: 'Telangana High Court', judgeName: "Hon'ble Justice Lakshmi Devi", clientId: clients[1].id, advocates: [users[3].id], filingDate: pastDate(180), nextHearingDate: futureDate(12), lastHearingDate: pastDate(30), status: 'active', priority: 'high', description: 'Divorce petition on grounds of cruelty and desertion. custody of two minor children is a key issue. Maintenance claim of Rs. 1,00,000 per month.', oppositeParty: 'Kiran Reddy', oppositePartyLawyer: 'Advocate Meena Kumari', orders: [{ date: pastDate(150), description: 'Interim maintenance of Rs. 50,000 per month granted to petitioner.' }, { date: pastDate(90), description: 'Mediation ordered. Parties to attend counseling.' }], hearingHistory: [{ date: pastDate(150), notes: 'First hearing. Interim relief arguments.', outcome: 'Interim maintenance granted.' }, { date: pastDate(90), notes: 'Mediation attempt.', outcome: 'Mediation failed. Parties unable to reach agreement.' }, { date: pastDate(30), notes: 'Evidence stage. Petitioner examined.', outcome: 'Petitioner examination complete.' }], tags: ['divorce', 'custody', 'maintenance', 'family'], createdBy: users[3].id },
      { caseNumber: 'DC/CRP/2024/3001', caseTitle: 'Joshi Real Estate vs. Municipal Corporation - Land Use Dispute', caseType: 'corporate', court: 'district', courtName: 'Pune District Court', judgeName: 'Hon\'ble Judge Anil Deshmukh', clientId: clients[2].id, advocates: [users[0].id], filingDate: pastDate(60), nextHearingDate: futureDate(20), lastHearingDate: pastDate(10), status: 'in-progress', priority: 'medium', description: 'Challenge to rejection of building permission for commercial complex. Municipal corporation denied NOC citing environmental concerns.', oppositeParty: 'Pune Municipal Corporation', oppositePartyLawyer: 'Government Pleader Shri Kulkarni', orders: [{ date: pastDate(10), description: 'Status quo maintained on construction activity.' }], hearingHistory: [{ date: pastDate(30), notes: 'Preliminary objections raised by respondent.', outcome: 'Objections noted. Main matter to be heard.' }, { date: pastDate(10), notes: 'Arguments on interim relief.', outcome: 'Status quo ordered.' }], tags: ['property', 'municipal', 'building-permission', 'real-estate'], createdBy: users[0].id },
      { caseNumber: 'HC/CRM/2024/4001', caseTitle: 'State vs. Unknown - FIR for Cyber Fraud', caseType: 'criminal', court: 'high', courtName: 'Karnataka High Court', judgeName: "Hon'ble Justice Raghavendra Singh", clientId: clients[3].id, advocates: [users[2].id], filingDate: pastDate(45), nextHearingDate: futureDate(8), lastHearingDate: pastDate(20), status: 'active', priority: 'urgent', description: 'Anticipatory bail application after FIR registered for alleged cyber fraud and data theft of Rs. 2 Crores. StartupX accused of stealing proprietary AI algorithms.', oppositeParty: 'State of Karnataka', oppositePartyLawyer: 'Public Prosecutor', orders: [], hearingHistory: [{ date: pastDate(30), notes: 'Arguments on anticipatory bail application.', outcome: 'Hearing reserved.' }, { date: pastDate(20), notes: 'Bail application arguments continued.', outcome: 'Interim protection granted till next date.' }], tags: ['criminal', 'cyber-fraud', 'anticipatory-bail', 'urgent'], createdBy: users[2].id },
      { caseNumber: 'CCD/CON/2024/5001', caseTitle: 'Agarwal Trading vs. defective Goods - Consumer Complaint', caseType: 'consumer', court: 'consumer', courtName: 'New Delhi District Consumer Disputes Redressal Commission', judgeName: 'Smt. Pooja Arora', clientId: clients[4].id, advocates: [users[0].id], filingDate: pastDate(90), nextHearingDate: futureDate(30), lastHearingDate: pastDate(45), status: 'in-progress', priority: 'medium', description: 'Consumer complaint for delivery of defective industrial machinery worth Rs. 35 lakhs. Seller refused replacement or refund despite multiple complaints.', oppositeParty: 'MachineryWorld India Pvt Ltd', oppositePartyLawyer: 'Advocate K.R. Singh', orders: [{ date: pastDate(45), description: 'Notice issued to opposite party. Reply to be filed within 30 days.' }], hearingHistory: [{ date: pastDate(45), notes: 'First hearing. Complainant presented facts.', outcome: 'Notice issued.' }], tags: ['consumer', 'defective-goods', 'refund', 'machinery'], createdBy: users[0].id },
      { caseNumber: 'DC/LAB/2024/6001', caseTitle: 'Kavitha Lakshmi vs. Precision Manufacturing - Wrongful Termination', caseType: 'labor', court: 'district', courtName: 'Chennai Labour Court', judgeName: 'Shri Venkatesh R', clientId: clients[5].id, advocates: [users[3].id], filingDate: pastDate(200), nextHearingDate: futureDate(15), lastHearingDate: pastDate(25), status: 'active', priority: 'medium', description: 'Wrongful termination claim after 15 years of service. Client was terminated without notice or retrenchment compensation. Reinstatement and back wages claimed.', oppositeParty: 'Precision Manufacturing Ltd', oppositePartyLawyer: 'Advocate S. Rajan', orders: [{ date: pastDate(100), description: 'Reference made to Labour Court for adjudication.' }], hearingHistory: [{ date: pastDate(100), notes: 'Reference admitted. Parties directed to file documents.', outcome: 'Reference admitted.' }, { date: pastDate(25), notes: 'Pre-hearing conference.', outcome: 'Direction to file written submissions.' }], tags: ['labor', 'wrongful-termination', 'reinstatement', 'back-wages'], createdBy: users[3].id },
      { caseNumber: 'NCLT/CRP/2024/7001', caseTitle: 'Malhotra Exports - NCLT Insolvency Proceedings', caseType: 'corporate', court: 'nclt', courtName: 'NCLT Kolkata Bench', judgeName: "Hon'ble Mr. Justice (Retd.) Arun Mishra", clientId: clients[6].id, advocates: [users[0].id, users[2].id], filingDate: pastDate(150), nextHearingDate: futureDate(3), lastHearingDate: pastDate(7), status: 'in-progress', priority: 'urgent', description: 'Corporate Insolvency Resolution Process (CIRP) initiated by operational creditor for unpaid dues of Rs. 1.8 Crores. CoC meeting scheduled.', oppositeParty: 'ABC Chemicals Ltd (Operational Creditor)', oppositePartyLawyer: 'Advocate P.K. Banerjee', orders: [{ date: pastDate(140), description: 'Moratorium declared under Section 14 of IBC.' }, { date: pastDate(130), description: 'Interim Resolution Professional appointed.' }, { date: pastDate(60), description: 'Committee of Creditors constituted.' }, { date: pastDate(15), description: 'Resolution plan submission deadline extended by 30 days.' }], hearingHistory: [{ date: pastDate(140), notes: 'Section 7 application admitted.', outcome: 'CIRP initiated. Moratorium imposed.' }, { date: pastDate(90), notes: 'First CoC meeting.', outcome: 'IRP confirmed as RP.' }, { date: pastDate(60), notes: 'Second CoC meeting.', outcome: 'CoC constituted.' }, { date: pastDate(7), notes: 'Hearing on extension of resolution plan deadline.', outcome: 'Extension granted.' }], tags: ['insolvency', 'IBC', 'NCLT', 'corporate', 'urgent'], createdBy: users[0].id },
      { caseNumber: 'RERA/CRP/2024/8001', caseTitle: 'City Hospital Trust vs. Builder - RERA Complaint', caseType: 'consumer', court: 'rera', courtName: 'Karnataka RERA', judgeName: 'Chairperson Shri Anupama Shenoy', clientId: clients[7].id, advocates: [users[2].id], filingDate: pastDate(75), nextHearingDate: futureDate(25), lastHearingDate: pastDate(15), status: 'active', priority: 'high', description: 'RERA complaint for delay in possession of commercial property. Builder has delayed handover by 18 months. Compensation and interest claimed under RERA Act.', oppositeParty: 'Prestige Constructions', oppositePartyLawyer: 'Advocate Gururaj Upadhya', orders: [{ date: pastDate(15), description: 'Builder directed to file written statement within 15 days.' }], hearingHistory: [{ date: pastDate(40), notes: 'First hearing. Complaint admitted.', outcome: 'Notice issued to respondent.' }, { date: pastDate(15), notes: 'Response filed by builder.', outcome: 'Written statement taken on record.' }], tags: ['RERA', 'real-estate', 'delay', 'possession', 'compensation'], createdBy: users[2].id },
      { caseNumber: 'HC/CRP/2024/9001', caseTitle: 'Iyer & Sons Textiles - NCLT Corporate Restructuring', caseType: 'corporate', court: 'nclt', courtName: 'NCLT Chennai Bench', judgeName: "Hon'ble Mrs. Justice Pushpa Ganapathy", clientId: clients[8].id, advocates: [users[0].id], filingDate: pastDate(100), nextHearingDate: futureDate(18), lastHearingDate: pastDate(35), status: 'active', priority: 'high', description: 'Scheme of arrangement under Companies Act for amalgamation of two group companies. Application filed under Sections 230-232.', oppositeParty: 'N/A', oppositePartyLawyer: 'N/A', orders: [{ date: pastDate(70), description: 'Notice issued. OPs directed to file objections if any.' }, { date: pastDate(35), description: 'No objections received from statutory authorities.' }], hearingHistory: [{ date: pastDate(70), notes: 'Scheme petition presented.', outcome: 'Notice issued.' }, { date: pastDate(35), notes: 'Consideration of objections.', outcome: 'No objections from authorities.' }], tags: ['corporate', 'amalgamation', 'NCLT', 'restructuring'], createdBy: users[0].id },
      { caseNumber: 'DC/CVL/2024/10001', caseTitle: 'Shruti Design Studio vs. FastFashion Inc - Copyright Infringement', caseType: 'civil', court: 'district', courtName: 'Delhi District Court, Saket', judgeName: "Hon'ble Judge R.K. Kapoor", clientId: clients[9].id, advocates: [users[3].id], filingDate: pastDate(30), nextHearingDate: futureDate(40), lastHearingDate: null, status: 'pending', priority: 'medium', description: 'Copyright infringement suit for unauthorized reproduction of original textile designs. Damages of Rs. 50 lakhs claimed along with permanent injunction.', oppositeParty: 'FastFashion India Pvt Ltd', oppositePartyLawyer: 'Advocate Neha Saxena', orders: [], hearingHistory: [], tags: ['copyright', 'intellectual-property', 'design', 'injunction'], createdBy: users[3].id },
      { caseNumber: 'HC/FAM/2024/11001', caseTitle: 'Deepak Malhotra vs. Sunita Malhotra - Child Custody', caseType: 'family', court: 'high', courtName: 'Delhi High Court', judgeName: "Hon'ble Justice Asha Menon", clientId: clients[6].id, advocates: [users[3].id], filingDate: pastDate(60), nextHearingDate: futureDate(10), lastHearingDate: pastDate(20), status: 'active', priority: 'high', description: 'Child custody dispute following divorce. Father seeking joint custody of two children aged 8 and 12. Welfare of children is paramount consideration.', oppositeParty: 'Sunita Malhotra', oppositePartyLawyer: 'Advocate Kavita Oberoi', orders: [{ date: pastDate(40), description: 'Interim visitation rights granted to father on alternate weekends.' }], hearingHistory: [{ date: pastDate(40), notes: 'First hearing. Interim custody arguments.', outcome: 'Interim visitation granted.' }, { date: pastDate(20), notes: 'Counselor report submitted.', outcome: 'Report taken on record.' }], tags: ['custody', 'family', 'children', 'welfare'], createdBy: users[3].id },
      { caseNumber: 'DC/CVL/2024/12001', caseTitle: 'TechCorp vs. Ex-Employee - Non-Compete Violation', caseType: 'corporate', court: 'district', courtName: 'Mumbai City Civil Court', judgeName: "Hon'ble Judge Meera Sharma", clientId: clients[0].id, advocates: [users[2].id], filingDate: pastDate(20), nextHearingDate: futureDate(45), lastHearingDate: null, status: 'pending', priority: 'low', description: 'Suit for enforcement of non-compete and non-solicitation clauses against former CTO who joined a competitor company.', oppositeParty: 'Arun Krishnamurthy', oppositePartyLawyer: 'Advocate Rajiv Khanna', orders: [], hearingHistory: [], tags: ['non-compete', 'employment', 'trade-secret', 'corporate'], createdBy: users[2].id },
      { caseNumber: 'DRT/CRP/2024/13001', caseTitle: 'Bank of Maharashtra vs. Malhotra Group - DRT Recovery', caseType: 'civil', court: 'drt', courtName: 'Debt Recovery Tribunal, Mumbai', judgeName: 'Shri Harish Bhandari', clientId: clients[6].id, advocates: [users[0].id], filingDate: pastDate(90), nextHearingDate: futureDate(22), lastHearingDate: pastDate(30), status: 'active', priority: 'high', description: 'Recovery suit filed by bank for Rs. 12 Crores against corporate guarantee given by Malhotra Group for loan defaults by subsidiary company.', oppositeParty: 'Bank of Maharashtra', oppositePartyLawyer: 'Advocate S.R. Kulkarni (Standing Counsel)', orders: [{ date: pastDate(60), description: 'Interim attachment of properties ordered.' }, { date: pastDate(30), description: 'Valuation report of attached properties submitted.' }], hearingHistory: [{ date: pastDate(60), notes: 'Recovery application admitted.', outcome: 'Interim attachment ordered.' }, { date: pastDate(30), notes: 'Valuation report consideration.', outcome: 'Report taken on record.' }], tags: ['recovery', 'banking', 'DRT', 'guarantee', 'high-value'], createdBy: users[0].id },
      { caseNumber: 'CCD/CON/2024/14001', caseTitle: 'Agarwal Trading vs. Service Provider - Deficiency in Service', caseType: 'consumer', court: 'consumer', courtName: 'State Consumer Disputes Redressal Commission, Delhi', judgeName: 'Smt. Ritu Gupta', clientId: clients[4].id, advocates: [users[2].id], filingDate: pastDate(50), nextHearingDate: futureDate(35), lastHearingDate: pastDate(15), status: 'active', priority: 'low', description: 'Complaint for deficiency in IT services. Software vendor failed to deliver working product despite full payment of Rs. 18 lakhs.', oppositeParty: 'CloudSoft Solutions Pvt Ltd', oppositePartyLawyer: 'Advocate V.K. Goyal', orders: [{ date: pastDate(15), description: 'Both parties directed to explore mediation.' }], hearingHistory: [{ date: pastDate(30), notes: 'First hearing. Complaint admitted.', outcome: 'Notice issued.' }, { date: pastDate(15), notes: 'Mediation direction.', outcome: 'Mediation ordered.' }], tags: ['consumer', 'deficiency', 'IT-services', 'software'], createdBy: users[2].id },
      { caseNumber: 'HC/CRM/2024/15001', caseTitle: 'State vs. Unknown Persons - Cheque Bounce (Section 138 NI Act)', caseType: 'criminal', court: 'high', courtName: 'Bombay High Court', judgeName: "Hon'ble Justice Prakash Nayak", clientId: clients[4].id, advocates: [users[0].id], filingDate: pastDate(40), nextHearingDate: futureDate(6), lastHearingDate: pastDate(10), status: 'in-progress', priority: 'high', description: 'Criminal complaint under Section 138 of Negotiable Instruments Act for dishonor of cheques worth Rs. 45 lakhs issued by supplier for goods delivered.', oppositeParty: 'Sunil Enterprises', oppositePartyLawyer: 'Advocate Deepak Tiwari', orders: [{ date: pastDate(10), description: 'Accused directed to deposit 20% of cheque amount.' }], hearingHistory: [{ date: pastDate(30), notes: 'Complaint admitted. Process issued.', outcome: 'Summons issued.' }, { date: pastDate(10), notes: 'Arguments on interim deposit.', outcome: '20% deposit directed.' }], tags: ['cheque-bounce', 'NI-act', 'criminal', 'negotiable-instruments'], createdBy: users[0].id },
    ];

    for (const c of caseData) {
      const id = crypto.randomUUID();
      await db.execute(
        `INSERT INTO cases (id,caseNumber,caseTitle,caseType,court,courtName,judgeName,clientId,filingDate,nextHearingDate,lastHearingDate,status,priority,description,oppositeParty,oppositePartyLawyer,orders,hearingHistory,tags,reminders,createdBy,createdAt,updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, c.caseNumber, c.caseTitle, c.caseType, c.court, c.courtName, c.judgeName, c.clientId,
          c.filingDate, c.nextHearingDate, c.lastHearingDate, c.status, c.priority, c.description,
          c.oppositeParty, c.oppositePartyLawyer,
          JSON.stringify(c.orders), JSON.stringify(c.hearingHistory), JSON.stringify(c.tags), '[]',
          c.createdBy, now, now]
      );
      cases.push({ id, ...c });
    }
    console.log(`Created ${cases.length} cases`);

    // Insert case_advocates
    for (const c of cases) {
      for (const userId of (c.advocates || [])) {
        await db.execute('INSERT INTO case_advocates (caseId, userId) VALUES (?, ?)', [c.id, userId]);
      }
    }
    console.log('Assigned advocates to cases');

    // === DOCUMENTS ===
    const documentData = [
      { title: 'Petition for Breach of Contract', fileName: 'doc001.pdf', originalName: 'Petition-Breach-Contract.pdf', filePath: 'uploads/documents/doc001.pdf', fileSize: 245000, mimeType: 'application/pdf', caseId: cases[0].id, uploadedBy: users[0].id, category: 'petition', tags: ['contract', 'petition'] },
      { title: 'Contract Agreement - TechCorp vs GlobalTech', fileName: 'doc002.pdf', originalName: 'Contract-Agreement.pdf', filePath: 'uploads/documents/doc002.pdf', fileSize: 1200000, mimeType: 'application/pdf', caseId: cases[0].id, uploadedBy: users[2].id, category: 'evidence', tags: ['contract', 'evidence'] },
      { title: 'Exhibit P-1: Email Communications', fileName: 'doc003.pdf', originalName: 'Email-Communications.pdf', filePath: 'uploads/documents/doc003.pdf', fileSize: 890000, mimeType: 'application/pdf', caseId: cases[0].id, uploadedBy: users[2].id, category: 'evidence', tags: ['email', 'evidence'] },
      { title: 'Divorce Petition - Ananya Reddy', fileName: 'doc004.pdf', originalName: 'Divorce-Petition.pdf', filePath: 'uploads/documents/doc004.pdf', fileSize: 340000, mimeType: 'application/pdf', caseId: cases[1].id, uploadedBy: users[3].id, category: 'petition', tags: ['divorce', 'family'] },
      { title: 'Marriage Certificate', fileName: 'doc005.pdf', originalName: 'Marriage-Certificate.pdf', filePath: 'uploads/documents/doc005.pdf', fileSize: 120000, mimeType: 'application/pdf', caseId: cases[1].id, uploadedBy: users[3].id, category: 'evidence', tags: ['certificate'] },
      { title: 'Maintenance Order - Rs 50,000', fileName: 'doc006.pdf', originalName: 'Maintenance-Order.pdf', filePath: 'uploads/documents/doc006.pdf', fileSize: 95000, mimeType: 'application/pdf', caseId: cases[1].id, uploadedBy: users[3].id, category: 'order', tags: ['maintenance', 'order'] },
      { title: 'Building Permission Application', fileName: 'doc007.pdf', originalName: 'Building-Permission.pdf', filePath: 'uploads/documents/doc007.pdf', fileSize: 560000, mimeType: 'application/pdf', caseId: cases[2].id, uploadedBy: users[0].id, category: 'petition', tags: ['permission', 'property'] },
      { title: 'Municipal Corporation NOC Rejection Letter', fileName: 'doc008.pdf', originalName: 'NOC-Rejection.pdf', filePath: 'uploads/documents/doc008.pdf', fileSize: 230000, mimeType: 'application/pdf', caseId: cases[2].id, uploadedBy: users[0].id, category: 'correspondence', tags: ['NOC', 'rejection'] },
      { title: 'FIR Copy - Cyber Fraud Case', fileName: 'doc009.pdf', originalName: 'FIR-Copy.pdf', filePath: 'uploads/documents/doc009.pdf', fileSize: 180000, mimeType: 'application/pdf', caseId: cases[3].id, uploadedBy: users[2].id, category: 'evidence', tags: ['FIR', 'criminal'] },
      { title: 'Anticipatory Bail Application', fileName: 'doc010.pdf', originalName: 'AB-Application.pdf', filePath: 'uploads/documents/doc010.pdf', fileSize: 420000, mimeType: 'application/pdf', caseId: cases[3].id, uploadedBy: users[2].id, category: 'petition', tags: ['bail', 'criminal'] },
      { title: 'Consumer Complaint - Defective Machinery', fileName: 'doc011.pdf', originalName: 'Consumer-Complaint.pdf', filePath: 'uploads/documents/doc011.pdf', fileSize: 290000, mimeType: 'application/pdf', caseId: cases[4].id, uploadedBy: users[0].id, category: 'petition', tags: ['consumer', 'complaint'] },
      { title: 'Purchase Invoice & Warranty Card', fileName: 'doc012.pdf', originalName: 'Purchase-Invoice.pdf', filePath: 'uploads/documents/doc012.pdf', fileSize: 670000, mimeType: 'application/pdf', caseId: cases[4].id, uploadedBy: users[0].id, category: 'evidence', tags: ['invoice', 'evidence'] },
      { title: 'Termination Letter', fileName: 'doc013.pdf', originalName: 'Termination-Letter.pdf', filePath: 'uploads/documents/doc013.pdf', fileSize: 150000, mimeType: 'application/pdf', caseId: cases[5].id, uploadedBy: users[3].id, category: 'evidence', tags: ['termination', 'employment'] },
      { title: 'Employment Records - 15 Years Service', fileName: 'doc014.pdf', originalName: 'Service-Records.pdf', filePath: 'uploads/documents/doc014.pdf', fileSize: 2100000, mimeType: 'application/pdf', caseId: cases[5].id, uploadedBy: users[3].id, category: 'evidence', tags: ['service', 'records'] },
      { title: 'NCLT Order - Moratorium', fileName: 'doc015.pdf', originalName: 'NCLT-Moratorium-Order.pdf', filePath: 'uploads/documents/doc015.pdf', fileSize: 310000, mimeType: 'application/pdf', caseId: cases[6].id, uploadedBy: users[0].id, category: 'order', tags: ['NCLT', 'moratorium'] },
      { title: 'Resolution Plan Draft', fileName: 'doc016.pdf', originalName: 'Resolution-Plan.pdf', filePath: 'uploads/documents/doc016.pdf', fileSize: 1500000, mimeType: 'application/pdf', caseId: cases[6].id, uploadedBy: users[2].id, category: 'petition', tags: ['resolution', 'IBC'] },
      { title: 'RERA Complaint Application', fileName: 'doc017.pdf', originalName: 'RERA-Complaint.pdf', filePath: 'uploads/documents/doc017.pdf', fileSize: 280000, mimeType: 'application/pdf', caseId: cases[7].id, uploadedBy: users[2].id, category: 'petition', tags: ['RERA', 'complaint'] },
      { title: 'Agreement for Sale - Property', fileName: 'doc018.pdf', originalName: 'Agreement-Sale.pdf', filePath: 'uploads/documents/doc018.pdf', fileSize: 780000, mimeType: 'application/pdf', caseId: cases[7].id, uploadedBy: users[2].id, category: 'evidence', tags: ['agreement', 'property'] },
      { title: 'Scheme of Arrangement - Draft', fileName: 'doc019.pdf', originalName: 'Scheme-Arrangement.pdf', filePath: 'uploads/documents/doc019.pdf', fileSize: 920000, mimeType: 'application/pdf', caseId: cases[8].id, uploadedBy: users[0].id, category: 'petition', tags: ['scheme', 'amalgamation'] },
      { title: 'Copyright Registration Certificate', fileName: 'doc020.pdf', originalName: 'Copyright-Registration.pdf', filePath: 'uploads/documents/doc020.pdf', fileSize: 160000, mimeType: 'application/pdf', caseId: cases[9].id, uploadedBy: users[3].id, category: 'evidence', tags: ['copyright', 'registration'] },
      { title: 'Original Design Portfolio', fileName: 'doc021.pdf', originalName: 'Design-Portfolio.pdf', filePath: 'uploads/documents/doc021.pdf', fileSize: 3500000, mimeType: 'application/pdf', caseId: cases[9].id, uploadedBy: users[3].id, category: 'evidence', tags: ['design', 'original'] },
      { title: 'Bank Loan Agreement', fileName: 'doc022.pdf', originalName: 'Loan-Agreement.pdf', filePath: 'uploads/documents/doc022.pdf', fileSize: 450000, mimeType: 'application/pdf', caseId: cases[12].id, uploadedBy: users[0].id, category: 'evidence', tags: ['loan', 'bank'] },
      { title: 'Property Valuation Report', fileName: 'doc023.pdf', originalName: 'Valuation-Report.pdf', filePath: 'uploads/documents/doc023.pdf', fileSize: 780000, mimeType: 'application/pdf', caseId: cases[12].id, uploadedBy: users[0].id, category: 'other', tags: ['valuation', 'property'] },
      { title: 'Cheque Copies - Section 138', fileName: 'doc024.pdf', originalName: 'Cheque-Copies.pdf', filePath: 'uploads/documents/doc024.pdf', fileSize: 200000, mimeType: 'application/pdf', caseId: cases[14].id, uploadedBy: users[0].id, category: 'evidence', tags: ['cheque', 'evidence'] },
    ];

    const documents = [];
    for (const d of documentData) {
      const id = crypto.randomUUID();
      await db.execute(
        'INSERT INTO documents (id,title,fileName,originalName,filePath,fileSize,mimeType,caseId,uploadedBy,category,tags,versions,accessLevel,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [id, d.title, d.fileName, d.originalName, d.filePath, d.fileSize, d.mimeType,
          d.caseId, d.uploadedBy, d.category, JSON.stringify(d.tags),
          JSON.stringify([{ version: 1, uploadedBy: d.uploadedBy, date: now, filePath: d.filePath, originalName: d.originalName, fileSize: d.fileSize }]),
          'team', now, now]
      );
      documents.push({ id, ...d });
    }
    console.log(`Created ${documents.length} documents`);

    // === INVOICES ===
    const invoiceData = [
      { invoiceNumber: 'INV-2401-0001', clientId: clients[0].id, caseId: cases[0].id, items: [{ description: 'Legal consultation - Breach of Contract', amount: 5000, quantity: 4, total: 20000 }, { description: 'Court appearance fees', amount: 10000, quantity: 3, total: 30000 }, { description: 'Document preparation and review', amount: 3000, quantity: 2, total: 6000 }], subtotal: 56000, tax: 10080, total: 66080, status: 'paid', dueDate: pastDate(30), paidDate: pastDate(25), paidAmount: 66080, paymentMethod: 'bank-transfer', notes: 'Payment received for Q1 2024 legal services.', createdBy: users[1].id },
      { invoiceNumber: 'INV-2401-0002', clientId: clients[1].id, caseId: cases[1].id, items: [{ description: 'Divorce petition preparation', amount: 25000, quantity: 1, total: 25000 }, { description: 'Court appearances', amount: 10000, quantity: 4, total: 40000 }, { description: 'Mediation sessions', amount: 8000, quantity: 2, total: 16000 }], subtotal: 81000, tax: 14580, total: 95580, status: 'paid', dueDate: pastDate(15), paidDate: pastDate(10), paidAmount: 95580, paymentMethod: 'upi', notes: 'Full and final payment for divorce proceedings.', createdBy: users[3].id },
      { invoiceNumber: 'INV-2402-0003', clientId: clients[2].id, caseId: cases[2].id, items: [{ description: 'Writ petition drafting', amount: 30000, quantity: 1, total: 30000 }, { description: 'Municipal law consultation', amount: 5000, quantity: 6, total: 30000 }], subtotal: 60000, tax: 10800, total: 70800, status: 'sent', dueDate: futureDate(15), notes: 'Please pay before due date to avoid late fees.', createdBy: users[0].id },
      { invoiceNumber: 'INV-2402-0004', clientId: clients[3].id, caseId: cases[3].id, items: [{ description: 'Anticipatory bail application', amount: 35000, quantity: 1, total: 35000 }, { description: 'High court appearances', amount: 15000, quantity: 2, total: 30000 }], subtotal: 65000, tax: 11700, total: 76700, status: 'sent', dueDate: futureDate(20), notes: 'Criminal matter - urgent billing.', createdBy: users[2].id },
      { invoiceNumber: 'INV-2403-0005', clientId: clients[4].id, caseId: cases[4].id, items: [{ description: 'Consumer complaint filing', amount: 12000, quantity: 1, total: 12000 }, { description: 'Court representation', amount: 8000, quantity: 2, total: 16000 }], subtotal: 28000, tax: 5040, total: 33040, status: 'overdue', dueDate: pastDate(10), notes: 'Payment overdue. Please clear immediately.', createdBy: users[0].id },
      { invoiceNumber: 'INV-2403-0006', clientId: clients[5].id, caseId: cases[5].id, items: [{ description: 'Labour court case preparation', amount: 15000, quantity: 1, total: 15000 }, { description: 'Document compilation', amount: 5000, quantity: 3, total: 15000 }, { description: 'Court appearances', amount: 10000, quantity: 3, total: 30000 }], subtotal: 60000, tax: 10800, total: 70800, status: 'draft', dueDate: futureDate(30), notes: '', createdBy: users[3].id },
      { invoiceNumber: 'INV-2404-0007', clientId: clients[6].id, caseId: cases[6].id, items: [{ description: 'NCLT CIRP representation', amount: 50000, quantity: 1, total: 50000 }, { description: 'CoC meeting preparation', amount: 20000, quantity: 3, total: 60000 }, { description: 'Resolution plan review', amount: 30000, quantity: 1, total: 30000 }], subtotal: 140000, tax: 25200, total: 165200, status: 'paid', dueDate: pastDate(5), paidDate: pastDate(3), paidAmount: 165200, paymentMethod: 'bank-transfer', notes: 'NCLT matter - quarterly billing.', createdBy: users[0].id },
      { invoiceNumber: 'INV-2405-0008', clientId: clients[7].id, caseId: cases[7].id, items: [{ description: 'RERA complaint preparation', amount: 20000, quantity: 1, total: 20000 }, { description: 'Hearing representation', amount: 10000, quantity: 2, total: 20000 }], subtotal: 40000, tax: 7200, total: 47200, status: 'sent', dueDate: futureDate(10), notes: 'RERA matter billing.', createdBy: users[2].id },
      { invoiceNumber: 'INV-2406-0009', clientId: clients[8].id, caseId: cases[8].id, items: [{ description: 'Scheme petition drafting', amount: 45000, quantity: 1, total: 45000 }, { description: 'NCLT hearing appearances', amount: 15000, quantity: 4, total: 60000 }], subtotal: 105000, tax: 18900, total: 123900, status: 'draft', dueDate: futureDate(45), notes: 'Corporate restructuring matter.', createdBy: users[0].id },
      { invoiceNumber: 'INV-2406-0010', clientId: clients[9].id, caseId: cases[9].id, items: [{ description: 'Copyright infringement suit', amount: 40000, quantity: 1, total: 40000 }, { description: 'Evidence compilation', amount: 8000, quantity: 5, total: 40000 }], subtotal: 80000, tax: 14400, total: 94400, status: 'overdue', dueDate: pastDate(15), notes: 'IP matter billing. Payment overdue.', createdBy: users[3].id },
    ];

    const invoices = [];
    for (const inv of invoiceData) {
      const id = crypto.randomUUID();
      await db.execute(
        `INSERT INTO invoices (id,invoiceNumber,clientId,caseId,items,subtotal,tax,total,status,dueDate,paidDate,paidAmount,paymentMethod,notes,createdBy,createdAt,updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, inv.invoiceNumber, inv.clientId, inv.caseId,
          JSON.stringify(inv.items), inv.subtotal, inv.tax, inv.total,
          inv.status, inv.dueDate, inv.paidDate || null, inv.paidAmount || 0,
          inv.paymentMethod || null, inv.notes, inv.createdBy, now, now]
      );
      invoices.push({ id, ...inv });
    }
    console.log(`Created ${invoices.length} invoices`);

    // === NOTIFICATIONS ===
    const notificationData = [
      { userId: users[0].id, title: 'New Case Assigned: DC/CVL/2024/1001', message: 'You have been assigned to TechCorp vs GlobalTech case.', type: 'system', caseId: cases[0].id, isRead: 1, link: `/cases/${cases[0].id}` },
      { userId: users[2].id, title: 'Hearing in 5 days', message: 'Upcoming hearing for TechCorp vs GlobalTech.', type: 'hearing', caseId: cases[0].id, isRead: 0, link: `/cases/${cases[0].id}` },
      { userId: users[3].id, title: 'Hearing in 12 days', message: 'Next hearing in Reddy vs Reddy divorce matter.', type: 'hearing', caseId: cases[1].id, isRead: 0, link: `/cases/${cases[1].id}` },
      { userId: users[0].id, title: 'Urgent: Hearing in 3 days', message: 'NCLT Insolvency matter hearing approaching.', type: 'hearing', caseId: cases[6].id, isRead: 0, link: `/cases/${cases[6].id}` },
      { userId: users[1].id, title: 'Invoice INV-2403-0005 Overdue', message: 'Consumer complaint invoice for Agarwal Trading is overdue.', type: 'invoice', caseId: null, isRead: 0, link: `/invoices/${invoices[4].id}` },
      { userId: users[3].id, title: 'Invoice INV-2406-0010 Overdue', message: 'Copyright infringement invoice for Shruti Design Studio is overdue.', type: 'invoice', caseId: null, isRead: 1, link: `/invoices/${invoices[9].id}` },
      { userId: users[0].id, title: 'Document uploaded', message: 'New document "NCLT Moratorium Order" uploaded for case NCLT/CRP/2024/7001.', type: 'document', caseId: cases[6].id, isRead: 0, link: `/cases/${cases[6].id}` },
      { userId: users[2].id, title: 'Hearing in 8 days', message: 'Anticipatory bail hearing in Cyber Fraud case.', type: 'hearing', caseId: cases[3].id, isRead: 0, link: `/cases/${cases[3].id}` },
    ];

    for (const n of notificationData) {
      const id = crypto.randomUUID();
      await db.execute(
        'INSERT INTO notifications (id,userId,title,message,type,caseId,isRead,link,createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, n.userId, n.title, n.message, n.type, n.caseId, n.isRead, n.link, now]
      );
    }
    console.log(`Created ${notificationData.length} notifications`);

    saveDb();

    console.log('\n--- Seed Complete ---');
    console.log('Demo Admin Login:');
    console.log('  Email: rajesh@lawfirm.com');
    console.log('  Password: admin123');
    console.log('\nDemo Manager Login:');
    console.log('  Email: priya@lawfirm.com');
    console.log('  Password: manager123');
    console.log('\nDemo Advocate Logins:');
    console.log('  Email: amit@lawfirm.com / Password: advocate123');
    console.log('  Email: sneha@lawfirm.com / Password: advocate123');
    console.log('\nClient Portal Logins:');
    console.log('  Email: vikram@techcorp.in / Password: client123');
    console.log('  Email: deepak@malhotraexports.in / Password: client123');
    console.log('----------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
