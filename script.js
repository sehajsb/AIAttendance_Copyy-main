const video = document.getElementById("video");
const captureButton = document.getElementById("captureButton");
let labeledFaceDescriptors; // Define variable to store labeled face descriptors

let lastSavedTimestamps = {}; // Object to store last saved timestamps for each person and period

// Function to save face data to local storage
function saveFaceDataToLocalStorage(
  label,
  confidence,
  dateTime,
  period,
  isLate
) {
  // Retrieve existing data from local storage or initialize an empty array
  let storedData = JSON.parse(localStorage.getItem("faceData")) || [];

  // Check if the current time is in a new period for this person
  const lastSavedTimestamp =
    lastSavedTimestamps[label] && lastSavedTimestamps[label][period];
  const currentTime = new Date().getTime();
  if (!lastSavedTimestamp || currentTime - lastSavedTimestamp >= 10 * 60000) {
    // Add new face data
    storedData.push({
      label,
      confidence,
      dateTime,
      period,
      isLate, // Add the late flag
    });

    // Update last saved timestamp for this person and period
    if (!lastSavedTimestamps[label]) {
      lastSavedTimestamps[label] = {};
    }
    lastSavedTimestamps[label][period] = currentTime;

    // Save updated data to local storage
    localStorage.setItem("faceData", JSON.stringify(storedData));
  }
}

// Retrieve stored data from local storage
function getStoredFaceData() {
  return JSON.parse(localStorage.getItem("faceData")) || [];
}

Promise.all([
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
]).then(start);

async function start() {
  const container = document.createElement("div");
  container.id = "labels";
  document.body.append(container);

  // Load labeled images for training the face recognition model
  labeledFaceDescriptors = await loadLabeledImages();

  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.55);
  let canvas;

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(function (stream) {
      video.srcObject = stream;
    })
    .catch(function (err) {
      console.error("Error accessing webcam:", err);
    });

  video.addEventListener("play", async () => {
    if (canvas) canvas.remove();
    canvas = faceapi.createCanvasFromMedia(video);
    container.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video)
        .withFaceLandmarks()
        .withFaceDescriptors();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      const results = resizedDetections.map((d) =>
        faceMatcher.findBestMatch(d.descriptor)
      );
      // Define the periods
      const periods = [
        { name: "1", startTime: "08:30", endTime: "09:05" },
        { name: "2", startTime: "09:05", endTime: "09:40" },
        { name: "3", startTime: "09:40", endTime: "10:50" },
        { name: "4", startTime: "10:50", endTime: "12:00" },
        { name: "Lunch", startTime: "12:00", endTime: "13:00" },
        { name: "6", startTime: "13:00", endTime: "14:20" },
        { name: "7", startTime: "14:20", endTime: "14:55" },
        { name: "8", startTime: "14:55", endTime: "15:30" },
      ];

      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {});
        drawBox.draw(canvas);

        const bestMatch = faceMatcher.findBestMatch(
          resizedDetections[i].descriptor
        );
        const matchedLabel = bestMatch.label;
        const confidence = bestMatch.distance;
        const confidencePercentage = Math.round((1 - confidence) * 100);

        const labelX = box.x;
        const labelY = box.y + box.height + 20;

        // Get current date and time
        const currentDate = new Date();
        const dateTimeString = `${
          currentDate.getMonth() + 1
        }/${currentDate.getDate()}/${currentDate.getFullYear()} | ${currentDate.toLocaleTimeString(
          "en-US",
          { hour12: false }
        )}`;

        // Determine the current period
        let currentPeriod = "Unknown";
        let isLate = ""; // Flag to indicate if the person is late
        const currentTime = new Date().toLocaleTimeString("en-US", {
          hour12: false,
        });
        periods.forEach((period) => {
          const startTime = new Date(`2000-01-01T${period.startTime}`);
          const endTime = new Date(`2000-01-01T${period.endTime}`);
          const currentTimeFormatted = new Date(`2000-01-01T${currentTime}`);
          if (
            currentTimeFormatted >= startTime &&
            currentTimeFormatted <= endTime
          ) {
            currentPeriod = period.name;
            // Check if the person is late (more than 10 minutes past the start time)
            const lateTime = new Date(startTime.getTime() + 10 * 60000); // Add 10 minutes to start time
            if (currentTimeFormatted > lateTime) {
              isLate = "";
              const lateMinutes = Math.round(
                (currentTimeFormatted - lateTime) / 60000
              ); // Calculate late minutes
              isLate = `Late (${lateMinutes}m)`;
            }
          }
        });

        canvas.getContext("2d").fillStyle = "white";
        canvas.getContext("2d").font = "bold 12px Segoe UI";
        canvas
          .getContext("2d")
          .fillText(
            `${matchedLabel} | ${confidencePercentage}% `,
            labelX,
            labelY
          );

        canvas
          .getContext("2d")
          .fillText(`${dateTimeString}`, labelX, labelY + 20);
        canvas
          .getContext("2d")
          .fillText(`Period: ${currentPeriod}`, labelX, labelY + 40);

        // Only save if matchedLabel is defined
        if (matchedLabel) {
          // Save the detected data to local storage
          saveFaceDataToLocalStorage(
            matchedLabel,
            confidencePercentage,
            dateTimeString,
            currentPeriod,
            isLate // Save the late flag
          );
        }
      });
    }, 300); // Adjust interval as needed
  });

  // Event listener for capture button
  captureButton.addEventListener("click", async () => {
    const captureCanvas = document.createElement("canvas");
    const ctx = captureCanvas.getContext("2d");
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    // Draw face border, name, percentage, and date/time on the captured image
    const detections = await faceapi
      .detectAllFaces(captureCanvas)
      .withFaceLandmarks()
      .withFaceDescriptors();
    detections.forEach((detection) => {
      const box = detection.detection.box;
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
      const matchedLabel = bestMatch.label;
      const confidence = bestMatch.distance; // Confidence is the distance between descriptors
      const confidencePercentage = (1 - confidence) * 100; // Convert confidence to percentage
      const dateTimeString = new Date().toLocaleString();

      // Draw face border
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw name, confidence percentage, and date/time
      ctx.fillStyle = "white";
      ctx.font = "16px Segoe UI";
      ctx.fillText(`${matchedLabel}`, box.x, box.y + box.height + 20);
      ctx.fillText(
        `Confidence: ${confidencePercentage.toFixed(2)}%`,
        box.x,
        box.y + box.height + 40
      );
      ctx.fillText(`${dateTimeString}`, box.x, box.y + box.height + 60);
    });

    // Convert the canvas to data URL
    const capturedImage = captureCanvas.toDataURL("image/png");

    // Create an anchor element to download the image
    const downloadLink = document.createElement("a");
    downloadLink.href = capturedImage;
    downloadLink.download = "captured_image.png"; // Set the filename for the downloaded image

    // Simulate a click on the anchor element to trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Retrieve stored face data
    const storedData = getStoredFaceData();
    storedData.forEach((data) => {
      console.log(
        `Label: ${data.label}, Confidence: ${data.confidence}, Date/Time: ${data.dateTime}, Period: ${data.period}`
      );
    });
  });
}

const express = require("express");
const mysql = require("mysql");
const { CloudSQL } = require("@google-cloud/sql");

const app = express();

// Create a Cloud SQL client
const sqlClient = new CloudSQL({
  connectionLimit: 10,
  user: "Parker",
  password: "2008",
  database: "Attendance_School",
  socketPath: "dynamic-camp-415217:us-central1:attendai", // Replace with your Cloud SQL instance connection name
});

// API endpoint to insert face data into the database
app.post("/api/face-data", async (req, res) => {
  // Parse request body to extract face data
  const { label, confidence, dateTime } = req.body;

  try {
    // Insert face data into the database
    await sqlClient.query(
      "INSERT INTO face_data (label, confidence, dateTime) VALUES (?, ?, ?)",
      [label, confidence, dateTime]
    );
    res.status(200).json({ message: "Face data inserted successfully" });
  } catch (error) {
    console.error("Error inserting face data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Other API endpoints for CRUD operations

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

function loadLabeledImages() {
  const labels = ["Parker", "Sehaj"];
  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 4; i++) {
        const img = await faceapi.fetchImage(
          `https://raw.githubusercontent.com/sehajsb/AIAttendance_Copyy-main/master/labeled_images/${label}/${i}.jpg`
        );
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        descriptions.push(detections.descriptor);
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

async function saveTextToFile(content, filePath) {
  try {
    // Request access to the file system
    const fileHandle = await window.showSaveFilePicker();

    // Create a writable stream
    const writableStream = await fileHandle.createWritable();

    // Write content to the file
    await writableStream.write(content);

    // Close the file
    await writableStream.close();
  } catch (err) {
    console.error("Error saving text to file:", err);
  }
}
