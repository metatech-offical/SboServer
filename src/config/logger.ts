import winston from "winston";
import { StreamOptions } from "morgan";

const { combine, timestamp, printf, colorize } = winston.format;

const customFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: "info",
  format: combine(colorize(), timestamp(), customFormat),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

export const morganStream: StreamOptions = {
  write: (message) => logger.info(message.trim()),
};

export default logger;
