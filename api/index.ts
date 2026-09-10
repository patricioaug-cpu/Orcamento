import app from "../server";

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: false,
  },
};

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel /api/index Error]:", err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Erro interno na API: " + (err?.message || String(err)),
      });
    }
  }
}

