const fs = require('fs');
const { google } = require('googleapis');
const { XMLParser } = require('fast-xml-parser');

// --- CONFIGURATION ---
const SPREADSHEET_ID = '1RLzrVcgdyifgq4D-tzRHKAKHGLyiNEQ-iGsDYo8H4b4';
const SHEET_NAME = 'Sheet1'; 
const CREDENTIALS_PATH = 'google-credentials.json';

// --- HELPER: PARSE ALLURE RESULTS ---
function parseAllureResults() {
  const resultsDir = 'allure-results';
  if (!fs.existsSync(resultsDir)) {
    console.log('Folder allure-results tidak ditemukan.');
    return [];
  }

  const files = fs.readdirSync(resultsDir);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const testCases = [];

  files.forEach(file => {
    if (file.endsWith('.xml')) {
      const content = fs.readFileSync(`${resultsDir}/${file}`, 'utf8');
      const parsed = parser.parse(content);
      
      if (parsed.testCase) {
        const tc = parsed.testCase;
        let name = tc.name || "Unknown Test";
        let status = (tc.status || 'unknown').toUpperCase();
        let duration = tc.time ? parseFloat(tc.time).toFixed(2) + "s" : "N/A";
        
        let errorMessage = "As Expected";
        if (status === 'FAILED' && tc.failure) {
            errorMessage = tc.failure['message'] || "Test Failed";
            // Ambil hanya 1 baris pertama error
            errorMessage = errorMessage.split('\n')[0]; 
        }

        // --- EKSTRAKSI LABEL ---
        let testClass = "";  // Biasanya Nama File
        let testMethod = ""; // Biasama Nama Test (It Block)
        let suiteName = "";

        if (tc.labels && tc.labels.label) {
            const labels = Array.isArray(tc.labels.label) ? tc.labels.label : [tc.labels.label];
            labels.forEach(l => {
                if (l.name === 'testClass') testClass = l.value;
                if (l.name === 'testMethod') testMethod = l.value;
                if (l.name === 'suite') suiteName = l.value;
            });
        }

        // --- PERBAIKAN: BERSIHKAN NAMA FILE ---
        // Input: TS-Coba/TC01-Coba.cy.js
        // Output: TC01-Coba
        let testID = testClass.replace('.cy.js', '');
        // Jika ada slash (/), ambil bagian belakangnya (filenya saja)
        if (testID.includes('/')) {
            testID = testID.split('/').pop();
        }

        // --- PERBAIKAN: BERSIHKAN TITLE ---
        // Prioritaskan nama test (testMethod), jika tidak ada pakai nama umum
        let title = testMethod;
        if (!title) {
            title = name.replace(suiteName, '').trim();
        }

        testCases.push({
            testID: testID,       // Contoh: TC01-Coba
            title: title,         // Contoh: Success Login
            status: status, 
            duration: duration,
            actual: errorMessage
        });
      }
    }
  });
  return testCases;
}

// --- MAIN ---
async function updateSheet() {
  try {
    const testResults = parseAllureResults();
    console.log(`\n📦 Parsing Allure: Ditemukan ${testResults.length} test case.`);

    if (testResults.length === 0) return;

    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:H1000`,
    });

    const rows = res.data.values || [];
    if (rows.length === 0) {
      console.log('⚠️ GSheet kosong atau tidak terbaca.');
      return;
    }
    
    const updates = [];
    const dateNow = new Date().toISOString().split('T')[0]; 
    const timestamp = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false });

    // Tampilkan beberapa ID dari GSheet untuk debugging
    console.log(`🔍 Debug: GSheet Rows Found: ${rows.length}`);

    testResults.forEach(result => {
      // --- LOGIC MATCHING (CASE INSENSITIVE) ---
      let rowIndex = -1;
      let matchType = "";

      // 1. Cari di Kolom B (Title)
      rowIndex = rows.findIndex(row => row[1] && row[1].trim().toLowerCase() === result.title.toLowerCase());
      if (rowIndex !== -1) {
        matchType = "Title";
      } else {
        // 2. Cari di Kolom A (TestID)
        rowIndex = rows.findIndex(row => row[0] && row[0].trim().toLowerCase() === result.testID.toLowerCase());
        if (rowIndex !== -1) {
          matchType = "TestID";
        }
      }

      if (rowIndex !== -1) {
        const rowNum = rowIndex + 2;
        console.log(`✅ MATCH FOUND (${matchType}): [Row ${rowNum}] ID=${result.testID} | Title=${result.title}`);

        updates.push({
          range: `${SHEET_NAME}!E${rowNum}:H${rowNum}`,
          values: [[result.actual, result.status, `${dateNow} ${timestamp}`, result.duration]]
        });
      } else {
        console.log(`❌ NOT FOUND: ID="${result.testID}" | Title="${result.title}"`);
        console.log(`   💡 Pastikan Kolom A (TestID) atau B (Title) di GSheet SAMA dengan nilai di atas.`);
      }
    });

    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: updates
        }
      });
      console.log(`\n🚀 Berhasil update ${updates.length} baris di GSheet.`);
    } else {
      console.log('\n⚠️ Tidak ada update yang dilakukan (Nama test tidak cocok dengan GSheet).');
      console.log('💡 Tips: Ganti nama file Cypress agar sama persis dengan TestID di GSheet.');
      console.log('   Contoh: Jika TestID di GSheet "TC01", ganti nama file jadi "TC01.cy.js".');
    }

  } catch (error) {
    console.error('❌ Error GSheet:', error);
    throw error;
  }
}

updateSheet();