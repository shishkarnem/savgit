const https = require('https');

// Let's fetch the html of the google sheet to see all sheet tabs (gid)
const sheetUrl = "https://docs.google.com/spreadsheets/d/1NNM_MP-XYABl8sbApFyp2loqbuasERaFDnO1bop6J24/edit?usp=sharing";

function fetchHtml(url) {
  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      fetchHtml(res.headers.location);
      return;
    }
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      console.log("Fetched HTML length:", data.length);
      const matches = data.match(/gid=([0-9]+)/g);
      console.log("Found gids in HTML:", Array.from(new Set(matches)));

      // Search for sheet names
      const nameMatches = data.match(/name: "([^"]+)"/g);
      console.log("Names:", nameMatches);
    });
  });
}

fetchHtml(sheetUrl);
