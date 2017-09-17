import { Logger, transports } from "winston";

const logger = new Logger({
    level: "silly",
    transports: [
        new (transports.Console)({
            colorize: true,
            timestamp: true,
        }),
    ],
});

export { logger };
