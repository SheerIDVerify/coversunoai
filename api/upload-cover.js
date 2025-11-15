import formidable from "formidable-serverless";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const file = files.file;
    const title = fields.title;
    const style = fields.style;
    const prompt = fields.prompt;

    // Read audio file as buffer
    const audioBuffer = fs.readFileSync(file.path);

    try {
      // 1) Upload audio ke KIE
      const uploadRes = await fetch(
        "https://api.kie.ai/api/v1/upload/audio",
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + process.env.KIE_API_KEY
          },
          body: audioBuffer
        }
      );
      const uploadJson = await uploadRes.json();

      if (!uploadJson.data || !uploadJson.data.url)
        return res.status(500).json({ error: "Upload failed", uploadJson });

      const audioUrl = uploadJson.data.url;

      // 2) Generate cover
      const generateRes = await fetch(
        "https://api.kie.ai/api/v1/generate/upload-cover",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + process.env.KIE_API_KEY
          },
          body: JSON.stringify({
            uploadUrl: audioUrl,
            customMode: true,
            instrumental: false,
            title,
            style,
            prompt,
            model: "V5"
          })
        }
      );

      const generateJson = await generateRes.json();

      return res.status(200).json({
        uploadedAudio: audioUrl,
        generateResponse: generateJson
      });

    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  }
