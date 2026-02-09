// controllers/playlistController.ts
import { Request, Response } from "express";
import {
  ErrorResponse,
  printError,
  SuccessResponse,
} from "../../utils/responseHandler";
import { PlaylistService } from "../../services";
import { AuthenticatedRequest } from "../../types/express";

export const httpCreatePlaylist = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const user = (req as AuthenticatedRequest).user;

    const result = await PlaylistService.createPlaylist({
      title,
      description,
      createdBy: user._id,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpCreatePlaylist");
    return ErrorResponse(res);
  }
};

export const httpDeletePlaylist = async (req: Request, res: Response) => {
  try {
    const playlistId = req.params.id;
    const user = (req as AuthenticatedRequest).user;

    const result = await PlaylistService.deletePlaylist(
      playlistId,
      String(user._id)
    );
    SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpDeletePlaylist");
    return ErrorResponse(res);
  }
};

export const httpAddItemToPlaylist = async (req: Request, res: Response) => {
  try {
    const { id: playlistId } = req.params;
    const { items } = req.body;

    const result = await PlaylistService.addItemsToPlaylist({
      playlistId,
      items,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpAddItemToPlaylist");
    return ErrorResponse(res);
  }
};

export const httpRemoveItemFromPlaylist = async (
  req: Request,
  res: Response
) => {
  try {
    const { id: playlistId } = req.params;
    const { contentId, contentType } = req.body;

    const result = await PlaylistService.removeItemFromPlaylist({
      playlistId,
      contentId,
      contentType,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpRemoveItemFromPlaylist");
    return ErrorResponse(res);
  }
};

export const httpUpdatePlaylist = async (req: Request, res: Response) => {
  try {
    const { id: playlistId } = req.params;
    const { title, description } = req.body;

    const result = await PlaylistService.updatePlaylist({
      playlistId,
      title,
      description,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpUpdatePlaylist");
    return ErrorResponse(res);
  }
};

export const httpGetPlaylistById = async (req: Request, res: Response) => {
  try {
    const { id: playlistId } = req.params;
    const user = (req as AuthenticatedRequest).user;

    const result = await PlaylistService.getPlaylistById({
      playlistId,
      userId: String(user._id),
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetPlaylistById");
    return ErrorResponse(res);
  }
};

export const httpGetPlaylists = async (req: Request, res: Response) => {
  try {
    const createdBy = req.query.createdBy as string;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = (req.query.search as string) ?? "";

    const result = await PlaylistService.getFilteredPlaylists({
      userId: createdBy,
      page,
      limit,
      search,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      { playlists: result.data?.data, pagination: result.data?.pagination }
    );
  } catch (err) {
    printError(err, "httpGetPlaylists");
    return ErrorResponse(res);
  }
};
