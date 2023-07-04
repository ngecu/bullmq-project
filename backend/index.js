const path = require("path");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const { Queue, Worker, QueueEvents } = require("bullmq");
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const ffmpeg = require("fluent-ffmpeg");
const crypto = require("crypto");

const audioProcess = async (job) => {
  console.log("Processing job:", job.id);
  const { image } = job.data;

  const videoFilePath = path.join(__dirname, "public", "videos", encodeURIComponent(image.name));

  // const randomString = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();
  const fileName = image.name.split(".")[0]; // Remove the file extension
  const newFileName = `audio_${fileName}_${timestamp}.mp3`; // Rename the file
  // const audioFileName = `audio_${encodeURIComponent(image.name)}.mp3`;
  const audioFilePath = path.join(__dirname, "public", "audios", newFileName);

  


  const command = ffmpeg(videoFilePath)
    .toFormat("mp3")
    .save(audioFilePath)
    .on("error", (err) => {
      console.error("FFmpeg error:", err);
    })
    .on("end", () => {
      console.log("Video conversion completed");
      // Update job status to "complete"
      job.updateProgress(100);
      // job.moveToCompleted();
      // fs.unlinkSync(videoFilePath); // Remove the uploaded video file
    });

  command.run();
};

const audioJobQueue = new Queue("videoJobQueue", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
});

const worker = new Worker("videoJobQueue", async (job) => {
  try{
    await audioProcess(job);
  }
  catch(error){
    console.log(`Job ${job.id} failed with error: ${error.message}`);
  }
  
});

const queueEvents = new QueueEvents("videoJobQueue");

const serverAdapter = new ExpressAdapter();
const bullBoard = createBullBoard({
  queues: [new BullMQAdapter(audioJobQueue)],
  serverAdapter: serverAdapter,
});
serverAdapter.setBasePath("/admin");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.get("/audios/:filename", function(req, res) {
  const filename = req.params.filename;
  console.log(filename)
  const filePath = path.join(__dirname, "public", "audios", filename);
  console.log(filePath)
  res.sendFile(filePath);
});
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

app.use(express.static("public"));
app.use("/admin", serverAdapter.getRouter());

app.get("/", function (req, res) {
  res.render("form");
});

app.get("/result", (req, res) => {
  const audioDirPath = path.join(__dirname, "public", "audios");
  const audioFiles = fs.readdirSync(audioDirPath).map((audio) => {
    console.log(audio)
      return `/audios/${audio}`;
  });
  res.render("result", { audioFiles });
});

app.post("/upload", async function (req, res) {
  try {
    const { image } = req.files;
    console.log("Uploading:", image.name);
    if (!image) return res.sendStatus(400);

    const videoFilePath = path.join(__dirname, "public", "videos", encodeURIComponent(image.name));

    await image.mv(videoFilePath);

    const job = await audioJobQueue.add("audioProcess", {
      image: image,
      status: "active", // Set initial status as "active"
    });

    res.redirect("/result");
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to process video" });
  }
});


  queueEvents.on("completed", () => {
    console.log(`Job  completed`);
  });
  
  worker
    // .on("completed", (job) => {
    //   console.log(`Job ${job} completed`);
    // })
    .on("failed", (job, err) => {
      console.log(`Job ${job} failed with error: ${err.message}`);
    })
    .on("error", (err) => {
      console.log("Worker error:", err);
    })
    .on("stalled", (job) => {
      console.log(`Job ${job} stalled`);
    });




app.listen(3000, function () {
  console.log("Server running on port 3000");
});
