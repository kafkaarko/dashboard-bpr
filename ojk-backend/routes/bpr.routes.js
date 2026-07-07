const { DownloadExcelFromFile, getMatrixAndCalculate, getUniqueBank, scaraping  ,getAlertsForBank,
  getAlertsSummary,
  getSubmissionTracker,
  downloadExcel,
  getAiSummary,
  getBroadcastList,
  triggerBroadcastManual,
  getScreenerNasional, } = require('../controller/bpr.controller')
const authMiddleware = require('../middleware/verif.middleware')
const express = require('express')

const bprRoute = express.Router()

bprRoute.use(authMiddleware)
bprRoute.get('/bpr-list',getUniqueBank)
bprRoute.get('/bpr/:id_bank',getMatrixAndCalculate)
bprRoute.get('/rekap-bpr',scaraping)
bprRoute.get('/alerts', authMiddleware, getAlertsSummary);          // ringkasan semua bank yang kena alert
bprRoute.get('/submission-tracker', authMiddleware, getSubmissionTracker);
bprRoute.get('/export/excel/:id_bank',downloadExcel)
bprRoute.get('/alerts/:id_bank', authMiddleware, getAlertsForBank); // alert untuk 1 bank spesifik
bprRoute.get('/ai-summary/:id_bank', authMiddleware, getAiSummary);
bprRoute.get('/broadcast', authMiddleware, getBroadcastList);              // feed histori broadcast
bprRoute.post('/broadcast/generate', authMiddleware, triggerBroadcastManual); // trigger manual (testing / darurat)
// FITUR 5: Screener Nasional
bprRoute.get('/screener', authMiddleware, getScreenerNasional);
// bprRoute.get('/download/:tahun/:bulan/:id_bank/:kode_laporan',DownloadExcelFromFile)

module.exports = bprRoute