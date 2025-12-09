import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Platform } from "react-native";
import {
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  StyleSheet,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
//import YoutubePlayer from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  Entypo,
  AntDesign,
  Feather,
} from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface Track {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  thumbnail?: string;
  duration?: string;
  liked?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  youtubeId?: string;
  playlistId?: string;
  thumbnail?: string;
  type: 'video' | 'playlist';
  videoCount?: number;
}

export interface PlaylistInfo {
  id: string;
  name: string;
  icon?: string;
}

type RepeatMode = 'off' | 'all' | 'one';

const PLAYLISTS: PlaylistInfo[] = [
  { id: 'vabbcz', name: '80s-00s', icon: '📻' },
  { id: 'x4kba2', name: 'All Songs', icon: '🎵' },
  { id: 'kc0h8x', name: 'Arab Music', icon: '🎼' },
  { id: 'vnp2x1', name: 'Bachata', icon: '💃' },
  { id: 'guo8k4', name: 'Billboard Hot 100 2014', icon: '🔥' },
  { id: 'p0ecak', name: 'Brazilian Funk', icon: '🇧🇷' },
  { id: '067mny', name: 'Chill', icon: '😌' },
  { id: 'xuz8k9', name: 'Christian Songs', icon: '🙏' },
  { id: '4v7mxe', name: 'Country', icon: '🤠' },
  { id: 'fme1nd', name: 'Cuban', icon: '🇨🇺' },
  { id: '4ag1m7', name: 'Indian', icon: '🇮🇳' },
  { id: '5szswp', name: 'Kompa Gouyad', icon: '🎺' },
  { id: 'po2r7q', name: 'Kpop', icon: '🇰🇷' },
  { id: '38webr', name: 'Rauw', icon: '⭐' },
  { id: 'q5owec', name: 'Records for Record Player', icon: '💿' },
  { id: 'recently-added', name: 'Recently Added', icon: '🆕' },
  { id: 'recently-played', name: 'Recently Played', icon: '🕒' },
  { id: 'reh6j6', name: 'Reggae', icon: '🌴' },
  { id: 'wk2jm9', name: 'Reggaeton', icon: '🔊' },
  { id: '9nwhdp', name: 'Rock', icon: '🎸' },
  { id: 'nfec1o', name: 'Russian', icon: '🇷🇺' },
  { id: '4m9ney', name: 'Top 100 of 2012 & 2013', icon: '📊' },
  { id: 'xro7mp', name: 'Top 100 of 2015 & 2016', icon: '📈' },
  { id: 'kwxd0x', name: 'Top 100 of 2017 & 2018', icon: '📉' },
  { id: '6cg39n', name: 'Top 100 of 2019 & 2020', icon: '📋' },
  { id: '5rqvbp', name: 'Top 100 of 2021 & 2022', icon: '🎤' },
  { id: '3dajkr', name: 'UK Drill', icon: '🇬🇧' },
];

const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const SUPABASE_URL = 'https://ugymqfwzpixzzndhrsup.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVneW1xZnd6cGl4enpuZGhyc3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1OTkyNjEsImV4cCI6MjA0OTE3NTI2MX0.DwFjYN9LX6YjZO7s_BnYzJkgn6SBsIDL3RL3vwh4U-0';

export function MusicPlayer() {
  const [playlists, setPlaylists] = useState<Map<string, Track[]>>(new Map());
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Track[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'favorites' | 'playlists' | 'search' | 'more'>('favorites');
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchPageToken, setSearchPageToken] = useState<string | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [addSongModal, setAddSongModal] = useState<{
    isOpen: boolean;
    track: Track | null;
  }>({ isOpen: false, track: null });
  const [trackOptionsModal, setTrackOptionsModal] = useState<{
    isOpen: boolean;
    track: Track | null;
    context: 'favorites' | 'playlist';
    playlistId?: string;
  }>({ isOpen: false, track: null, context: 'favorites' });

  const playerRef = useRef<any>(null);
  const repeatModeRef = useRef<RepeatMode>('off');

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  const activePlaylist =
    activeTab === 'favorites'
      ? favoriteTracks
      : selectedPlaylistId === 'recently-played'
      ? recentlyPlayed
      : selectedPlaylistId === 'recently-added'
      ? recentlyAdded
      : selectedPlaylistId
      ? playlists.get(selectedPlaylistId) || []
      : [];

  // Load data on mount
  useEffect(() => {
    loadFavoriteTracks();
    loadRecentlyPlayed();
    loadRecentlyAdded();
    loadCustomPlaylists();
  }, []);

  const loadFavoriteTracks = async () => {
    try {
      const stored = await AsyncStorage.getItem('favoriteTracks');
      if (stored) {
        setFavoriteTracks(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading favorite tracks:', err);
    }
  };

  const saveFavoriteTracks = async (tracks: Track[]) => {
    try {
      await AsyncStorage.setItem('favoriteTracks', JSON.stringify(tracks));
      setFavoriteTracks(tracks);
    } catch (err) {
      console.error('Error saving favorite tracks:', err);
    }
  };

  const loadRecentlyPlayed = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentlyPlayed');
      if (stored) {
        setRecentlyPlayed(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading recently played:', err);
    }
  };

  const loadRecentlyAdded = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentlyAdded');
      if (stored) {
        setRecentlyAdded(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading recently added:', err);
    }
  };

  const addToRecentlyAdded = async (track: Track) => {
    try {
      const stored = await AsyncStorage.getItem('recentlyAdded');
      const prev = stored ? JSON.parse(stored) : [];
      const filtered = prev.filter((t: Track) => t.youtubeId !== track.youtubeId);
      const updated = [{ ...track, id: `recent-added-${Date.now()}` }, ...filtered].slice(0, 200);
      await AsyncStorage.setItem('recentlyAdded', JSON.stringify(updated));
      setRecentlyAdded(updated);
    } catch (err) {
      console.error('Error saving to recently added:', err);
    }
  };

  const addToRecentlyPlayed = async (track: Track) => {
    try {
      const stored = await AsyncStorage.getItem('recentlyPlayed');
      const prev = stored ? JSON.parse(stored) : [];
      const filtered = prev.filter((t: Track) => t.youtubeId !== track.youtubeId);
      const updated = [{ ...track, id: `recent-played-${Date.now()}` }, ...filtered].slice(0, 200);
      await AsyncStorage.setItem('recentlyPlayed', JSON.stringify(updated));
      setRecentlyPlayed(updated);
    } catch (err) {
      console.error('Error saving to recently played:', err);
    }
  };

  const loadCustomPlaylists = async () => {
    try {
      const stored = await AsyncStorage.getItem('customPlaylists');
      if (stored) {
        const data = JSON.parse(stored);
        const map = new Map<string, Track[]>();
        Object.entries(data).forEach(([key, value]) => {
          map.set(key, value as Track[]);
        });
        setPlaylists(map);
      }
    } catch (err) {
      console.error('Error loading custom playlists:', err);
    }
  };

  const saveCustomPlaylists = async (map: Map<string, Track[]>) => {
    try {
      const obj: Record<string, Track[]> = {};
      map.forEach((value, key) => {
        obj[key] = value;
      });
      await AsyncStorage.setItem('customPlaylists', JSON.stringify(obj));
    } catch (err) {
      console.error('Error saving custom playlists:', err);
    }
  };

  const fetchYouTubePlaylist = async (playlistId: string, title: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-playlist-data?playlistId=${playlistId}`,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      const data = await response.json();
      let tracks: Track[] = [];

      if (data?.tracks && data.tracks.length > 0) {
        tracks = data.tracks;
      }

      setPlaylists((prev) => {
        const newMap = new Map(prev);
        newMap.set(playlistId, tracks);
        saveCustomPlaylists(newMap);
        return newMap;
      });

      if (playlistId === 'x4kba2') {
        saveFavoriteTracks(tracks);
      }

      return tracks;
    } catch (err) {
      console.error('Error fetching playlist:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string, pageToken: string | null = null) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchPageToken(null);
      return;
    }

    try {
      setIsLoading(true);
      const url = `${SUPABASE_URL}/functions/v1/youtube-search?q=${encodeURIComponent(query)}${
        pageToken ? `&pageToken=${pageToken}` : ''
      }`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      const data = await response.json();

      if (data.results) {
        setSearchResults(pageToken ? [...searchResults, ...data.results] : data.results);
        setSearchPageToken(data.nextPageToken || null);
      }
    } catch (err) {
      console.error('Error searching YouTube:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectTrack = (index: number) => {
    if (index === currentTrackIndex) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
      if (activePlaylist[index]) {
        addToRecentlyPlayed(activePlaylist[index]);
      }
    }
  };

  const playNext = useCallback(() => {
    if (!activePlaylist.length) return;

    const currentMode = repeatModeRef.current;

    if (currentMode === 'one') {
      playerRef.current?.seekTo(0);
      return;
    }

    if (currentTrackIndex === null) {
      setCurrentTrackIndex(0);
      return;
    }

    const nextIndex = currentTrackIndex + 1;

    if (nextIndex < activePlaylist.length) {
      setCurrentTrackIndex(nextIndex);
      addToRecentlyPlayed(activePlaylist[nextIndex]);
    } else if (currentMode === 'all') {
      setCurrentTrackIndex(0);
      addToRecentlyPlayed(activePlaylist[0]);
    } else {
      setIsPlaying(false);
    }
  }, [currentTrackIndex, activePlaylist]);

  const playPrevious = () => {
    if (currentTrackIndex === null || currentTrackIndex === 0) return;
    const prevIndex = currentTrackIndex - 1;
    setCurrentTrackIndex(prevIndex);
    setIsPlaying(true);
    addToRecentlyPlayed(activePlaylist[prevIndex]);
  };

  const addTrackToFavorites = (track: Track) => {
    const newFavorites = [...favoriteTracks];
    if (!newFavorites.some((t) => t.youtubeId === track.youtubeId)) {
      newFavorites.push(track);
      saveFavoriteTracks(newFavorites);
      addToRecentlyAdded(track);
      Alert.alert('Success', 'Added to My Favorites');
    } else {
      Alert.alert('Already Added', 'This song is already in your favorites');
    }
  };

  const addTrackToPlaylist = (track: Track, playlistId: string) => {
    setPlaylists((prev) => {
      const newMap = new Map(prev);
      const playlist = newMap.get(playlistId) || [];
      
      if (!playlist.some((t) => t.youtubeId === track.youtubeId)) {
        const updated = [...playlist, track];
        newMap.set(playlistId, updated);
        saveCustomPlaylists(newMap);
        addToRecentlyAdded(track);
        Alert.alert('Success', 'Added to playlist');
      } else {
        Alert.alert('Already Added', 'This song is already in this playlist');
      }
      
      return newMap;
    });
  };

  const removeTrackFromPlaylist = (track: Track, playlistId: string) => {
    if (playlistId === 'favorites') {
      const newFavorites = favoriteTracks.filter((t) => t.id !== track.id);
      saveFavoriteTracks(newFavorites);
      Alert.alert('Removed', 'Removed from My Favorites');
    } else {
      setPlaylists((prev) => {
        const newMap = new Map(prev);
        const playlist = newMap.get(playlistId) || [];
        const updated = playlist.filter((t) => t.id !== track.id);
        newMap.set(playlistId, updated);
        saveCustomPlaylists(newMap);
        Alert.alert('Removed', 'Removed from playlist');
        return newMap;
      });
    }
  };

  const deleteTrackFromLibrary = async (youtubeId: string) => {
    // Remove from favorites
    const newFavorites = favoriteTracks.filter((t) => t.youtubeId !== youtubeId);
    saveFavoriteTracks(newFavorites);

    // Remove from all playlists
    setPlaylists((prev) => {
      const newMap = new Map(prev);
      newMap.forEach((tracks, playlistId) => {
        const filtered = tracks.filter((t) => t.youtubeId !== youtubeId);
        newMap.set(playlistId, filtered);
      });
      saveCustomPlaylists(newMap);
      return newMap;
    });

    // Remove from recently added
    const storedAdded = await AsyncStorage.getItem('recentlyAdded');
    if (storedAdded) {
      const prev = JSON.parse(storedAdded);
      const filtered = prev.filter((t: Track) => t.youtubeId !== youtubeId);
      await AsyncStorage.setItem('recentlyAdded', JSON.stringify(filtered));
      setRecentlyAdded(filtered);
    }

    // Remove from recently played
    const storedPlayed = await AsyncStorage.getItem('recentlyPlayed');
    if (storedPlayed) {
      const prev = JSON.parse(storedPlayed);
      const filtered = prev.filter((t: Track) => t.youtubeId !== youtubeId);
      await AsyncStorage.setItem('recentlyPlayed', JSON.stringify(filtered));
      setRecentlyPlayed(filtered);
    }

    Alert.alert('Deleted', 'Removed from entire library');
  };

  const onPlayerStateChange = useCallback(
    (state: string) => {
      if (state === 'ended') {
        playNext();
      }
    },
    [playNext]
  );

  const currentTrack = currentTrackIndex !== null ? activePlaylist[currentTrackIndex] : null;

  const renderTab = (
    tab: 'favorites' | 'playlists' | 'search' | 'more',
    icon: string,
    label: string
  ) => (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon as any}
        size={24}
        color={activeTab === tab ? '#FF2D55' : '#8E8E93'}
      />
      <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderFavoritesTab = () => {
    const groupSongsByLetter = (songs: Track[]) => {
      const groups: Record<string, Track[]> = {};

      ALPHABET.forEach((letter) => {
        groups[letter] = [];
      });

      songs.forEach((song) => {
        const firstChar = song.title.charAt(0).toUpperCase();
        if (/[A-Z]/.test(firstChar)) {
          groups[firstChar].push(song);
        } else {
          groups['#'].push(song);
        }
      });

      return groups;
    };

    const groupedSongs = groupSongsByLetter(favoriteTracks);

    return (
      <View style={styles.tabContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Favorites</Text>
          <Text style={styles.headerSubtitle}>{favoriteTracks.length} songs</Text>
        </View>

        {favoriteTracks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyText}>No favorite songs yet</Text>
            <Text style={styles.emptySubtext}>Add songs from Search or Playlists</Text>
          </View>
        ) : (
          <FlatList
            data={ALPHABET.filter((letter) => groupedSongs[letter].length > 0)}
            keyExtractor={(letter) => letter}
            renderItem={({ item: letter }) => (
              <View key={letter}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{letter}</Text>
                </View>
                {groupedSongs[letter].map((track, index) => {
                  const actualIndex = favoriteTracks.findIndex((t) => t.youtubeId === track.youtubeId);
                  const isCurrentTrack = currentTrackIndex === actualIndex && activeTab === 'favorites';

                  return (
                    <TouchableOpacity
                      key={track.id}
                      style={[styles.trackItem, isCurrentTrack && styles.trackItemActive]}
                      onPress={() => selectTrack(actualIndex)}
                    >
                      <Image
                        source={{ uri: track.thumbnail || `https://i.ytimg.com/vi/${track.youtubeId}/default.jpg` }}
                        style={styles.thumbnail}
                      />
                      <View style={styles.trackInfo}>
                        <Text
                          style={[styles.trackTitle, isCurrentTrack && styles.trackTitleActive]}
                          numberOfLines={1}
                        >
                          {track.title}
                        </Text>
                        <Text style={styles.trackArtist} numberOfLines={1}>
                          {track.artist}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          setTrackOptionsModal({
                            isOpen: true,
                            track,
                            context: 'favorites',
                          })
                        }
                      >
                        <Entypo name="dots-three-vertical" size={18} color="#8E8E93" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
        )}
      </View>
    );
  };

  const renderPlaylistsTab = () => {
    const regularPlaylists = PLAYLISTS.filter(
      (p) => p.id !== 'recently-added' && p.id !== 'recently-played'
    );

    return (
      <View style={styles.tabContent}>
        {selectedPlaylistId ? (
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setSelectedPlaylistId(null)}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.headerTitle}>
                  {PLAYLISTS.find((p) => p.id === selectedPlaylistId)?.name}
                </Text>
                <Text style={styles.headerSubtitle}>{activePlaylist.length} songs</Text>
              </View>
            </View>

            {activePlaylist.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={64} color="#8E8E93" />
                <Text style={styles.emptyText}>No songs in this playlist</Text>
              </View>
            ) : (
              <FlatList
                data={activePlaylist}
                keyExtractor={(track) => track.id}
                renderItem={({ item: track, index }) => {
                  const isCurrentTrack = currentTrackIndex === index;

                  return (
                    <TouchableOpacity
                      style={[styles.trackItem, isCurrentTrack && styles.trackItemActive]}
                      onPress={() => selectTrack(index)}
                    >
                      <Image
                        source={{
                          uri: track.thumbnail || `https://i.ytimg.com/vi/${track.youtubeId}/default.jpg`,
                        }}
                        style={styles.thumbnail}
                      />
                      <View style={styles.trackInfo}>
                        <Text
                          style={[styles.trackTitle, isCurrentTrack && styles.trackTitleActive]}
                          numberOfLines={1}
                        >
                          {track.title}
                        </Text>
                        <Text style={styles.trackArtist} numberOfLines={1}>
                          {track.artist}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          setTrackOptionsModal({
                            isOpen: true,
                            track,
                            context: 'playlist',
                            playlistId: selectedPlaylistId,
                          })
                        }
                      >
                        <Entypo name="dots-three-vertical" size={18} color="#8E8E93" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Playlists</Text>
            </View>

            {/* Recently Added Card */}
            <TouchableOpacity
              style={styles.specialPlaylistCard}
              onPress={() => setSelectedPlaylistId('recently-added')}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={styles.specialCardGradient}>
                <AntDesign name="plus" size={32} color="#FFF" />
                <View style={styles.specialCardInfo}>
                  <Text style={styles.specialCardTitle}>Recently Added</Text>
                  <Text style={styles.specialCardSubtitle}>{recentlyAdded.length} songs</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Recently Played Card */}
            <TouchableOpacity
              style={styles.specialPlaylistCard}
              onPress={() => setSelectedPlaylistId('recently-played')}
            >
              <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.specialCardGradient}>
                <Ionicons name="time-outline" size={32} color="#FFF" />
                <View style={styles.specialCardInfo}>
                  <Text style={styles.specialCardTitle}>Recently Played</Text>
                  <Text style={styles.specialCardSubtitle}>{recentlyPlayed.length} songs</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Regular Playlists Grid */}
            <View style={styles.playlistGrid}>
              {regularPlaylists.map((playlist) => {
                const trackCount = playlists.get(playlist.id)?.length || 0;
                const isLoaded = playlists.has(playlist.id);

                return (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.playlistCard}
                    onPress={() => {
                      if (!isLoaded) {
                        fetchYouTubePlaylist(playlist.id, playlist.name);
                      }
                      setSelectedPlaylistId(playlist.id);
                    }}
                  >
                    <LinearGradient
                      colors={['#3B82F6', '#2563EB']}
                      style={styles.playlistCardGradient}
                    >
                      <Text style={styles.playlistIcon}>{playlist.icon}</Text>
                      <Text style={styles.playlistName} numberOfLines={2}>
                        {playlist.name}
                      </Text>
                      {trackCount > 0 && (
                        <Text style={styles.playlistCount}>{trackCount} songs</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  const renderSearchTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search YouTube..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleSearch(searchQuery)}
            />
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => handleSearch(searchQuery)}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {isLoading && searchResults.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF2D55" />
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyText}>Search for music</Text>
            <Text style={styles.emptySubtext}>Find your favorite songs and add them to your library</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.searchResultItem}>
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.thumbnail}
                />
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setAddSongModal({
                      isOpen: true,
                      track: {
                        id: `track-${Date.now()}`,
                        title: item.title,
                        artist: item.artist,
                        youtubeId: item.youtubeId || '',
                        thumbnail: item.thumbnail,
                      },
                    })
                  }
                >
                  <AntDesign name="plus" size={24} color="#FF2D55" />
                </TouchableOpacity>
              </View>
            )}
            onEndReached={() => {
              if (searchPageToken && !isLoading) {
                handleSearch(searchQuery, searchPageToken);
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoading && searchResults.length > 0 ? (
                <ActivityIndicator size="small" color="#FF2D55" style={{ padding: 20 }} />
              ) : null
            }
          />
        )}
      </View>
    );
  };

  const renderMoreTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More</Text>
        </View>

        <ScrollView>
          <TouchableOpacity style={styles.moreItem}>
            <Ionicons name="settings-outline" size={24} color="#FFF" />
            <Text style={styles.moreItemText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreItem}>
            <Ionicons name="color-palette-outline" size={24} color="#FFF" />
            <Text style={styles.moreItemText}>Themes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreItem}>
            <Ionicons name="moon-outline" size={24} color="#FFF" />
            <Text style={styles.moreItemText}>Sleep Timer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreItem}>
            <Ionicons name="information-circle-outline" size={24} color="#FFF" />
            <Text style={styles.moreItemText}>About</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'favorites' && renderFavoritesTab()}
        {activeTab === 'playlists' && renderPlaylistsTab()}
        {activeTab === 'search' && renderSearchTab()}
        {activeTab === 'more' && renderMoreTab()}
      </View>

      {/* Mini Player */}
      {currentTrack && !isPlayerExpanded && (
        <TouchableOpacity
          style={styles.miniPlayer}
          onPress={() => setIsPlayerExpanded(true)}
        >
          <Image
            source={{
              uri: currentTrack.thumbnail || `https://i.ytimg.com/vi/${currentTrack.youtubeId}/default.jpg`,
            }}
            style={styles.miniPlayerThumbnail}
          />
          <View style={styles.miniPlayerInfo}>
            <Text style={styles.miniPlayerTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.miniPlayerArtist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#FFF"
            />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {renderTab('favorites', 'heart', 'Favorites')}
        {renderTab('playlists', 'list', 'Playlists')}
        {renderTab('search', 'search', 'Search')}
        {renderTab('more', 'ellipsis-horizontal', 'More')}
      </View>


      {/* Expanded Player Modal */}
      <Modal
        visible={isPlayerExpanded}
        animationType="slide"
        onRequestClose={() => setIsPlayerExpanded(false)}
      >
        <View style={styles.expandedPlayer}>
          <View style={styles.expandedPlayerHeader}>
            <TouchableOpacity onPress={() => setIsPlayerExpanded(false)}>
              <Ionicons name="chevron-down" size={32} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.expandedPlayerHeaderText}>Now Playing</Text>
            <View style={{ width: 32 }} />
          </View>

          {currentTrack && (
            <>




              <View style={styles.expandedPlayerContent}>
                <Text style={styles.expandedPlayerTitle} numberOfLines={2}>
                  {currentTrack.title}
                </Text>
                <Text style={styles.expandedPlayerArtist} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>

                <View style={styles.playerControls}>
                  <TouchableOpacity onPress={() => setIsShuffle(!isShuffle)}>
                    <Ionicons
                      name="shuffle"
                      size={28}
                      color={isShuffle ? '#FF2D55' : '#8E8E93'}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={playPrevious}>
                    <Ionicons name="play-skip-back" size={40} color="#FFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => setIsPlaying(!isPlaying)}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={48}
                      color="#FFF"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={playNext}>
                    <Ionicons name="play-skip-forward" size={40} color="#FFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      const modes: RepeatMode[] = ['off', 'all', 'one'];
                      const currentIndex = modes.indexOf(repeatMode);
                      setRepeatMode(modes[(currentIndex + 1) % 3]);
                    }}
                  >
                    <Ionicons
                      name={repeatMode === 'one' ? 'repeat-outline' : 'repeat'}
                      size={28}
                      color={repeatMode !== 'off' ? '#FF2D55' : '#8E8E93'}
                    />
                    {repeatMode === 'one' && (
                      <Text style={styles.repeatOneIndicator}>1</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Add Song Modal */}
      <Modal
        visible={addSongModal.isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAddSongModal({ isOpen: false, track: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to...</Text>
              <TouchableOpacity onPress={() => setAddSongModal({ isOpen: false, track: null })}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  if (addSongModal.track) {
                    addTrackToFavorites(addSongModal.track);
                    setAddSongModal({ isOpen: false, track: null });
                  }
                }}
              >
                <Ionicons name="heart" size={24} color="#FF2D55" />
                <Text style={styles.modalItemText}>My Favorites</Text>
              </TouchableOpacity>

              {PLAYLISTS.filter(
                (p) => p.id !== 'recently-added' && p.id !== 'recently-played'
              ).map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={styles.modalItem}
                  onPress={() => {
                    if (addSongModal.track) {
                      addTrackToPlaylist(addSongModal.track, playlist.id);
                      setAddSongModal({ isOpen: false, track: null });
                    }
                  }}
                >
                  <Text style={styles.playlistIconModal}>{playlist.icon}</Text>
                  <Text style={styles.modalItemText}>{playlist.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Track Options Modal */}
      <Modal
        visible={trackOptionsModal.isOpen}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setTrackOptionsModal({ isOpen: false, track: null, context: 'favorites' })
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Options</Text>
              <TouchableOpacity
                onPress={() =>
                  setTrackOptionsModal({ isOpen: false, track: null, context: 'favorites' })
                }
              >
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalList}>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  if (trackOptionsModal.track) {
                    if (trackOptionsModal.context === 'favorites') {
                      removeTrackFromPlaylist(trackOptionsModal.track, 'favorites');
                    } else if (trackOptionsModal.playlistId) {
                      removeTrackFromPlaylist(trackOptionsModal.track, trackOptionsModal.playlistId);
                    }
                    setTrackOptionsModal({ isOpen: false, track: null, context: 'favorites' });
                  }
                }}
              >
                <Ionicons name="remove-circle-outline" size={24} color="#FF9500" />
                <Text style={styles.modalItemText}>
                  Remove from {trackOptionsModal.context === 'favorites' ? 'Favorites' : 'Playlist'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  if (trackOptionsModal.track) {
                    Alert.alert(
                      'Delete from Library',
                      'This will remove the song from your entire library including all playlists. Are you sure?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => {
                            deleteTrackFromLibrary(trackOptionsModal.track!.youtubeId);
                            setTrackOptionsModal({ isOpen: false, track: null, context: 'favorites' });
                          },
                        },
                      ]
                    );
                  }
                }}
              >
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                <Text style={[styles.modalItemText, { color: '#FF3B30' }]}>Delete from Library</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabContent: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#636366',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionHeader: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  sectionHeaderText: {
    fontSize: 18,
    color: '#8E8E93',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  trackItemActive: {
    backgroundColor: '#1C1C1E',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 4,
  },
  trackTitleActive: {
    color: '#FF2D55',
  },
  trackArtist: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#FF2D55',
  },
  miniPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  miniPlayerThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  miniPlayerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  miniPlayerTitle: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 4,
  },
  miniPlayerArtist: {
    fontSize: 12,
    color: '#8E8E93',
  },
  expandedPlayer: {
    flex: 1,
    backgroundColor: '#000',
  },
  expandedPlayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  expandedPlayerHeaderText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  playerVideoContainer: {
    width: SCREEN_WIDTH,
    height: 220,
    backgroundColor: '#000',
    marginTop: 20,
  },
  expandedPlayerContent: {
    flex: 1,
    padding: 24,
  },
  expandedPlayerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 20,
  },
  expandedPlayerArtist: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 8,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 40,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF2D55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOneIndicator: {
    position: 'absolute',
    fontSize: 10,
    color: '#FF2D55',
    fontWeight: 'bold',
    top: 18,
    left: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#FFF',
    marginLeft: 8,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  specialPlaylistCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  specialCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  specialCardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  specialCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  specialCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    marginTop: 16,
  },
  playlistCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  playlistCardGradient: {
    padding: 16,
    height: 140,
    justifyContent: 'space-between',
  },
  playlistIcon: {
    fontSize: 32,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  playlistCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  moreItemText: {
    fontSize: 16,
    color: '#FFF',
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalList: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalItemText: {
    fontSize: 16,
    color: '#FFF',
    marginLeft: 16,
  },
  playlistIconModal: {
    fontSize: 24,
  },
});
