import * as scrawl from "https://unpkg.com/scrawl-canvas@8.12.0";

$(document).ready(function () {
var canvasMaxWidth =  $("#canvas_container").width();
var canvasMaxHeight =  $("#canvas_container").height();

var blurAmount = 0.3;

  $("#mycanvas").attr("width", canvasMaxWidth);
  $("#mycanvas").attr("height", canvasMaxHeight);

  $("#download_image").click(function () {
    console.log("Downloading image");
    html2canvas(document.getElementById("output")).then(function (canvas) {
      document.body.appendChild(canvas);

      var dataURL = canvas.toDataURL("image/jpg");
      var downloadLink = document.createElement("a");
      downloadLink.href = dataURL;
      downloadLink.download = "canvas_image.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
    });
  });
  

  // Grab a handle to the canvas element in the DOM
  const canvas = scrawl.library.canvas.mycanvas;

  // Create some filters which we can use for the demo background
  scrawl.makeFilter({
    name: "body-blur",
    method: "gaussianBlur",
    radius: blurAmount,
  });

  // MediaPipe functionality - we'll handle everything in a raw asset object, which a Scrawl-canvas Picture entity can then use as its source
  let myAsset = scrawl.makeRawAsset({
    name: "mediapipe-model-interpreter",

    // MediaPipe gives us imageData objects which we can drawImage into the RawAsset canvas element
    userAttributes: [
      {
        key: "mask",
        defaultValue: false,
        setter: function (item) {
          item = item.segmentationMask ? item.segmentationMask : false;

          if (item) {
            this.canvasWidth = canvasMaxWidth;
            this.canvasHeight = canvasMaxHeight;
            this.mask = item;
            this.dirtyData = true;
          }
        },
      },
      // We'll use these additional attributes in the update function, below
      {
        key: "canvasWidth",
        defaultValue: 0,
        setter: () => {},
      },
      {
        key: "canvasHeight",
        defaultValue: 0,
        setter: () => {},
      },
    ],

    // Every time the MediaPipe model sends back new data, we can process it here in our RawAsset object
    updateSource: function (assetWrapper) {
      const { element, engine, canvasWidth, canvasHeight, mask } = assetWrapper;

      if (canvasWidth && canvasHeight && mask) {
        // Clear the canvas, resizing it if required
        element.width = canvasWidth;
        element.height = canvasHeight;

        engine.drawImage(mask, 0, 0, canvasWidth, canvasHeight);
      }
    },
  });

  // The forever loop function, which captures the MediaPipe model's output and passes it on to our raw asset for processing
  const perform = function (mask) {
    myAsset.set({ mask });

    // This code only runs once, when the model is up-and-running
    if (!myOutline)
      myOutline = scrawl.makePicture({
        name: "outline",
        asset: "mediapipe-model-interpreter",
        order: 0,

        width: "100%",
        height: "100%",

        copyWidth: "80%",
        copyHeight: "80%",
        copyStartX: "10%",
        copyStartY: "10%",

        filters: ["body-blur"],
      });

    myBackground.set({
      visibility: false,
    });
  };

  // Import and use livestream ... convenience handles for the media stream asset and the Scrawl-canvas entitys
  let video, model, myBackground, myOutline;

  // Capture the media stream
  scrawl
    .importMediaStream({
      name: "device-camera",
      audio: false,
    })
    .then((mycamera) => {
      video = mycamera;
      // video.source.width = "1280";
      // video.source.height = "720";

      // Take the media stream and display it in our canvas element
      myBackground = scrawl.makePicture({
        name: "background",
        asset: mycamera.name,
        order: 2,

        width: "100%",
        height: "100%",

        copyWidth: "80%",
        copyHeight: "80%",
        copyStartX: "10%",
        copyStartY: "10%",

        // globalCompositeOperation: "destination-over"
      });

      myBackground.clone({
        name: "body",
        order: 1,
        filters: [],
        globalCompositeOperation: "source-in",
      });

      // Start the MediaPipe model
      model = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });
      // console.log(`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`);
      model.setOptions({ modelSelection: 1 });
      model.onResults(perform);

   

      // Use MediaPipe's camera functionality to get updates to the forever loop
      const mediaPipeCamera = new Camera(video.source, {
        onFrame: async () => {
          await model.send({ image: video.source });
        },

        width: canvasMaxWidth,
        height: canvasMaxHeight
      });

      mediaPipeCamera.start();

      $("#mycanvas").css("width","100%");
      $("#mycanvas").css("height","100%");
    })
    .catch((e) => console.log("Media stream error", e.message));

  // Create the Scrawl-canvas Display cycle animation
  scrawl.makeRender({
    name: "demo-animation",
    target: canvas,
  });


});
