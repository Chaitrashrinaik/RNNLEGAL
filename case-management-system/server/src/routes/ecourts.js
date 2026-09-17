const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const ECI_BASE = process.env.ECOURTS_API_BASE_URL || 'https://webapi.ecourtsindia.com';
const ECI_KEY = process.env.ECOURTS_API_KEY;

async function eciFetch(path, options = {}) {
  const url = `${ECI_BASE}${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${ECI_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`eCourtsIndia API error ${resp.status}: ${text}`);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

router.get('/search', async (req, res) => {
  try {
    const { q, court, caseType, caseStatus, filingYear, decisionYear, benchType, petitioner, respondent, advocate, judge, page = 1, pageSize = 20 } = req.query;

    if (q && /^[A-Z]{2,5}\d{10,20}$/i.test(q.trim())) {
      try {
        const data = await eciFetch(`/api/partner/case/${q.trim().toUpperCase()}`);
        const caseData = data.data || data;
        if (caseData) {
          return res.json({
            success: true,
            data: {
              results: [{
                cnr: q.trim().toUpperCase(),
                caseTitle: caseData.caseTitle || caseData.title || '',
                caseNumber: caseData.caseNumber || caseData.number || '',
                courtName: caseData.courtName || caseData.court || '',
                status: caseData.status || 'N/A',
                nextHearingDate: caseData.nextHearingDate || null,
              }],
              totalHits: 1,
            },
          });
        }
      } catch {
        // Case not found by CNR, fall through to normal search
      }
    }

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (court) params.set('courtCode', court);
    if (caseType) params.set('caseType', caseType);
    if (caseStatus) params.set('caseStatus', caseStatus);
    if (filingYear) params.set('filingYear', filingYear);
    if (decisionYear) params.set('decisionYear', decisionYear);
    if (benchType) params.set('benchType', benchType);
    if (petitioner) params.set('petitioner', petitioner);
    if (respondent) params.set('respondent', respondent);
    if (advocate) params.set('advocate', advocate);
    if (judge) params.set('judge', judge);
    params.set('page', page);
    params.set('pageSize', pageSize);

    const data = await eciFetch(`/api/partner/search?${params.toString()}`);

    const rawResults = data.data?.results || data.data || [];
    const searchTerm = (q || '').trim().toUpperCase();
    const filtered = searchTerm && /^[A-Z]{2,5}\d{10,20}$/i.test(searchTerm)
      ? rawResults.filter(r => r.cnr && r.cnr.toUpperCase().startsWith(searchTerm.substring(0, 5)))
      : rawResults;

    res.json({ success: true, data: { results: filtered, totalHits: filtered.length } });
  } catch (error) {
    console.error('eCourts search error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to search cases' });
  }
});

router.get('/case/:cnr', async (req, res) => {
  try {
    const data = await eciFetch(`/api/partner/case/${req.params.cnr}`);
    res.json({ success: true, data: data.data || data });
  } catch (error) {
    console.error('eCourts case detail error:', error.message);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch case details' });
  }
});

router.get('/case/:cnr/orders', async (req, res) => {
  try {
    const data = await eciFetch(`/api/partner/case/${req.params.cnr}/orders`);
    res.json({ success: true, data: data.data || data });
  } catch (error) {
    console.error('eCourts orders error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch orders' });
  }
});

router.get('/case/:cnr/orders/:orderId/markdown', async (req, res) => {
  try {
    const data = await eciFetch(`/api/partner/case/${req.params.cnr}/orders/${req.params.orderId}/markdown`);
    res.json({ success: true, data: data.data || data });
  } catch (error) {
    console.error('eCourts order markdown error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch order markdown' });
  }
});

router.get('/case/:cnr/orders/:orderId/analysis', async (req, res) => {
  try {
    const data = await eciFetch(`/api/partner/case/${req.params.cnr}/orders/${req.params.orderId}/analysis`);
    res.json({ success: true, data: data.data || data });
  } catch (error) {
    console.error('eCourts order analysis error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch order analysis' });
  }
});

router.post('/causelist', async (req, res) => {
  try {
    const { state, district, courtComplex, date } = req.body;
    const body = {};
    if (state) body.state = state;
    if (district) body.district = district;
    if (courtComplex) body.courtComplex = courtComplex;
    if (date) body.date = date;

    const data = await eciFetch('/api/partner/causelist', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    res.json({ success: true, data: data.data || data });
  } catch (error) {
    console.error('eCourts causelist error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch cause list' });
  }
});

router.post('/causelist/cnr/batch', async (req, res) => {
  try {
    const { cnrs } = req.body;
    if (!Array.isArray(cnrs) || cnrs.length === 0) {
      return res.status(400).json({ success: false, message: 'cnrs must be a non-empty array' });
    }
    const data = await eciFetch('/api/partner/causelist/cnr/batch', {
      method: 'POST',
      body: JSON.stringify({ cnrs: cnrs.slice(0, 100) }),
    });
    res.json({ success: true, data: data.data || data });
  } catch (error) {
    console.error('eCourts batch causelist error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to check cause list' });
  }
});

router.get('/enums', async (req, res) => {
  try {
    const data = await eciFetch('/api/partner/enums');
    res.json({ success: true, data: data.data || data });
  } catch (error) {
    console.error('eCourts enums error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch enums' });
  }
});

router.get('/structure', async (req, res) => {
  try {
    const { state, district } = req.query;
    let path = '/api/partner/structure';
    const params = [];
    if (state) params.push(`state=${encodeURIComponent(state)}`);
    if (district) params.push(`district=${encodeURIComponent(district)}`);
    if (params.length) path += '?' + params.join('&');

    const data = await eciFetch(path);
    res.json({ success: true, data: data.data || data });
  } catch (error) {
    console.error('eCourts structure error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch court structure' });
  }
});

router.post('/refresh/:cnr', async (req, res) => {
  try {
    const data = await eciFetch(`/api/partner/refresh/${req.params.cnr}`, { method: 'POST' });
    res.json({ success: true, data: data.data || data });
  } catch (error) {
    console.error('eCourts refresh error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to refresh case' });
  }
});

module.exports = router;
