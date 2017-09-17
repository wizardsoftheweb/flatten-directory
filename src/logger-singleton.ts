import { Logger, transports } from "winston";

export const DEFAULT_LOG_LEVEL = "silly";

export const logger = new Logger({
    level: DEFAULT_LOG_LEVEL,
    transports: [
        new (transports.Console)({
            colorize: true,
            name: "baseLogger",
            timestamp: true,
        }),
    ],
});
