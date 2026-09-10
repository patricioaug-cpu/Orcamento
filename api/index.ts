import app from "../server";

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

export default app;
