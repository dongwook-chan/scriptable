// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: magic;
// OpenProgressReminders.js
// Opens the Reminders list "Progress" in the Reminders app using Scriptable.

console.log("🔔 Script 'OpenProgressReminders.js' started");

// 1. Name of the Reminders list you want to open
const TARGET_TITLE = "Progress";

try {
  // 2. Fetch all reminder calendars
  let reminderCals = await Calendar.forReminders();
  console.log("Found " + reminderCals.length + " reminder lists");

  // 3. Find the one matching your title
  let progressCal = reminderCals.find(c => c.title === TARGET_TITLE);

  if (!progressCal) {
    console.log("Reminders list '" + TARGET_TITLE + "' not found");
    let alert = new Alert();
    alert.title = "List Not Found";
    alert.message = "Could not find a Reminders list named '" + TARGET_TITLE + "'.";
    alert.addAction("OK");
    await alert.present();
  } else {
    // 4. Log the identifier
    console.log("Found list identifier: " + progressCal.identifier);

    // 5. Build the URL and open it
    let url = "x-apple-reminderkit://" + progressCal.identifier;
    Safari.open(url);
  }
} catch (error) {
  console.log("Error accessing Reminders lists: " + error);
  let alert = new Alert();
  alert.title = "Error";
  alert.message = "An error occurred accessing Reminders: " + error;
  alert.addAction("OK");
  await alert.present();
} finally {
  // 6. End script
  Script.complete();
}