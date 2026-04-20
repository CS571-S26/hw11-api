import express, { Express, Request, Response } from 'express';
import cookies from "cookie-parser";

import { CS571Initializer, CS571InitOptions } from '@cs571/api-framework'
import HW11PublicConfig from './model/configs/hw11-public-config';
import HW11SecretConfig from './model/configs/hw11-secret-config';
import { CS571HW11DbConnector } from './services/hw11-db-connector';
import { CS571AIResponsesRoute } from './routes/responses';

console.log("Welcome to HW11 AI!");

const app: Express = express();

app.use(cookies());

// https://github.com/expressjs/express/issues/5275
declare module "express-serve-static-core" {
  export interface CookieOptions {
    partitioned?: boolean;
  }
}

const appBundle = CS571Initializer.init<HW11PublicConfig, HW11SecretConfig>(app, new CS571InitOptions({
  middlewareBodyExtractor: (req: Request, res: Response) => {
    return typeof req.body === "object" ? (
      req.body.pin ?
        JSON.stringify({...req.body, pin: "[REDACTED]"}) :
        JSON.stringify(req.body)
      ) : (typeof req.body === "string" ? req.body : undefined)
  }
}));
const db = new CS571HW11DbConnector(appBundle.config);

db.init();

appBundle.router.addRoutes([
  new CS571AIResponsesRoute(db, appBundle.config.PUBLIC_CONFIG, appBundle.config.SECRET_CONFIG)
])

app.listen(appBundle.config.PORT, () => {
  console.log(`Running at :${appBundle.config.PORT}`);
});
