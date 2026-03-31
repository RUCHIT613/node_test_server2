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
const uploadedFiles = {};

storage.on("ready", () => {
    console.log("✅ Logged into MEGA");
    isReady = true;
});

storage.on("error", (err) => {
    console.error("❌ MEGA error:", err);
});

// ==============================
// 📁 GET OR CREATE uid/folder/
// ==============================
async function getUserFolder(uid, folderName) {

    let userFolder = storage.root.children.find(f => f.name === uid);

    if (!userFolder) {
        console.log("📁 Creating UID:", uid);

        userFolder = await new Promise((resolve, reject) => {
            storage.root.mkdir(uid, (err, folder) => {
                if (err) return reject(err);
                resolve(folder);
            });
        });
    }

    let folder = userFolder.children.find(f => f.name === folderName);

    if (!folder) {
        console.log("📁 Creating folder:", folderName);

        folder = await new Promise((resolve, reject) => {
            userFolder.mkdir(folderName, (err, newFolder) => {
                if (err) return reject(err);
                resolve(newFolder);
            });
        });
    }

    return folder;
}

// ==============================
// 📤 UPLOAD ROUTE
// ==============================
app.post("/upload", upload.single("file"), async (req, res) => {

    const uid = req.body.uid;
    const folderName = req.body.folder;

    if (!uid || !folderName) {
        return res.status(400).json({ error: "UID & folder required" });
    }

    if (!isReady) {
        return res.status(500).json({ error: "MEGA not ready" });
    }

    try {
        const folder = await getUserFolder(uid, folderName);

        const filePath = req.file.path;
        let fileName = req.file.originalname;

        console.log("📤 Upload:", fileName, "UID:", uid, "Folder:", folderName);

        if (!path.extname(fileName)) {
            fileName = Date.now() + "_" + fileName;
        }

        const fileStream = fs.createReadStream(filePath);

        const uploadStream = folder.upload({
            name: fileName,
            size: fs.statSync(filePath).size
        });

        fileStream.pipe(uploadStream);

        uploadStream.on("complete", (file) => {

            const fileId = Date.now().toString();

            console.log("🔥 NODE ID:", file.nodeId);

            uploadedFiles[fileId] = {
                file,
                uid,
                folderName,
                fileName: file.name,
                nodeId: file.nodeId
            };

            fs.unlinkSync(filePath);

            res.json({
                success: true,
                fileId,
                fileName: file.name,
                nodeId: file.nodeId   // 🔥 IMPORTANT
            });
        });

        uploadStream.on("error", (err) => {
            console.error("❌ Upload error:", err);
            res.status(500).json({ error: err.message });
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==============================
// ⬇️ DOWNLOAD ROUTE (FINAL FIX)
// ==============================
app.get("/download/:nodeId/:fileName", async (req, res) => {

    const { nodeId, fileName } = req.params;

    try {
        console.log("🔍 Download using nodeId:", nodeId);

        const file = storage.files[nodeId];

        if (!file) {
            return res.status(404).send("File not found in MEGA");
        }

        console.log("✅ File ready:", file.name, file.size);

        const stream = file.download();

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${file.name}"`
        );

        res.setHeader("Content-Type", "application/octet-stream");

        if (file.size) {
            res.setHeader("Content-Length", file.size);
        }

        stream.pipe(res);

    } catch (err) {
        console.error("❌ Download error:", err);
        res.status(500).send(err.message);
    }
});

// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Running on port " + PORT);
});
///TESTING ATTENTION PLEASE
