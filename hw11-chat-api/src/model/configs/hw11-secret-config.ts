import { CS571DefaultSecretConfig } from "@cs571/api-framework";

export default interface HW11SecretConfig extends CS571DefaultSecretConfig {
    JWT_SECRET: string;
    SQL_CONN_DB: string;
    SQL_CONN_USER: string;
    SQL_CONN_PASS: string;
    SQL_CONN_ADDR: string;
    SQL_CONN_PORT: number;
}