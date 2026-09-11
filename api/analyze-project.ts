import app from "../server";

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: false,
  },
};

export default function handler(req: any, res: any) {
  // Normalize incoming URL so Express router always matches /api/analyze-project
  if (!req.url || req.url === "/" || req.url === "") {
    req.url = "/api/analyze-project";
  } else if (!req.url.startsWith("/api/analyze-project") && !req.url.startsWith("/analyze-project")) {
    req.url = "/api/analyze-project" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    };

    res.on("finish", finish);
    res.on("close", finish);
    res.on("error", finish);

    try {
      app(req, res);
    } catch (err: any) {
      console.error("[Vercel /api/analyze-project Error]:", err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Erro no servidor da Vercel ao analisar projeto: " + (err?.message || String(err)),
        });
      }
      finish();
    }
  });
}


