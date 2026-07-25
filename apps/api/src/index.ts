import express from "express";
import cors from "cors";
import { env } from "./env";
import { healthRouter } from "./routes/health";
import { monitorsRouter } from "./routes/monitors";
import { reportsRouter } from "./routes/reports";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api", monitorsRouter);
app.use("/api", reportsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
