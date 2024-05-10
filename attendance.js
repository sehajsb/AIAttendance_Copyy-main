// Function to determine attendance status based on face data
function determineAttendanceStatus(faceData) {
  // Check if the faceData string contains the word "Late"
  if (faceData.isLate && faceData.period.includes("Late")) {
    // Extract the number of minutes from the string
    const lateMinutes = parseInt(faceData.isLate.match(/\d+/)[0]);
    return `Late (${lateMinutes}m)`;
  }

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

// Keep track of the currently displayed profile
let currentProfileId = null;

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
    if (data.label === "unknown") return;

    uniqueUsers[data.label] = data; // Store each user only once
  });

  Object.values(uniqueUsers).forEach((data) => {
    let attendanceStatus = determineAttendanceStatus(data);
    let profilePicture = ""; // Default profile picture
    // Set profile picture based on the student's name
    if (data.label === "Parker") {
      profilePicture = "profilePictures/parker.png"; // Change this to the actual image filename
    } else if (data.label === "Sehaj") {
      profilePicture = "profilePictures/sehaj.jpg"; // Change this to the actual image filename
    } else {
      profilePicture = data.profilePicture; // Use the default profile picture if the name doesn't match
    }
    tableHtml += `<tr id="${data.label}"><td><div class="profile-container"><img src="${profilePicture}" alt="Profile" style="width:50px;height:50px;border-radius:99rem;"> <span>${data.label}</span></div></td><td>${attendanceStatus}</td><td>${data.period}</td><td>${data.dateTime}</td></tr>`;
  });

  tableHtml += "</table>";
  attendanceInfoDiv.innerHTML = tableHtml;

  // Add click event listener to each row
  document.querySelectorAll("table tr").forEach((row) => {
    row.addEventListener("click", () => {
      const studentId = row.id;
      const studentData = uniqueUsers[studentId];
      if (studentData) {
        togglePopup(studentId, studentData);
      }
    });
  });
}

// Function to toggle the profile popup
function togglePopup(studentId, studentData) {
  if (currentProfileId === studentId) {
    // If the clicked profile is already open, close it
    closePopup();
    currentProfileId = null;
  } else {
    // If another profile is open, close it first
    if (currentProfileId !== null) {
      closePopup();
    }
    // Open the clicked profile
    displayPopup(studentData);
    currentProfileId = studentId;
  }
}

// Function to display student profile popup
function displayPopup(studentData) {
  // Create popup content
  const popupContent = `
    <div id="popup-${studentData.label}" class="popup">
      <p>Name: ${studentData.label}</p>
      <p>Present Status: ${determineAttendanceStatus(studentData)}</p>
      <p>Period: ${studentData.period}</p>
      <p>Date/Time: ${studentData.dateTime}</p>
      <button onclick="closePopup()">Close</button>
    </div>
  `;

  // Append popup content to body
  document.body.insertAdjacentHTML("beforeend", popupContent);
}

// Function to close the popup
function closePopup() {
  const popup = document.querySelector(".popup");
  if (popup) {
    popup.remove();
  }
}

// Call the function to display attendance information when the page loads
window.onload = displayAttendance;
