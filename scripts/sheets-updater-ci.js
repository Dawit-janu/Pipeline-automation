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
  const parser = new XMLParser({ ignoreAttributes: false });
  const testCases = [];

  files.forEach(file => {
    if (file.endsWith('.xml')) {
      const content = fs.readFileSync(`${resultsDir}/${file}`, 'utf8');
      const parsed = parser.parse(content);
      
      // Struktur XML Allure
      if (parsed.testCase) {
        const tc = parsed.testCase;
        let rawName = tc['@_name'] || "Unknown Test";
        
        // Bersihkan nama: Ambil bagian terakhir jika pakai "Folder -> NamaTest"
        let cleanName = rawName.includes(' -> ') ? rawName.split(' -> ').pop().trim() : rawName;
        cleanName = cleanName.includes('/') ? cleanName.split('/').pop() : cleanName;
        
        let status = (tc['@_status'] || 'unknown').toUpperCase();
        let duration = tc['@_time'] ? parseFloat(tc['@_time']).toFixed(2) + "s" : "N/A";
        
        let errorMessage = "As Expected";
        if (status === 'FAILED' && tc.failure) {
            errorMessage = tc.failure['@_message'] || "Test Failed";
            // Ambil hanya 1 baris pertama error agar rapi
            errorMessage = errorMessage.split('\n')[0]; 
        }

        testCases.push({
            rawName: rawName,     // Nama asli dari Cypress
            cleanName: cleanName, // Nama yang sudah dibersihkan
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
    
    // Ambil data Sheet (Kita ambil dari baris 2 sampai 1000)
    // Asumsi header ada di baris 1
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:H1000`,
    });

    const rows = res.data.values || [];
    if (rows.length === 0) {
      console.log('⚠️ GSheet kosong atau tidak terbaca.');
      return;
    }

    // Index Kolom (A=0, B=1, dst)
    // A: TestID (0), B: Title (1), C: Steps (2), D: Expected (3), E: Actual (4), F: Status (5), G: LastRun (6), H: Duration (7)
    
    const updates = [];
    const dateNow = new Date().toISOString().split('T')[0]; 
    const timestamp = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false });

    testResults.forEach(result => {
      // LOGIC MATCHING: Cari baris yang cocok
      // Prioritas 1: Cocokkan dengan Col B (Title)
      // Prioritas 2: Cocokkan dengan Col A (TestID)
      
      let rowIndex = -1;
      let matchType = "";

      // 1. Coba cocokkan Title (Case Insensitive)
      rowIndex = rows.findIndex(row => row[1] && row[1].trim().toLowerCase() === result.cleanName.toLowerCase());
      if (rowIndex !== -1) {
        matchType = "Title";
      } else {
        // 2. Coba cocokkan TestID (Col A)
        rowIndex = rows.findIndex(row => row[0] && row[0].trim().toLowerCase() === result.cleanName.toLowerCase());
        if (rowIndex !== -1) {
          matchType = "TestID";
        }
      }

      if (rowIndex !== -1) {
        const rowNum = rowIndex + 2; // +2 karena header di baris 1, array mulai 0
        console.log(`✅ MATCH FOUND (${matchType}): [Row ${rowNum}] "${result.cleanName}" -> ${result.status}`);

        // Siapkan data update: [Actual, Status, LastRun, Duration]
        // Target Kolom: E(4), F(5), G(6), H(7)
        // GSheet membutuhkan format [ [row1_values], [row2_values] ]
        updates.push({
          range: `${SHEET_NAME}!E${rowNum}:H${rowNum}`,
          values: [[result.actual, result.status, `${dateNow} ${timestamp}`, result.duration]]
        });
      } else {
        console.log(`❌ NOT FOUND: "${result.cleanName}" (Cek kolom Title/TestID di GSheet)`);
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
      console.log('\n⚠️ Tidak ada update yang dilakukan (Nama test case tidak cocok dengan GSheet).');
      console.log('💡 Tips: Pastikan "Title" di GSheet SAMA dengan nama test di Cypress (bagian "it(...)").');
    }

  } catch (error) {
    console.error('❌ Error GSheet:', error);
    throw error;
  }
}

updateSheet();