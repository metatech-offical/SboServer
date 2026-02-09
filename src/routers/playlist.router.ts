import { Router } from "express";
import authenticate from "../middlewares/authenticate";
import { PlaylistController } from "../controllers";
import { validator } from "../middlewares/validator";
import {
  addItemToPlaylistSchema,
  createPlaylistSchema,
  deletePlaylistSchema,
  getAllPlaylistsForUserSchema,
  getPlaylistByIdSchema,
  removeItemFromPlaylistSchema,
  updatePlaylistSchema,
} from "../validators/playlist.validator";

const playlistRouter = Router();
playlistRouter.use(authenticate);

playlistRouter.post(
  "/create",
  validator.body(createPlaylistSchema.body),
  PlaylistController.httpCreatePlaylist
);

playlistRouter.get(
  "/",
  validator.query(getAllPlaylistsForUserSchema.query),
  PlaylistController.httpGetPlaylists
);

playlistRouter.get(
  "/:id",
  validator.params(getPlaylistByIdSchema.params),
  PlaylistController.httpGetPlaylistById
);

playlistRouter.post(
  "/:id/add",
  validator.params(addItemToPlaylistSchema.params),
  validator.body(addItemToPlaylistSchema.body),
  PlaylistController.httpAddItemToPlaylist
);

playlistRouter.delete(
  "/:id/remove",
  validator.params(removeItemFromPlaylistSchema.params),
  validator.body(removeItemFromPlaylistSchema.body),
  PlaylistController.httpRemoveItemFromPlaylist
);

playlistRouter.delete(
  "/:id",
  validator.params(deletePlaylistSchema.params),
  PlaylistController.httpDeletePlaylist
);

playlistRouter.put(
  "/:id",
  validator.params(updatePlaylistSchema.params),
  validator.body(updatePlaylistSchema.body),
  PlaylistController.httpUpdatePlaylist
);

export default playlistRouter;
