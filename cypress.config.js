const { defineConfig } = require("cypress");

module.exports = defineConfig({

  e2e: {
    setupNodeEvents(on, config) {

      // ✅ WAJIB untuk generate allure-results
      require("@shelex/cypress-allure-plugin/writer")(on, config);

      return config;
    },
  },

  videoCompression: 15,
});