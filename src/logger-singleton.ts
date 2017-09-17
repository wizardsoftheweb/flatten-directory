import { Logger, transports } from "winston";

const logger = new Logger({
    level: "silly",
    transports: [
        new (transports.Console)({
            colorize: true,
            name: "baseLogger",
            timestamp: true,
        }),
    ],
});

export { logger };
