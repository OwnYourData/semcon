const { getSemcon } = require("semcon/dist/index.js");

const baseUrl = "https://dec-support.data-container.net";
const semcon = getSemcon(baseUrl);

async function callVersion() {
    try {
        const versionData = await semcon.version();
        console.log("Version: " + versionData["version"]);
    } catch (error) {
        console.error("Error fetching version:", error);
    }
}

callVersion();