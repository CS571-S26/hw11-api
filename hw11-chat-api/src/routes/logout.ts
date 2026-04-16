import { Express } from 'express';

import { CS571Route } from "@cs571/api-framework/src/interfaces/route";
import { CS571HW11DbConnector } from '../services/hw11-db-connector';
import { CS571Config } from '@cs571/api-framework';
import HW11PublicConfig from '../model/configs/hw11-public-config';
import HW11SecretConfig from '../model/configs/hw11-secret-config';

export class CS571LogoutRoute implements CS571Route {

    public static readonly ROUTE_NAME: string = (process.env['CS571_BASE_PATH'] ?? "") + '/logout';

    private readonly connector: CS571HW11DbConnector;
    private readonly config: CS571Config<HW11PublicConfig, HW11SecretConfig>

    public constructor(connector: CS571HW11DbConnector, config: CS571Config<HW11PublicConfig, HW11SecretConfig>) {
        this.connector = connector;
        this.config = config;
    }

    public addRoute(app: Express): void {
        app.post(CS571LogoutRoute.ROUTE_NAME, (req, res) => {
            res.status(200).cookie(
                'badgerchat_auth',
                "goodbye",
                {
                    domain: this.config.PUBLIC_CONFIG.IS_REMOTELY_HOSTED ? this.config.PUBLIC_CONFIG.HOST : undefined,
                    sameSite: this.config.PUBLIC_CONFIG.IS_REMOTELY_HOSTED ? "none" : "lax",
                    secure: this.config.PUBLIC_CONFIG.IS_REMOTELY_HOSTED,
                    maxAge: 1,
                    partitioned: true,
                    httpOnly: true
                }
            ).send({
                msg: "You have been logged out! Goodbye."
            });
        })
    }

    public getRouteName(): string {
        return CS571LogoutRoute.ROUTE_NAME;
    }
}
