import * as winston from "winston";

export const DEFAULT_LOG_LEVEL = "silly";
export const DEFAULT_CONSOLE_TRANSPORT_NAME = "baseLogger";

export const logger = new winston.Logger({
    level: DEFAULT_LOG_LEVEL,
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            name: DEFAULT_CONSOLE_TRANSPORT_NAME,
            timestamp: true,
        }),
    ],
});
