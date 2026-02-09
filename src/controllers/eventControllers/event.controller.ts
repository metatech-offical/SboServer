import { Request, Response } from "express";
import { Types } from "mongoose";
import * as EventService from "../../services/eventService/event.service";
import {
  ErrorResponse,
  printError,
  SuccessResponse,
  UnauthorizedErrorResponse,
} from "../../utils/responseHandler";
import { STATUS_CODES } from "../../constants/statusCodes";
import { EVENT_MESSAGES } from "../../constants/responseMessage";

export const httpCreateEvent = async (req: Request, res: Response) => {
  try {
    const {
      eventCoverImageUrl,
      eventName,
      eventDateTime,
      eventPublishOnDate,
      eventDescription,
      eventLocation,
      eventCategory,
      eventArenaImageUrl,
      eventCurrencyType,
      eventLimitPerUser,
      tickets,
    } = req.body;

    const creatorId = req.user?._id;

    if (!creatorId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    const result = await EventService.createEvent(
      {
        creatorId,
        eventCoverImageUrl,
        eventName,
        eventDateTime: new Date(eventDateTime),
        eventPublishOnDate: new Date(eventPublishOnDate),
        eventDescription,
        eventLocation,
        eventCategory,
        eventArenaImageUrl,
        eventCurrencyType: eventCurrencyType || "USD",
        eventLimitPerUser: eventLimitPerUser ?? 5,
      },
      tickets
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpCreateEvent");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetAllEvents = async (req: Request, res: Response) => {
  try {
    const { search, category, status, timeFilter, date, city, page, limit } = req.query;

    const result = await EventService.getAllEvents({
      search: search as string,
      category: category as string,
      status: status as any,
      timeFilter: timeFilter as "live" | "upcoming" | "past" | undefined,
      date: date as string,
      city: city as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetAllEvents");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetEventById = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!Types.ObjectId.isValid(eventId)) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        "Invalid event ID"
      );
    }

    const result = await EventService.getEventById(
      new Types.ObjectId(eventId)
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetEventById");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetEventsByCreator = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    const { search, category, status, timeFilter, date, city, page, limit } = req.query;

    if (!Types.ObjectId.isValid(creatorId)) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        "Invalid creator ID"
      );
    }

    const result = await EventService.getEventsByCreator(
      new Types.ObjectId(creatorId),
      {
        search: search as string,
        category: category as string,
        status: status as any,
        timeFilter: timeFilter as "live" | "upcoming" | "past" | undefined,
        date: date as string,
        city: city as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      }
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetEventsByCreator");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpUpdateEvent = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const creatorId = req.user?._id;

    if (!creatorId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    if (!Types.ObjectId.isValid(eventId)) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        "Invalid event ID"
      );
    }

    const updateData: any = { ...req.body };

    // Convert date strings to Date objects if provided
    if (updateData.eventDateTime) {
      updateData.eventDateTime = new Date(updateData.eventDateTime);
    }
    if (updateData.eventPublishOnDate) {
      updateData.eventPublishOnDate = new Date(updateData.eventPublishOnDate);
    }

    const result = await EventService.updateEvent(
      new Types.ObjectId(eventId),
      creatorId,
      updateData
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpUpdateEvent");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR
    );
  }
};
