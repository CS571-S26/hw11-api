
import { DataTypes, Sequelize, ModelStatic } from "sequelize";
import { CS571Config } from "@cs571/api-framework";
import HW11PublicConfig from "../model/configs/hw11-public-config";
import HW11SecretConfig from "../model/configs/hw11-secret-config";

import OpenAIMessageLog from "../model/openai-message-log";
import OpenAIMessage from "../model/openai-message";

export class CS571HW11DbConnector {

    private badgerLogsTable!: ModelStatic<any>;

    private readonly sequelize: Sequelize;
    private readonly config: CS571Config<HW11PublicConfig, HW11SecretConfig>;

    public constructor(config: CS571Config<HW11PublicConfig, HW11SecretConfig>) {
        this.config = config;
        if (this.config.PUBLIC_CONFIG.IS_REMOTELY_HOSTED) {
            this.sequelize = new Sequelize(
                this.config.SECRET_CONFIG.SQL_CONN_DB,
                this.config.SECRET_CONFIG.SQL_CONN_USER,
                this.config.SECRET_CONFIG.SQL_CONN_PASS,
                {
                    host: this.config.SECRET_CONFIG.SQL_CONN_ADDR,
                    port: this.config.SECRET_CONFIG.SQL_CONN_PORT,
                    dialect: 'mysql',
                    retry: {
                        max: Infinity,
                        backoffBase: 5000
                    }
                }
            );
        } else {
            this.sequelize = undefined as any;
        }

    }

    public async init() {
        if (this.config.PUBLIC_CONFIG.IS_REMOTELY_HOSTED) {
            await this.sequelize.authenticate();
            this.badgerLogsTable = this.sequelize.define("BadgerLog", {
                id: {
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                    unique: true,
                    allowNull: false
                },
                badger_id: {
                    type: DataTypes.STRING(128),
                    allowNull: false
                },
                msg: {
                    type: DataTypes.TEXT('medium'),
                    allowNull: false
                },
                created: {
                    type: DataTypes.DATE,
                    allowNull: false
                }
            });
            await this.sequelize.sync();
        }
    }

    public async log(log: OpenAIMessageLog): Promise<void> {
        if (this.config.PUBLIC_CONFIG.IS_REMOTELY_HOSTED) {
            await this.badgerLogsTable.create({
                msg: log.msgs.reduce((acc: string, m: OpenAIMessage) => `${acc}\n${m.role}: ${m.content}`, ""),
                badger_id: log.bid,
                created: new Date()
            });
        }

        return;
    }
}