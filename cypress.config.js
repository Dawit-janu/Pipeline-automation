const { defineConfig } = require("cypress");
const allureWriter = require("@shelex/cypress-allure-plugin/writer");

module.exports = defineConfig({

  // ✅ Cypress Cloud Project ID
  //projectId: "wipkva",

  e2e: {
    setupNodeEvents(on, config) {
      // ✅ Allure plugin — generate allure-results per test
      allureWriter(on, config);

      // ✅ TAMBAHAN INI: Integrasi Video & Screenshot otomatis ke Allure
      on('after:spec', async (spec, results) => {
        if (results) {
          // Script ini akan menyalin video dan screenshot ke folder allure-results
          await allureWriter.onAfterSpec(spec, results, config.projectRoot);
        }
      });

      return config;
    },
    env: {
      allure: true,              // ✅ Aktifkan Allure plugin
      allureReuseAfterSpec: true, // ✅ Reuse allure-results untuk semua spec
    },
  },
  
  // 1. jalankan hanya folder Ts
  specPattern: "cypress/e2e/TS-*/**/*.cy.js",

  // 2. kecuali folder example / file sampah
  excludeSpecPattern: [
      "**/examples/**",
      "**/__snapshots__/**",
      "**/__image_snapshots__/**"
    ],

  video: true,                    // ✅ Video direkam
  screenshotOnRunFailure: true,   // ✅ Screenshot saat gagal
  videoCompression: 15,
});