// const express = require("express");
// const multer = require("multer");
// const fs = require("fs");
// const path = require("path");
// const Mega = require("megajs");

// const app = express();
// const upload = multer({ dest: "uploads/" });

// // 🔐 MEGA credentials
// const email = "ruchit.patil0256@gmail.com";
// const password = "JJungbareum5";

// // ==============================
// // ✅ MEGA LOGIN (ONCE)
// // ==============================
// const storage = Mega({
//     email,
//     password,
//     keepalive: true
// });

// let isReady = false;

// // 🔥 TEMP STORE (fileId → MEGA file)
// const uploadedFiles = {};

// storage.on("ready", () => {
//     console.log("✅ Logged into MEGA");
//     isReady = true;
// });

// storage.on("error", (err) => {
//     console.error("❌ MEGA error:", err);
// });

// // ==============================
// // ✅ TEST
// // ==============================
// app.get("/", (req, res) => {
//     res.send("🚀 Server running");
// });

// // ==============================
// // 📤 UPLOAD ROUTE
// // ==============================
// app.post("/upload", upload.single("file"), (req, res) => {

//     if (!isReady) {
//         return res.status(500).json({ error: "MEGA not ready" });
//     }

//     const filePath = req.file.path;
//     let fileName = req.file.originalname;

//     console.log("📤 Received:", fileName);

//     // 🔥 Fix filename if no extension
//     if (!path.extname(fileName)) {
//         fileName = "upload_" + Date.now() + ".mp3";
//     }

//     const fileStream = fs.createReadStream(filePath);

//     const uploadStream = storage.upload({
//         name: fileName,
//         size: fs.statSync(filePath).size
//     });

//     fileStream.pipe(uploadStream);

//     uploadStream.on("complete", (file) => {

//         console.log("✅ Uploaded:", file.name);

//         // 🔥 Store reference
//         const fileId = Date.now().toString();
//         uploadedFiles[fileId] = file;

//         // delete temp file
//         fs.unlinkSync(filePath);

//         res.json({
//             success: true,
//             fileId: fileId
//         });
//     });

//     uploadStream.on("error", (err) => {
//         console.error("❌ Upload error:", err);
//         res.status(500).json({ error: err.message });
//     });
// });

// // ==============================
// // ⬇️ DOWNLOAD ROUTE (MAIN FIX)
// // ==============================
// app.get("/download/:fileId", (req, res) => {

//     const fileId = req.params.fileId;
//     const file = uploadedFiles[fileId];

//     if (!file) {
//         return res.status(404).json({ error: "File not found" });
//     }

//     console.log("⬇️ Download:", file.name);

//     try {
//         const stream = file.download();

//         // 🔥 Headers (VERY IMPORTANT)
//         res.setHeader(
//             "Content-Disposition",
//             `attachment; filename="${file.name}"`
//         );

//         res.setHeader("Content-Type", "application/octet-stream");

//         // ✅ Stream file
//         stream.pipe(res);

//     } catch (err) {
//         console.error("❌ Download error:", err);
//         res.status(500).json({ error: err.message });
//     }
// });

// // ==============================
// // 🚀 START SERVER
// // ==============================
// // app.listen(3000, () => {
// //     console.log("🚀 Running on http://localhost:3000");
// // });
// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//     console.log("🚀 Running on port " + PORT);
// });
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

// 🔥 Store uploaded file references
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
// 📤 UPLOAD ROUTE (ALL FILE TYPES)
// ==============================
app.post("/upload", upload.single("file"), (req, res) => {

    if (!isReady) {
        return res.status(500).json({ error: "MEGA not ready" });
    }

    const filePath = req.file.path;
    let fileName = req.file.originalname;

    console.log("📤 Received:", fileName);

    // 🔥 Fix filename if missing extension
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

        // 🔥 Generate fileId
        const fileId = Date.now().toString();

        // 🔥 Store MEGA file object
        uploadedFiles[fileId] = file;

        // delete temp file
        fs.unlinkSync(filePath);

        // ✅ Send BOTH fileId + fileName
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
// ⬇️ DOWNLOAD ROUTE (ALL FILE TYPES)
// ==============================
app.get("/download/:fileId", (req, res) => {

    const fileId = req.params.fileId;
    const file = uploadedFiles[fileId];

    if (!file) {
        return res.status(404).json({ error: "File not found" });
    }

    console.log("⬇️ Download:", file.name);

    try {
        const stream = file.download();

        // 🔥 Set proper headers
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${file.name}"`
        );

        res.setHeader("Content-Type", "application/octet-stream");

        // ✅ Stream file
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
