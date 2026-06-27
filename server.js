// server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const GITHUB_USERNAME = "Devriz1";
const REPO_NAME = "shared";

// Secure API Gateway Route to Fetch File Lists
app.get('/api/files', async (req, res) => {
    const activePath = req.query.path || '';
    const token = process.env.GITHUB_TOKEN; // Hidden Secure Environment Variable
    
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${activePath}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch repository files via backend proxy." });
    }
});

// Secure API Gateway Route to Handle Large Upload Processing
app.post('/api/upload', async (req, res) => {
    const { filename, path, content } = req.body;
    const token = process.env.GITHUB_TOKEN;

    if (!token) return res.status(500).json({ error: "Server missing deployment configuration token." });

    const targetUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path ? path + '/' + filename : filename}`;

    try {
        // Automatically check if file exists to fetch its SHA signature for safe overwriting
        let sha = null;
        const checkRes = await fetch(targetUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        if (checkRes.ok) {
            const checkData = await checkRes.json();
            sha = checkData.sha;
        }

        const bodyPayload = {
            message: `Cloud Workspace sync: automated update for ${filename}`,
            content: content
        };
        if (sha) bodyPayload.sha = sha;

        const gitRes = await fetch(targetUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyPayload)
        });

        const gitData = await gitRes.json();
        res.status(gitRes.status).json(gitData);
    } catch (err) {
        res.status(500).json({ error: "Internal transaction bridge infrastructure failure." });
    }
});

app.listen(PORT, () => console.log(`Secure core proxy live on port ${PORT}`));