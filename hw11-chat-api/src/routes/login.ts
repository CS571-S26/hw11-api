import { Express } from 'express';

import { CS571Route } from "@cs571/api-framework/src/interfaces/route";
import { CS571HW11DbConnector } from '../services/hw11-db-connector';
import { CS571HW11TokenAgent } from '../services/hw11-token-agent';
import { CS571Config } from '@cs571/api-framework';
import HW11PublicConfig from '../model/configs/hw11-public-config';
import HW11SecretConfig from '../model/configs/hw11-secret-config';
import BadgerUser from '../model/badger-user';

export class CS571LoginRoute implements CS571Route {

    public static readonly ROUTE_NAME: string = (process.env['CS571_BASE_PATH'] ?? "") + '/login';

    private readonly connector: CS571HW11DbConnector;
    private readonly tokenAgent: CS571HW11TokenAgent;
    private readonly config: CS571Config<HW11PublicConfig, HW11SecretConfig>


    public constructor(connector: CS571HW11DbConnector, tokenAgent: CS571HW11TokenAgent, config: CS571Config<HW11PublicConfig, HW11SecretConfig>) {
        this.connector = connector;
        this.tokenAgent = tokenAgent;
        this.config = config;
    }

    public addRoute(app: Express): void {
        app.post(CS571LoginRoute.ROUTE_NAME, async (req, res) => {
            const username = req.body.username?.trim();
            const pin = req.body.pin?.trim();

            if (!username || !pin) {
                res.status(400).send({
                    msg:  "A request must contain a 'username' and 'pin'"
                });
                return;
            }

            const pers = await this.connector.findUserIfExists(username)
            
            if (!pers) {
                // bogus calculation to mirror true hash calculation
                CS571HW11DbConnector.calculateHash(new Date().getTime().toString(), pin)
                this.delayResponse(() => {
                    res.status(401).send({
                        msg: "That username or pin is incorrect!",
                    })
                });
                return;
            }

            const hash = CS571HW11DbConnector.calculateHash(pers.salt, pin)

            if (hash !== pers.pin) {
                this.delayResponse(() => {
                    res.status(401).send({
                        msg: "That username or pin is incorrect!",
                    })
                });
                return;
            }

            const cook = this.tokenAgent.generateAccessToken(new BadgerUser(pers.id, pers.username));

            res.status(200).cookie(
                'badgerchat_auth',
                cook,
                {
                    domain: this.config.PUBLIC_CONFIG.IS_REMOTELY_HOSTED ? this.config.PUBLIC_CONFIG.HOST : undefined,
                    sameSite: this.config.PUBLIC_CONFIG.IS_REMOTELY_HOSTED ? "none" : "lax",
                    secure: this.config.PUBLIC_CONFIG.IS_REMOTELY_HOSTED,
                    maxAge: 3600000,
                    partitioned: true,
                    httpOnly: true,
                }
            ).send({
                msg: "Successfully authenticated.",
                user: {
                    id: pers.id,
                    username: pers.username
                },
                eat: this.tokenAgent.getExpFromToken(cook)
            })
        })
    }

    public async delayResponse(cb: () => void): Promise<void> {
        return new Promise((resolve: any) => {
            setTimeout(() => {
                cb()
                resolve();
            }, Math.ceil(Math.random() * 100))
        })
        
    }

    public getRouteName(): string {
        return CS571LoginRoute.ROUTE_NAME;
    }
}
