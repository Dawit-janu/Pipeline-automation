const { defineConfig } = require("cypress");
const allureWriter = require("@shelex/cypress-allure-plugin/writer");

module.exports = defineConfig({

  // projectId: "wipkva",

  e2e: {
    setupNodeEvents(on, config) {
      // ✅ Allure plugin — generate allure-results per test
      allureWriter(on, config);

      // ✅ Integrasi Video & Screenshot otomatis ke Allure
      on('after:spec', async (spec, results) => {
        if (results) {
          await allureWriter.onAfterSpec(spec, results, config.projectRoot);
        }
      });

      return config;
    },
    env: {
      allure: true,
      allureReuseAfterSpec: true,
    },

    // 1. Jalankan hanya folder TS (HILANGKAN 'cypress/e2e/' di depannya)
    specPattern: "TS-*/**/*.cy.js",

    // 2. Kecuali folder example / file sampah
    excludeSpecPattern: [
      "**/examples/**",
      "**/__snapshots__/**",
      "**/__image_snapshots__/**"
    ],
  },

  video: true,
  screenshotOnRunFailure: true,
  videoCompression: 15,
});