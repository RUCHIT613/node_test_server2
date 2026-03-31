const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Mega = require("megajs");

const app = express();
const upload = multer({ dest: "uploads/" });

// 🔐 MEGA credentials
const email = "ruchit.patil0256@gmail.com";
const password = "JJJungbareum5";

// ==============================
// ✅ MEGA LOGIN
// ==============================
const storage = Mega({
    email,
    password,
    keepalive: true
});

let isReady = false;

// 🔥 In-memory cache
const uploadedFiles = {};

storage.on("ready", () => {
    console.log("✅ Logged into MEGA");
    isReady = true;
});

storage.on("error", (err) => {
    console.error("❌ MEGA error:", err);
});

// ==============================
// ✅ TEST ROUTE
// ==============================
app.get("/", (req, res) => {
    res.send("🚀 Server running");
});

// ==============================
// 📤 UPLOAD ROUTE
// ==============================
app.post("/upload", upload.single("file"), (req, res) => {

    if (!isReady) {
        return res.status(500).json({ error: "MEGA not ready" });
    }

    const filePath = req.file.path;
    let fileName = req.file.originalname;

    console.log("📤 Received:", fileName);

    // 🔥 Ensure extension exists
    if (!path.extname(fileName)) {
        fileName = "file_" + Date.now();
    }

    const fileStream = fs.createReadStream(filePath);

    const uploadStream = storage.upload({
        name: fileName,
        size: fs.statSync(filePath).size
    });

    fileStream.pipe(uploadStream);

    uploadStream.on("complete", (file) => {

        console.log("✅ Uploaded to MEGA:", file.name);

        const fileId = Date.now().toString();

        // 🔥 Store in memory
        uploadedFiles[fileId] = file;

        // delete temp file
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            fileId: fileId,
            fileName: file.name
        });
    });

    uploadStream.on("error", (err) => {
        console.error("❌ Upload error:", err);
        res.status(500).json({ error: err.message });
    });
});

// ==============================
// ⬇️ DOWNLOAD ROUTE (SMART)
// ==============================
app.get("/download/:fileId/:fileName", async (req, res) => {

    const { fileId, fileName } = req.params;

    let file = uploadedFiles[fileId];

    try {
        // ==============================
        // 🔥 STEP 1: Check memory
        // ==============================
        if (file) {
            console.log("⚡ Found in memory:", file.name);
        } else {
            console.log("🔍 Not in memory, searching MEGA...");

            const files = storage.root.children;

            file = files.find(f => f.name === fileName);

            if (!file) {
                return res.status(404).json({ error: "File not found in MEGA" });
            }

            console.log("✅ Found in MEGA:", file.name);

            // 🔥 Cache again
            uploadedFiles[fileId] = file;
        }

        // ==============================
        // ⬇️ STREAM FILE
        // ==============================
        const stream = file.download();

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${file.name}"`
        );

        res.setHeader("Content-Type", "application/octet-stream");

        stream.pipe(res);

    } catch (err) {
        console.error("❌ Download error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ==============================
// 🚀 START SERVER
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Running on port " + PORT);
});
