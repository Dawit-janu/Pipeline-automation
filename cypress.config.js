const { defineConfig } = require("cypress");

module.exports = defineConfig({

  // ✅ Tambahan mochawesome reporter
  reporter: "mochawesome",
  reporterOptions: {
    reportDir: "results",
    overwrite: false,
    html: false,
    json: true
  },

  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },

  videoCompression: 15,
});
