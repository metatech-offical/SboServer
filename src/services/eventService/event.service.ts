import { Types } from "mongoose";
import { Event } from "../../models/event/event.schema";
import { EventTicket } from "../../models/event/eventTicket.schema";
import { STATUS_CODES } from "../../constants/statusCodes";
import { ResultDB } from "../../utils/responseHandler";
import { EVENT_MESSAGES } from "../../constants/responseMessage";
import { IEvent, IEventTicket, EventStatus } from "../../models/event/event.types";
import { escapeRegex } from "../../utils/regex.helper";

interface CreateEventData {
  creatorId: Types.ObjectId;
  eventCoverImageUrl: string;
  eventName: string;
  eventDateTime: Date;
  eventPublishOnDate: Date;
  eventDescription: string;
  eventLocation: {
    coordinates: { lat: number; lng: number };
    zipCode: number;
    address: string;
  };
  eventCategory: string;
  eventArenaImageUrl?: string;
  eventCurrencyType: string;
  eventLimitPerUser: number;
}

interface CreateEventTicketData {
  ticketName: string;
  originalPrice: number;
  numberOfTickets: number;
}

export const createEvent = async (
  eventData: CreateEventData,
  tickets: CreateEventTicketData[]
) => {
  try {
    // Validate at least one ticket is provided
    if (!tickets || tickets.length === 0) {
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        EVENT_MESSAGES.TICKET_LIMIT_REQUIRED,
        null
      );
    }

    // Calculate lowest ticket price
    const lowestTicketPrice = Math.min(...tickets.map((ticket) => ticket.originalPrice));

    // Create the event with lowest ticket price
    const event = await Event.create({
      ...eventData,
      lowestTicketPrice,
    });

    // Create tickets associated with the event
    const ticketPromises = tickets.map((ticket) =>
      EventTicket.create({
        eventId: event._id,
        ...ticket,
      })
    );

    const createdTickets = await Promise.all(ticketPromises);

    return ResultDB(STATUS_CODES.CREATED, true, EVENT_MESSAGES.CREATED, {
      event,
      tickets: createdTickets,
    });
  } catch (err) {
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR,
      null
    );
  }
};

export const getAllEvents = async (query: {
  search?: string;
  category?: string;
  status?: EventStatus;
  timeFilter?: "live" | "upcoming" | "past";
  date?: string;
  city?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const { search, category, status, timeFilter, date, city, page = 1, limit = 10 } = query;

    const filter: any = {};
    const currentDate = new Date();

    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { eventName: { $regex: safeSearch, $options: "i" } },
        { eventDescription: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (category) {
      filter.eventCategory = category;
    }

    // Always exclude cancelled events from user-facing APIs
    if (status) {
      // If status is explicitly provided and it's not cancelled, use it
      if (status !== EventStatus.CANCELLED) {
        filter.eventStatus = status;
      } else {
        // If they explicitly request cancelled, still exclude it
        filter.eventStatus = { $ne: EventStatus.CANCELLED };
      }
    } else {
      // If no status filter, exclude cancelled events
      filter.eventStatus = { $ne: EventStatus.CANCELLED };
    }

    // Date filtering - filter events on a specific date
    if (date) {
      const searchDate = new Date(date);
      const startOfDay = new Date(searchDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(searchDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      filter.eventDateTime = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    // City filtering - search in eventLocation.address
    if (city) {
      filter["eventLocation.address"] = { $regex: city, $options: "i" };
    }

    // Time-based filtering
    if (timeFilter) {
      switch (timeFilter) {
        case "live":
          // Events that are published and haven't happened yet
          filter.eventPublishOnDate = { $lte: currentDate };
          filter.eventDateTime = { $gt: currentDate };
          break;

        case "upcoming": {
          // Events that will be published within next 30 days
          const thirtyDaysFromNow = new Date(currentDate);
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

          filter.eventPublishOnDate = {
            $gt: currentDate,
            $lte: thirtyDaysFromNow,
          };
          break;
        }

        case "past":
          // Events that already happened
          filter.eventDateTime = { $lt: currentDate };
          break;
      }
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate("creatorId", "name email")
        .sort({ eventDateTime: timeFilter === "past" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(filter),
    ]);

    return ResultDB(STATUS_CODES.OK, true, EVENT_MESSAGES.FETCHED_ALL, {
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR,
      null
    );
  }
};

export const getEventById = async (eventId: Types.ObjectId) => {
  try {
    const event = await Event.findById(eventId)
      .populate("creatorId", "name email")
      .lean();

    if (!event) {
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        EVENT_MESSAGES.NOT_FOUND,
        null
      );
    }

    // Don't return cancelled events
    if (event.eventStatus === EventStatus.CANCELLED) {
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        EVENT_MESSAGES.NOT_FOUND,
        null
      );
    }

    // Fetch associated tickets
    const tickets = await EventTicket.find({ eventId }).lean();

    return ResultDB(STATUS_CODES.OK, true, EVENT_MESSAGES.FETCHED, {
      event,
      tickets,
    });
  } catch (err) {
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR,
      null
    );
  }
};

export const getEventsByCreator = async (
  creatorId: Types.ObjectId,
  query: {
    search?: string;
    category?: string;
    status?: EventStatus;
    timeFilter?: "live" | "upcoming" | "past";
    date?: string;
    city?: string;
    page?: number;
    limit?: number;
  }
) => {
  try {
    const { search, category, status, timeFilter, date, city, page = 1, limit = 10 } = query;

    const filter: any = { creatorId };
    const currentDate = new Date();

    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { eventName: { $regex: safeSearch, $options: "i" } },
        { eventDescription: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (category) {
      filter.eventCategory = category;
    }

    // Always exclude cancelled events from creator-facing APIs
    if (status) {
      // If status is explicitly provided and it's not cancelled, use it
      if (status !== EventStatus.CANCELLED) {
        filter.eventStatus = status;
      } else {
        // If they explicitly request cancelled, still exclude it
        filter.eventStatus = { $ne: EventStatus.CANCELLED };
      }
    } else {
      // If no status filter, exclude cancelled events
      filter.eventStatus = { $ne: EventStatus.CANCELLED };
    }

    // City filtering - search in eventLocation.address
    if (city) {
      filter["eventLocation.address"] = { $regex: city, $options: "i" };
    }

    // Date filtering - filter events on a specific date (takes precedence over timeFilter for eventDateTime)
    if (date) {
      const searchDate = new Date(date);
      const startOfDay = new Date(searchDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(searchDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      filter.eventDateTime = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    // Time-based filtering (only applies if date is not provided, or for eventPublishOnDate)
    if (timeFilter && !date) {
      switch (timeFilter) {
        case "live":
          // Events that are published and haven't happened yet
          filter.eventPublishOnDate = { $lte: currentDate };
          filter.eventDateTime = { $gt: currentDate };
          break;

        case "upcoming": {
          // Events that will be published within next 30 days
          const thirtyDaysFromNow = new Date(currentDate);
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

          filter.eventPublishOnDate = {
            $gt: currentDate,
            $lte: thirtyDaysFromNow,
          };
          break;
        }

        case "past":
          // Events that already happened
          filter.eventDateTime = { $lt: currentDate };
          break;
      }
    } else if (timeFilter && date) {
      // If both date and timeFilter are provided, only apply eventPublishOnDate filter for live/upcoming
      switch (timeFilter) {
        case "live":
          filter.eventPublishOnDate = { $lte: currentDate };
          break;

        case "upcoming": {
          const thirtyDaysFromNow = new Date(currentDate);
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          filter.eventPublishOnDate = {
            $gt: currentDate,
            $lte: thirtyDaysFromNow,
          };
          break;
        }
        // For "past", we don't need to add eventPublishOnDate filter when date is specified
      }
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate("creatorId", "name email")
        .sort({ eventDateTime: timeFilter === "past" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(filter),
    ]);

    return ResultDB(STATUS_CODES.OK, true, EVENT_MESSAGES.FETCHED_ALL, {
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR,
      null
    );
  }
};

export const updateEvent = async (
  eventId: Types.ObjectId,
  creatorId: Types.ObjectId,
  updateData: Partial<IEvent>
) => {
  try {
    const event = await Event.findById(eventId);

    if (!event) {
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        EVENT_MESSAGES.NOT_FOUND,
        null
      );
    }

    // Verify the event belongs to the creator
    if (event.creatorId.toString() !== creatorId.toString()) {
      return ResultDB(
        STATUS_CODES.FORBIDDEN,
        false,
        EVENT_MESSAGES.INVALID_CREATOR,
        null
      );
    }

    // Check if event is in the past
    const currentDate = new Date();
    if (event.eventDateTime < currentDate) {
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        EVENT_MESSAGES.EVENT_PAST,
        null
      );
    }

    // If eventDateTime is changed, update status to postponed
    if (
      updateData.eventDateTime &&
      updateData.eventDateTime.getTime() !== event.eventDateTime.getTime()
    ) {
      updateData.eventStatus = EventStatus.POSTPONED;
    }

    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    return ResultDB(
      STATUS_CODES.OK,
      true,
      updateData.eventStatus === EventStatus.POSTPONED
        ? EVENT_MESSAGES.POSTPONED
        : EVENT_MESSAGES.UPDATED,
      updatedEvent
    );
  } catch (err) {
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR,
      null
    );
  }
};
