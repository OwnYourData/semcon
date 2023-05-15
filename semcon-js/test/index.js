const { getSemcon } = require("../dist/index.js");

const baseUrl = "https://dec-backup.data-container.net";
const semcon = getSemcon(baseUrl);

async function callVersion() {
    try {
        const versionData = await semcon.version();
        console.log("Version: " + versionData["version"]);
    } catch (error) {
        console.error("Error fetching version:", error);
    }
}

async function callCheckUser() {
    try {
        const checkUserData = await semcon.checkUser("john", "123");
        console.log("checkUser Response: " + JSON.stringify(checkUserData, null, 2));

    } catch (error) {
        console.error("Error running checkUser:", error);
    }
}

async function callBackup() {
    try {
        const backupData = await semcon.backup("john", "123",'{"hello":"TypeScript"}');
        console.log("backup Response: " + JSON.stringify(backupData, null, 2));

    } catch (error) {
        console.error("Error running backup:", error);
    }
}

async function callRestore() {
    try {
        const restoreData = await semcon.restore("john", "123");
        console.log("restore Response: " + restoreData);

    } catch (error) {
        console.error("Error running restore:", error);
    }
}

async function main() {
    await callCheckUser();
    await callBackup();
    await callRestore();
}

callVersion();
main();
