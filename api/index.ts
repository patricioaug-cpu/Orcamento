import app from "../server";

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: false,
  },
};

export default function handler(req: any, res: any) {
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
      console.error("[Vercel /api/index Error]:", err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Erro interno na API: " + (err?.message || String(err)),
        });
      }
      finish();
    }
  });
}

