const video = document.getElementById("video");
const captureButton = document.getElementById("captureButton");
let labeledFaceDescriptors; // Define variable to store labeled face descriptors

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

  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
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
      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: result.toString(),
        });
        drawBox.draw(canvas);

        // Draw name and date/time on the live preview
        const bestMatch = faceMatcher.findBestMatch(
          resizedDetections[i].descriptor
        );
        const matchedLabel = bestMatch.label;
        const dateTimeString = new Date().toLocaleString();

        const labelX = box.x;
        const labelY = box.y + box.height + 20;

        canvas.getContext("2d").fillStyle = "white";
        canvas.getContext("2d").font = "16px Arial";
        canvas
          .getContext("2d")
          .fillText(`Name: ${matchedLabel}`, labelX, labelY);
        canvas
          .getContext("2d")
          .fillText(`Date and Time: ${dateTimeString}`, labelX, labelY + 20);
      });
    }, 100); // Adjust interval as needed
  });

  // Event listener for capture button
  captureButton.addEventListener("click", async () => {
    const captureCanvas = document.createElement("canvas");
    const ctx = captureCanvas.getContext("2d");
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    // Draw face border, name, and date/time on the captured image
    const detections = await faceapi
      .detectAllFaces(captureCanvas)
      .withFaceLandmarks()
      .withFaceDescriptors();
    detections.forEach((detection) => {
      const box = detection.detection.box;
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
      const matchedLabel = bestMatch.label;
      const dateTimeString = new Date().toLocaleString();

      // Draw face border
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw name and date/time
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.fillText(`Name: ${matchedLabel}`, box.x, box.y + box.height + 20);
      ctx.fillText(
        `Date and Time: ${dateTimeString}`,
        box.x,
        box.y + box.height + 40
      );

      // Create a text document with the person's name and the date and time
      const fileContent = `Name: ${matchedLabel}\nDate and Time: ${dateTimeString}`;
      saveTextToFile(
        fileContent,
        `D:\\Models\\${matchedLabel}\\${dateTimeString}.txt`
      );
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
  });
}

function loadLabeledImages() {
  const labels = ["Parker", "Sehaj", "Shubh"];
  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 2; i++) {
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
