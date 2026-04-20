
import { DataTypes, Sequelize, ModelStatic } from "sequelize";
import { CS571Config } from "@cs571/api-framework";
import HW11PublicConfig from "../model/configs/hw11-public-config";
import HW11SecretConfig from "../model/configs/hw11-secret-config";
import { BadgerUserRegistration } from "../model/badger-user-registration";
import BadgerUser from "../model/badger-user";

import crypto from 'crypto'
import BadgerMessageCreation from "../model/badger-message-creation";
import BadgerMessage from "../model/badger-message";

export class CS571HW11DbConnector {

    private badgerMessagesTable!: ModelStatic<any>;
    private badgerUsersTable!: ModelStatic<any>;

    private readonly sequelize: Sequelize
    private readonly config: CS571Config<HW11PublicConfig, HW11SecretConfig>;

    public constructor(config: CS571Config<HW11PublicConfig, HW11SecretConfig>) {
        this.config = config;
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
    }

    public async init() {
        await this.sequelize.authenticate();
        this.badgerUsersTable = await this.sequelize.define("BadgerUser", {
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
            salt: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            username: {
                type: DataTypes.STRING(64),
                allowNull: false
            },
            pin: {
                type: DataTypes.STRING(64),
                allowNull: false
            },
            created: {
                type: DataTypes.DATE,
                allowNull: false
            }
        });
        await this.sequelize.sync()
        this.badgerMessagesTable = await this.sequelize.define("BadgerMessage", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                unique: true,
                allowNull: false
            },
            poster: {
                type: DataTypes.STRING(64),
                allowNull: false
            },
            badger_id: {
                type: DataTypes.STRING(128),
                allowNull: false
            },
            title: {
                type: DataTypes.STRING(128),
                allowNull: false
            },
            content: {
                type: DataTypes.STRING(1024),
                allowNull: false
            },
            chatroom: {
                type: DataTypes.STRING(128),
                allowNull: false
            },
            created: {
                type: DataTypes.DATE,
                allowNull: false
            }
        });
        await this.sequelize.sync()
    }

    public async getMessage(id: number): Promise<BadgerMessage | undefined> {
        const post = await this.badgerMessagesTable.findOne({ where: { id } });
        return post ? new BadgerMessage(post.id, post.poster, post.title, post.content, post.chatroom, post.created) : undefined;
    }

    public async deleteMessage(id: number): Promise<BadgerMessage | undefined> {
        const post = await this.badgerMessagesTable.findOne({ where: { id } });
        await this.badgerMessagesTable.destroy({ where: { id } })
        return post ? new BadgerMessage(post.id, post.poster, post.title, post.content, post.chatroom, post.created) : undefined;
    }

    public async createMessage(msg: BadgerMessageCreation): Promise<BadgerMessage> {
        const creation = await this.badgerMessagesTable.create({
            poster: msg.poster,
            badger_id: msg.bid,
            title: msg.title,
            content: msg.content,
            chatroom: msg.chatroom,
            created: new Date()
        });

        return new BadgerMessage(creation.id, creation.poster, creation.title, creation.content, creation.chatroom, creation.created);
    }

    public async getMessages(chatroom?: string): Promise<BadgerMessage[]> {
        const tabMsgs = await this.badgerMessagesTable.findAll({
            limit: 10,
            where: chatroom ? { chatroom } : undefined,
            order: [['created', 'DESC']]
        });
        return tabMsgs.map(tabMsg => new BadgerMessage(tabMsg.id, tabMsg.poster, tabMsg.title, tabMsg.content, tabMsg.chatroom, tabMsg.created))
    }

    public async findUserIfExists(username: string): Promise<any | undefined> {
        const pers = await this.badgerUsersTable.findOne({ where: { username } });
        return pers ?? undefined;
    }

    public async createBadgerUser(user: BadgerUserRegistration): Promise<BadgerUser> {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = CS571HW11DbConnector.calculateHash(salt, user.pin);

        const creation = await this.badgerUsersTable.create({
            username: user.username,
            pin: hash,
            badger_id: user.bid,
            salt: salt,
            created: new Date()
        });

        return new BadgerUser(creation.id, creation.username);
    }

    public static calculateHash(salt: string, pass: string) {
        return crypto.createHmac('sha256', salt).update(pass).digest('hex');
    }
}