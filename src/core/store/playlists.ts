/** The playlists on the player, and the ways to change them and the favourites. */
import { create } from 'zustand';
import { on, emit } from '../socket';

interface PlaylistStore {
  playlists: string[];
  refresh: () => void;
  addToPlaylist: (item: any, name: string) => void;
  addQueueToPlaylist: (name: string) => void;
  removeFromPlaylist: (item: any, name: string) => void;
  deletePlaylist: (name: string) => void;
  addToFavourites: (item: any) => void;
  removeFromFavourites: (item: any) => void;
  addWebRadio: (item: any) => void;
  deleteWebRadio: (item: any) => void;
}

export const usePlaylists = create<PlaylistStore>(() => ({
  playlists: [],
  refresh: () => emit('listPlaylist'),
  addToPlaylist: (item, name) => emit('addToPlaylist', { name, uri: item.uri, service: item.service || null }),
  addQueueToPlaylist: (name) => emit('saveQueueToPlaylist', { name }),
  removeFromPlaylist: (item, name) => emit('removeFromPlaylist', { name, uri: item.uri, service: item.service || null }),
  deletePlaylist: (name) => emit('deletePlaylist', { name }),
  addToFavourites: (item) => { if (item && item.uri) { emit('addToFavourites', item); } },
  removeFromFavourites: (item) => { if (item && item.uri) { emit('removeFromFavourites', item); } },
  addWebRadio: (item) => { if (item && item.title && item.uri) { emit('addWebRadio', { name: item.title, uri: item.uri }); } },
  deleteWebRadio: (item) => { if (item && item.title) { emit('removeWebRadio', { name: item.title }); } },
}));

on('pushListPlaylist', (data: string[]) => usePlaylists.setState({ playlists: Array.isArray(data) ? data : [] }));
emit('listPlaylist');
