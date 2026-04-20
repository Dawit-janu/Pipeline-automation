const fs = require('fs');
const { google } = require('googleapis');

// --- CONFIGURATION ---
const SPREADSHEET_ID = '1RLzrVcgdyifgq4D-tzRHKAKHGLyiNEQ-iGsDYo8H4b4'; // ID Sheet kamu
const SHEET_NAME = 'Sheet1'; // Pastikan nama tab di Sheet kamu "Sheet1" atau sesuaikan di sini
const CREDENTIALS_PATH = 'google-credentials.json';

// --- MAIN FUNCTION ---
async function updateSheet() {
  try {
    // 1. Parse Hasil Test dari File Artifact
    if (!fs.existsSync('cypress-output.txt')) {
      console.log('cypress-output.txt tidak ditemukan. Tidak ada data untuk diupdate.');
      return;
    }

    const output = fs.readFileSync('cypress-output.txt', 'utf8');
    
    let passed = 0;
    let failed = 0;
    let total = 0;
    let status = 'UNKNOWN';

    // Regex untuk mencari baris summary. Contoh output: "All specs passed!" atau "2 of 20 failed"
    const summaryLine = output.match(/(All specs passed|of [0-9]+ failed)/);

    if (summaryLine) {
      const line = summaryLine[0];
      if (line.includes('All specs passed')) {
        status = 'PASS';
        // Cari total test dari baris sebelumnya (biasanya: "Running: X")
        const matchTotal = output.match(/Running: ([0-9]+)/);
        total = matchTotal ? parseInt(matchTotal[1]) : 0;
        passed = total;
        failed = 0;
      } else if (line.includes('failed')) {
        status = 'FAIL';
        // Format biasanya: "2 of 20 failed"
        const parts = line.match(/(\d+) of (\d+) failed/);
        if (parts) {
          failed = parseInt(parts[1]);
          total = parseInt(parts[2]);
          passed = total - failed;
        }
      }
    } else {
        // Jika pattern tidak ketemu, coba cara alternatif
        console.log('Pattern standar tidak ditemukan, mencoba parsing alternatif...');
        const matchTotal = output.match(/(\d+) of (\d+) tests passed/); // "18 of 20 tests passed"
        if(matchTotal) {
             passed = parseInt(matchTotal[1]);
             total = parseInt(matchTotal[2]);
             failed = total - passed;
             status = failed > 0 ? 'FAIL' : 'PASS';
        } else {
            console.log('Gagal memparse hasil test.');
            return;
        }
    }

    console.log(`Parsed Result: Total=${total}, Passed=${passed}, Failed=${failed}, Status=${status}`);

    // 2. Auth ke Google Sheets
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 3. Siapkan Data (Tanggal, Status, Total, Pass, Fail)
    const date = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
    const time = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }); // WIB
    const values = [[date, time, status, total, passed, failed]];

    // 4. Append (Tambah) data ke baris paling bawah
    const resource = {
      values,
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`, // Mulai cari kolom dari A1
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource,
    });

    console.log('✅ Berhasil update Google Sheet!');

  } catch (error) {
    console.error('❌ Error saat update GSheet:', error);
    // Jangan throw error agar pipeline tetap bisa lanjut ke notifikasi jika perlu
  }
}

updateSheet();