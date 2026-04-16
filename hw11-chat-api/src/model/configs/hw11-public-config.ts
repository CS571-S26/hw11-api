import { CS571DefaultPublicConfig } from "@cs571/api-framework";

export default interface HW11PublicConfig extends CS571DefaultPublicConfig {
    IS_REMOTELY_HOSTED: boolean;
    PASSWORDS_LOC: string;
    HOST: string;
}