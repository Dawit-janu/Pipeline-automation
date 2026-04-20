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
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" }); // Hapus @_ supaya mudah
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

        // --- EKSTRAKSI CERDAS LABEL ALLURE ---
        // Label 'testClass' biasanya berisi: TC01-Coba.cy.js (Nama File)
        // Label 'testMethod' biasanya berisi: Success Login (Nama It Block)
        let testClass = "";
        let testMethod = "";
        let suiteName = "";

        if (tc.labels && tc.labels.label) {
            const labels = Array.isArray(tc.labels.label) ? tc.labels.label : [tc.labels.label];
            labels.forEach(l => {
                if (l.name === 'testClass') testClass = l.value;
                if (l.name === 'testMethod') testMethod = l.value;
                if (l.name === 'suite') suiteName = l.value;
            });
        }

        // Bersihkan TestID: Hapus .cy.js
        let testID = testClass.replace('.cy.js', '');
        
        // Bersihkan Title:
        // Jika ada testMethod, pakai itu (paling akurat: "Success Login")
        // Kalau tidak ada, ambil dari 'name' lalu hapus prefix 'suiteName' (misal: "Login Success Login" -> "Success Login")
        let title = "";
        if (testMethod) {
            title = testMethod;
        } else {
            title = name.replace(suiteName, '').trim();
        }

        testCases.push({
            testID: testID,       // Untuk match ke kolom A (TestID)
            title: title,         // Untuk match ke kolom B (Title)
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
    // 1. Parse Data
    const testResults = parseAllureResults();
    console.log(`\n📦 Parsing Allure: Ditemukan ${testResults.length} test case.`);

    if (testResults.length === 0) return;

    // 2. Baca Data Sheet
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Ambil data Sheet (Baris 2 sampai 1000)
    // A=TestID (0), B=Title (1), E=Actual (4), F=Status (5), G=LastRun (6), H=Duration (7)
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

    testResults.forEach(result => {
      // --- MATCHING LOGIC ---
      let rowIndex = -1;
      let matchType = "";

      // 1. Cari kecocokan di KOLOM B (Title)
      // Case insensitive: "Success Login" vs "success login"
      rowIndex = rows.findIndex(row => row[1] && row[1].trim().toLowerCase() === result.title.toLowerCase());
      if (rowIndex !== -1) {
        matchType = "Title";
      } else {
        // 2. Cari kecocokan di KOLOM A (TestID)
        // Case insensitive: "TC01-Coba" vs "tc01-coba"
        rowIndex = rows.findIndex(row => row[0] && row[0].trim().toLowerCase() === result.testID.toLowerCase());
        if (rowIndex !== -1) {
          matchType = "TestID";
        }
      }

      if (rowIndex !== -1) {
        const rowNum = rowIndex + 2;
        console.log(`✅ MATCH FOUND (${matchType}): [Row ${rowNum}] ID: ${result.testID} | Title: ${result.title}`);

        // Update Kolom: Actual (E), Status (F), LastRun (G), Duration (H)
        updates.push({
          range: `${SHEET_NAME}!E${rowNum}:H${rowNum}`,
          values: [[result.actual, result.status, `${dateNow} ${timestamp}`, result.duration]]
        });
      } else {
        // Log Detail kalau tidak ketemu untuk memudahkan debugging
        console.log(`❌ NOT FOUND: ID "${result.testID}" | Title "${result.title}"`);
      }
    });

    // 3. Batch Update
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
      console.log('\n⚠️ Tidak ada baris yang dicocokkan.');
      console.log('💡 Cek lagi penulisan "TestID" dan "Title" di GSheet apakah sama persis (huruf besar/kecilnya).');
    }

  } catch (error) {
    console.error('❌ Error GSheet:', error);
    throw error;
  }
}

updateSheet();