import { ImageSegmenter, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision";
// import { bodySegmentation  } from "https://cdn.jsdelivr.net/npm/@tensorflow-models/body-segmentation";
// Get DOM elements
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");
const webcamPredictions = document.getElementById("webcamPredictions");
const demosSection = document.getElementById("demos");
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";
let runningMode = "LIVE_STREAM";
const resultWidthHeigth = 256;
let imageSegmenter;
let labels;
const legendColors = [
  [255, 197, 0, 255],
  [128, 62, 117, 255],
  [255, 104, 0, 255],
  [166, 189, 215, 255],
  [193, 0, 32, 255],
  [206, 162, 98, 255],
  [129, 112, 102, 255],
  [0, 125, 52, 255],
  [246, 118, 142, 255],
  [0, 83, 138, 255],
  [255, 112, 92, 255],
  [83, 55, 112, 255],
  [255, 142, 0, 255],
  [179, 40, 81, 255],
  [244, 200, 0, 255],
  [127, 24, 13, 255],
  [147, 170, 0, 255],
  [89, 51, 21, 255],
  [241, 58, 19, 255],
  [35, 44, 22, 255],
  [0, 161, 194, 255], // Vivid Blue
];


//init segmentation function
const createImageSegmenter = async () => {
  const audio = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
  imageSegmenter = await ImageSegmenter.createFromOptions(audio, {
    baseOptions: {
      // modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite",
      // modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite", 
      // modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite",
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",//so far this one was the most accurate
      // modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/latest/deeplab_v3.tflite",
      delegate: "GPU",
    },
    runningMode: runningMode,
    outputCategoryMask: true,
    outputConfidenceMasks: false,

  });
  labels = imageSegmenter.getLabels();
};
createImageSegmenter();

function callbackForVideo(result) {
  let imageData = canvasCtx.getImageData(0, 0, video.videoWidth, video.videoHeight).data;
  const mask = result.categoryMask.getAsFloat32Array();
  let j = 0;

  //testings
  for (let i = 0; i < mask.length; ++i) {
    const maskVal = Math.round(mask[i] * 255.0);
    const legendColor = legendColors[maskVal % legendColors.length];
    imageData[j] = (legendColor[0] + imageData[j]) / 2;
    imageData[j + 1] = (legendColor[1] + imageData[j + 1]) / 2;
    // imageData[j + 2] = (legendColor[2] + imageData[j + 2]) / 2;
    // imageData[j + 3] = (legendColor[3] + imageData[j + 3]) / 2;
    j += 4;
  }

  // //debugging
  // for (let i = 0; i < mask.length; ++i) {
  //   const maskVal = Math.round(mask[i] * 255.0);
  //   const legendColor = legendColors[maskVal % legendColors.length];
  //   imageData[j] = (legendColor[0] + imageData[j]) / 2;
  //   imageData[j + 1] = (legendColor[1] + imageData[j + 1]) / 2;
  //   imageData[j + 2] = (legendColor[2] + imageData[j + 2]) / 2;
  //   imageData[j + 3] = (legendColor[3] + imageData[j + 3]) / 2;
  //   j += 4;
  // }

  const uint8Array = new Uint8ClampedArray(imageData.buffer);
  const dataNew = new ImageData(uint8Array, video.videoWidth, video.videoHeight);
  canvasCtx.putImageData(dataNew, 0, 0);
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}
/********************************************************************
// WEBCAM
********************************************************************/
// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
// Get segmentation from the webcam
let lastWebcamTime = -1;
async function predictWebcam() {
  if (video.currentTime === lastWebcamTime) {
    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
    return;
  }
  lastWebcamTime = video.currentTime;
  canvasCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
  // canvasCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
  // Do not segmented if imageSegmenter hasn't loaded
  if (imageSegmenter === undefined) {
    return;
  }
  // if image mode is initialized, create a new segmented with video runningMode
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await imageSegmenter.setOptions({
      runningMode: runningMode,
    });
  }
  let startTimeMs = performance.now();
  // Start segmenting the stream.
  imageSegmenter.segmentForVideo(video, startTimeMs, callbackForVideo);
}

// Enable the live webcam view and start imageSegmentation.
async function enableCam(event) {
  if (imageSegmenter === undefined) {
    return;
  }
  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "ENABLE SEGMENTATION";
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "DISABLE SEGMENTATION";
  }
  // getUsermedia parameters.
  const constraints = {
    video: true,
  };
  // Activate the webcam stream.
  video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
  video.addEventListener("loadeddata", predictWebcam);
}
// If webcam supported, add event listener to button.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}
