const fs = require('fs');
const { google } = require('googleapis');

// --- CONFIGURATION ---
const SPREADSHEET_ID = '1RLzrVcgdyifgq4D-tzRHKAKHGLyiNEQ-iGsDYo8H4b4';
const SHEET_NAME = 'Sheet1'; 
const CREDENTIALS_PATH = 'google-credentials.json';

// --- HELPER: PARSE ALLURE RESULTS (JSON FORMAT) ---
function parseAllureResults() {
  const resultsDir = 'allure-results';
  if (!fs.existsSync(resultsDir)) {
    console.log('Folder allure-results tidak ditemukan.');
    return [];
  }

  const files = fs.readdirSync(resultsDir);
  const testCases = [];

  files.forEach(file => {
    // 1. Filter file: Cari file yang berakhiran -result.json (Bukan XML)
    if (file.endsWith('-result.json')) {
      const content = fs.readFileSync(`${resultsDir}/${file}`, 'utf8');
      try {
        // 2. Parsing JSON (Bukan XML Parser)
        const result = JSON.parse(content);
        
        // Ekstrak Data Dasar
        let name = result.name || "Unknown Test";
        let status = result.status ? result.status.toUpperCase() : 'UNKNOWN';
        
        // Hitung Durasi
        let duration = "N/A";
        if (result.start && result.stop) {
            let dur = (result.stop - result.start) / 1000; // ms to seconds
            duration = dur.toFixed(2) + "s";
        }

        // Pesan Error
        let errorMessage = "As Expected";
        if (status === 'FAILED' && result.statusDetails && result.statusDetails.message) {
            errorMessage = result.statusDetails.message;
            errorMessage = errorMessage.split('\n')[0]; // Ambil baris pertama saja
        }

        // Ekstrak Label (Suite, TestClass, TestMethod)
        let testClass = "";
        let testMethod = "";
        let suiteName = "";

        if (result.labels && Array.isArray(result.labels)) {
            result.labels.forEach(l => {
                if (l.name === 'testClass') testClass = l.value;
                if (l.name === 'testMethod') testMethod = l.value;
                if (l.name === 'suite') suiteName = l.value;
            });
        }

        // Bersihkan TestID: Hapus .cy.js dan folder
        let testID = testClass.replace('.cy.js', '');
        if (testID.includes('/')) {
            testID = testID.split('/').pop();
        }

        // Bersihkan Title: Gunakan testMethod atau bersihkan dari suite name
        let title = testMethod;
        if (!title) {
            title = name.replace(suiteName, '').trim();
        }

        testCases.push({
            testID: testID,
            title: title,
            status: status, 
            duration: duration,
            actual: errorMessage
        });

      } catch (err) {
        console.error(`Gagal parsing file ${file}:`, err.message);
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
    }

  } catch (error) {
    console.error('❌ Error GSheet:', error);
    throw error;
  }
}

updateSheet();