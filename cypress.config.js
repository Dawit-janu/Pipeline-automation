const { defineConfig } = require("cypress");
const allureWriter = require("@shelex/cypress-allure-plugin/writer");

module.exports = defineConfig({

  // ✅ Cypress Cloud - Project ID
  projectId: "wipkva",

  e2e: {
    setupNodeEvents(on, config) {
      // ✅ Allure plugin writer
      allureWriter(on, config);
      return config;
    },
  },

  video: true,
  screenshotOnRunFailure: true,
  videoCompression: 15,
});