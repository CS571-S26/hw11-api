import { CS571DefaultPublicConfig } from "@cs571/api-framework";

export default interface HW11PublicConfig extends CS571DefaultPublicConfig {
    IS_REMOTELY_HOSTED: boolean;
    MAX_INPUT_LENGTH: number;
}