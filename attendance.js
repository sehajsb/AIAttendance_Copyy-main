// Function to determine attendance status based on face data
// Function to determine attendance status based on face data
function determineAttendanceStatus(faceData) {
  // Check if the person is marked as late
  if (faceData.isLate) {
    return "Late"; // Return "Late" if the person is late
  }

  // Your logic here to determine if a user is absent or present
  // For example, you can check the dateTime and period fields
  // Here, I'm assuming if dateTime is not null, the person is present
  if (faceData.dateTime) {
    return "Present";
  } else {
    return "Absent";
  }
}
function getStoredFaceData() {
  return JSON.parse(localStorage.getItem("faceData")) || [];
}
// Function to display attendance information on the HTML page
function displayAttendance() {
  let attendanceInfoDiv = document.getElementById("attendanceInfo");
  let tableHtml =
    "<table><tr><th>Name</th><th>Present Status</th><th>Period</th><th>Date/Time</th></tr>";

  // Retrieve stored face data
  const storedData = getStoredFaceData();
  let uniqueUsers = {};

  if (storedData.length === 0) {
    attendanceInfoDiv.textContent = "No face data available.";
    return;
  }

  storedData.forEach((data) => {
    // Skip "Unknown" users
    if (data.label === "Unknown") return;

    uniqueUsers[data.label] = data; // Store each user only once
  });

  Object.values(uniqueUsers).forEach((data) => {
    let attendanceStatus = determineAttendanceStatus(data);
    tableHtml += `<tr><td>${data.label}</td><td>${attendanceStatus}</td><td>${data.period}</td><td>${data.dateTime}</td></tr>`;
  });

  tableHtml += "</table>";
  attendanceInfoDiv.innerHTML = tableHtml;
}

// Call the function to display attendance information when the page loads
window.onload = displayAttendance;
