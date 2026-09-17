const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}-${random}`;
};

const generateCaseNumber = (court, caseType) => {
  const courtCodes = {
    district: 'DC',
    high: 'HC',
    supreme: 'SC',
    nclt: 'NCLT',
    drt: 'DRT',
    rera: 'RERA',
    consumer: 'CCD',
    other: 'OTH',
  };
  const typeCodes = {
    civil: 'CVL',
    criminal: 'CRM',
    family: 'FAM',
    corporate: 'CRP',
    labor: 'LAB',
    consumer: 'CON',
    other: 'OTH',
  };

  const courtCode = courtCodes[court] || 'OTH';
  const typeCode = typeCodes[caseType] || 'OTH';
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${courtCode}/${typeCode}/${year}/${random}`;
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const paginationHelper = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;
  return { page: pageNum, limit: limitNum, skip };
};

const paginateResults = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

module.exports = {
  generateInvoiceNumber,
  generateCaseNumber,
  formatDate,
  formatDateTime,
  calculateAge,
  paginationHelper,
  paginateResults,
};
