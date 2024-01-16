import { ImageSegmenter, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision";

// Get DOM elements
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("canvas");
// const canvasElement2 = document.getElementById("canvas2");
const canvasCtx = canvasElement.getContext("2d", { willReadFrequently: true });
// const canvasCtx2 = canvasElement2.getContext("2d", { willReadFrequently: true });
let enableWebcamButton;
let webcamRunning = false;
let runningMode = "LIVE_STREAM";
let imageSegmenter;
let labels;

$(document).ready(function () {
  $("#canvas").attr("width", $("#canvas_container").width());
  $("#canvas").attr("height", $("#canvas_container").height());
  $("#canvas2").attr("width", $("#canvas_container").width());
  $("#canvas2").attr("height", $("#canvas_container").height());


$("#download_image").click(function(){
  console.log("Downloading image");
  html2canvas(document.getElementById("output")).then(function(canvas) {
    document.body.appendChild(canvas);

    var dataURL = canvas.toDataURL("image/jpg");
    var downloadLink = document.createElement("a");
    downloadLink.href = dataURL;
    downloadLink.download = "canvas_image.png";
    document.body.appendChild(downloadLink);
    downloadLink.click();


});
});



//init segmentation function
const createImageSegmenter = async () => {
  const model = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
  imageSegmenter = await ImageSegmenter.createFromOptions(model, {
    baseOptions: {
      // modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite",
      // modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite", //runs faster and works on mobile
      // modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite", //so far this one was the most accurate
      // modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/latest/deeplab_v3.tflite",
      delegate: "GPU",
    },
    runningMode: runningMode,
    outputCategoryMask: true,
    outputConfidenceMasks: false,
    flipHorizontal: true,
  });
  labels = imageSegmenter.getLabels();
};

createImageSegmenter();

var canvasCenterPoint_x = canvasElement.width / 2;

function callbackForVideo(result) {

  let imageData = canvasCtx.getImageData(canvasCenterPoint_x - video.videoWidth / 2, 0, video.videoWidth, video.videoHeight).data;
  // const mask = result.categoryMask.getAsFloat32Array();
  // const mask_confidence = result.confidenceMasks[0].getAsFloat32Array();
  const mask_category = result.categoryMask.getAsFloat32Array();
  // console.log(result.categoryMask);
  // console.log(result.confidenceMasks);
  let j = 0;
  // console.log(mask_category[1]);

  for (let i = 0; i < mask_category.length; ++i) {
    const maskVal = Math.round(mask_category[i] * 255.0);
    // const maskVal_confidence = mask_confidence[i] < 0.001 ? 0 :Math.round(mask_category[i] * 200.0);
    // const alpha = maskVal > 0 ? 255 : 0; //if using multiclass model
    // const alpha = maskVal > 0 ? 255: 0; // for confidence value
    const alpha = maskVal > 0 ? 0 : 255; //for category value
    // const alpha = maskVal > 0 ? maskVal_confidence : 255;
    imageData[j + 3] = alpha;
    j += 4;
  }
  const uint8Array = new Uint8ClampedArray(imageData.buffer);
  const dataNew = new ImageData(uint8Array, video.videoWidth, video.videoHeight);

  //apply blur but find a way to blur just the mask
  // canvasCtx.putImageData(dataNew, video.videoWidth / 3, 0);
  // canvasCtx.putImageData(dataNew,  canvasCenterPoint_x- video.videoWidth / 2, 0);

  // blur(dataNew, 40,1)

  canvasCtx.putImageData(dataNew,  canvasCenterPoint_x- video.videoWidth / 2, 0);
  // canvasCtx.globalCompositeOperation = 'source-in';
  // canvasCtx.putImageData(dataNew,  canvasCenterPoint_x- video.videoWidth / 2, 0);


  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}


function blur(imageData, radius, quality) {
  var pixels = imageData.data;
  var width = imageData.width;
  var height = imageData.height;

  var rsum, gsum, bsum, asum, x, y, i, p, p1, p2, yp, yi, yw;
  var wm = width - 1;
  var hm = height - 1;
  var rad1x = radius + 1;
  var divx = radius + rad1x;
  var rad1y = radius + 1;
  var divy = radius + rad1y;
  var div2 = 1 / (divx * divy);

  var r = [];
  var g = [];
  var b = [];
  var a = [];

  var vmin = [];
  var vmax = [];

  while (quality-- > 0) {
      yw = yi = 0;

      for (y = 0; y < height; y++) {
          rsum = pixels[yw] * rad1x;
          gsum = pixels[yw + 1] * rad1x;
          bsum = pixels[yw + 2] * rad1x;
          asum = pixels[yw + 3] * rad1x;


          for (i = 1; i <= radius; i++) {
              p = yw + (((i > wm ? wm : i)) << 2);
              rsum += pixels[p++];
              gsum += pixels[p++];
              bsum += pixels[p++];
              asum += pixels[p]
          }

          for (x = 0; x < width; x++) {
              r[yi] = rsum;
              g[yi] = gsum;
              b[yi] = bsum;
              a[yi] = asum;

              if (y == 0) {
                  vmin[x] = Math.min(x + rad1x, wm) << 2;
                  vmax[x] = Math.max(x - radius, 0) << 2;
              }

              p1 = yw + vmin[x];
              p2 = yw + vmax[x];

              rsum += pixels[p1++] - pixels[p2++];
              gsum += pixels[p1++] - pixels[p2++];
              bsum += pixels[p1++] - pixels[p2++];
              asum += pixels[p1] - pixels[p2];

              yi++;
          }
          yw += (width << 2);
      }

      for (x = 0; x < width; x++) {
          yp = x;
          rsum = r[yp] * rad1y;
          gsum = g[yp] * rad1y;
          bsum = b[yp] * rad1y;
          asum = a[yp] * rad1y;

          for (i = 1; i <= radius; i++) {
              yp += (i > hm ? 0 : width);
              rsum += r[yp];
              gsum += g[yp];
              bsum += b[yp];
              asum += a[yp];
          }

          yi = x << 2;
          for (y = 0; y < height; y++) {
              pixels[yi] = (rsum * div2 + 0.5) | 0;
              pixels[yi + 1] = (gsum * div2 + 0.5) | 0;
              pixels[yi + 2] = (bsum * div2 + 0.5) | 0;
              pixels[yi + 3] = (asum * div2 + 0.5) | 0;

              if (x == 0) {
                  vmin[y] = Math.min(y + rad1y, hm) * width;
                  vmax[y] = Math.max(y - radius, 0) * width;
              }

              p1 = x + vmin[y];
              p2 = x + vmax[y];

              rsum += r[p1] - r[p2];
              gsum += g[p1] - g[p2];
              bsum += b[p1] - b[p2];
              asum += a[p1] - a[p2];

              yi += width << 2;
          }
      }
  }
  postMessage(imageData);
}

function imagedata_to_image(imagedata) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  canvas.width = imagedata.width;
  canvas.height = imagedata.height;
  ctx.putImageData(imagedata, 0, 0);

  var image = new Image();
  image.src = canvas.toDataURL();
  return image;
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
  canvasCtx.drawImage(video,  (canvasCenterPoint_x - video.videoWidth / 2) - 0.1 , 0, video.videoWidth, video.videoHeight);
  // canvasCtx2.drawImage(video,  (canvasCenterPoint_x - video.videoWidth / 2) - 0.1 , 0, video.videoWidth, video.videoHeight);

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








});
