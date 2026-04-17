const { defineConfig } = require("cypress");
const allureWriter = require("@shelex/cypress-allure-plugin/writer");

module.exports = defineConfig({

  // ✅ Cypress Cloud Project ID
  projectId: "wipkva",

  e2e: {
    setupNodeEvents(on, config) {
      // ✅ Allure plugin — generate allure-results per test
      allureWriter(on, config);
      return config;
    },
    env: {
      allure: true,              // ✅ Aktifkan Allure plugin
      allureReuseAfterSpec: true, // ✅ Reuse allure-results untuk semua spec
    },
  },

  video: true,                    // ✅ Video direkam → tersimpan di Cypress Cloud
  screenshotOnRunFailure: true,   // ✅ Screenshot saat gagal → tersimpan di Cypress Cloud
  videoCompression: 15,
});