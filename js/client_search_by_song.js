/** 
 * MusicMaster 
 * COGS 121, Spring 2019
 * June 5, 2019 
 * Final Project
 *
 * Summary. 
 * This file contains the JS code to perform user actions on the Search by Song page.
 *
 * Description.
 * Specifically, this file contains the Spotify API and Firebase credentials to 
 * have our application access Spotify to play music, search for recommendations based
 * on a song title, get a list of song recommendations, and display the recommendations, 
 * and access Firebase to save songs, current song recommendations, and other settings
 * in their realtime database.
 *
 * @file   client_search_by_song.js.
 */

// gets the current window hash to get the access token
const window_hash = window.location.hash
.substring(1)
.split('&')
.reduce((initial, item) => {
  if (item) {
    let parts = item.split('=');
    initial[parts[0]] = decodeURIComponent(parts[1]);
  }
  return initial;
}, {});
window.location.hash = '';

// get access token and Spotify API authorization endpoint
let _token = window_hash.access_token;
const authEndpoint = 'https://accounts.spotify.com/authorize';

// Our app's client ID, redirect URI and desired scopes
const clientId = '0244dbc6e09c4ca1b3d6f7f6f80497ab'; // Your client id
const redirectUri = 'http://localhost:3000/search_by_song.html'; // Your redirect uri
const scopes = [
  'streaming',
  'user-read-birthdate',
  'user-read-email',
  'user-read-private',
  'playlist-modify-public',
  'user-modify-playback-state'
];

// check if there is no access token to set window location
if (!_token) {
  window.location = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join('%20')}&response_type=token`;
}

// Page setup

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCI8g94vGuV_iOi5ZLt_bnTMCWTrpCFj6o",
  authDomain: "greek4life-sp19.firebaseapp.com",
  databaseURL: "https://greek4life-sp19.firebaseio.com",
  projectId: "greek4life-sp19",
  storageBucket: "greek4life-sp19.appspot.com",
  messagingSenderId: "953271204769",
  appId: "1:953271204769:web:5d562d11546fdfc7"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
$(document).ready(() => {
  database.ref('genres/currentGenres/').remove();
  database.ref('music/currentTracks/').remove();
});

// initialize page setup
let deviceId;
let playbackSetting;
setPlaybackSetting(1);

/**
  * @desc Initialize Web Playback SDK
  * @param none
  * @return none
*/
function onSpotifyPlayerAPIReady() {

  let player = new Spotify.Player({
    name: 'User',
    getOAuthToken: (cb) => {
      cb(_token)
    },
    volume: 0.8
  });

  player.on('ready', (data) => {
    deviceId = data.device_id;

    // writes data to the database:
    database.ref('settings/browserDeviceID').set(data.device_id);
  });

  player.on('player_state_changed', (data) => {
    if(data) {
      let currentTrack = data.track_window.current_track.uri;
      updateCurrentlyPlaying(currentTrack);
    }
  });

  player.connect();
}

/**
  * @desc Set the playback setting to allow the user to play or not play songs
  * @param setting - 0 to not play, 1 to play
  * @return none
*/
function setPlaybackSetting(setting) {
  playbackSetting = setting;

  if (setting == 0) {
    deviceId = null;
    pause();
    $('#current-playback').text('None');
    $('.track-element').removeClass('current-track');
  } else if (setting == 1) {

    // 'once' reads the value once from the database
    database.ref('settings/browserDeviceID').once('value', (snapshot) => {
      const data = snapshot.val();
      setDevice(data);
    });
    $('#current-playback').text('In Browser');
  }
}

/**
  * @desc Set the device to playback songs
  * @param id - device ID, name - device name
  * @return none
*/
function setDevice(id, name) {
  deviceId = id;
  $('#current-playback').text(name);
  $.post('/transfer?device_id=' + deviceId + '&token=' + _token);
}

/**
  * @desc Find a certain song's Spotify ID using several Ajax calls to the API 
  * @param none
  * @return none
*/
function findSongID() {
  // clear searched-track and set up first requestURL
  $('#searched-track').empty();
  requestURL = '/search?q=' + $('#songName').val() + '&type=track&market=US&limit=1' + '&token=' + _token;
  console.log('requestURL: ' + requestURL);

  // first Ajax call to get song's Spotify ID
  $.ajax({
    url: requestURL,
    type: 'GET',
    dataType: 'json',
    success: (data) => {
      console.log('You received some data!', data);
      if (data.tracks.items.length > 0) {
        const songID = data["tracks"]["items"]["0"]["id"];
        console.log('Song ID: ', songID);
        const songName = document.getElementById('songName');
        console.log('songName: ' + songName.value);
        console.log('requestURL: ' + requestURL);
        console.log('token: ' + _token);

        let searchedTrack = 'spotify:track:' + songID;
        console.log('searchedTrack: ' + searchedTrack);
        $('#searched-track').empty();
        renderTrack(searchedTrack);
        
        // set up second requestURL to get tempo of song
        requestURL2 = 'https://api.spotify.com/v1/audio-features/' + songID;

        // second Ajax call to get tempo of song
        $.ajax({
          url: requestURL2,
          type: 'GET',
          dataType: 'json',
          headers: {'Authorization': 'Bearer ' + _token},
          success: (data) => {
            console.log('Track Tempo: ', data.tempo);
            console.log(data);
            let songTempo = data.tempo;

            // set up third requestURL to get artist ID
            requestURL3 = 'https://api.spotify.com/v1/tracks/' + songID;

            // third Ajax call to get artist ID
            $.ajax ({
              url: requestURL3,
              type: 'GET',
              dataType: 'json',
              headers: {'Authorization': 'Bearer ' + _token},
              success: (data) => {
                console.log(data);
                const artistID = data['artists']['0']['id'];
                console.log(artistID);

                // set up fourth requestURL to get genres
                requestURL4 = 'https://api.spotify.com/v1/artists/' + artistID; 

                // fourth Ajax call to get genres
                $.ajax ({
                  url: requestURL4,
                  type: 'GET',
                  dataType: 'json',
                  headers: {'Authorization': 'Bearer ' + _token},
                  success: (data) => {
                    console.log(Object.values(data.genres));
                    let artistGenres = Object.values(data.genres);
                    getSimilarRecommendations(artistGenres, songTempo);
                  }
                });
              }
            });
          }
        });
      } else {
        $('#tracks').empty();
        $('#songTempo').empty();
        $('#tracks').append('<h2>No results. Please enter another song name first.</h2>')
      }
    },
  });
}

/**
  * @desc Get a list of song recommendations based on the corresponding search parameters
  * @param artistGenres - genres of the search song's artist, songTempo - BPM value of the search song
  * @return none
*/
function getSimilarRecommendations(artistGenres, songTempo) {
  // set up genres and BPM value to send in requestURL
  let genres = artistGenres;
  let targetTempo = songTempo;
  let genresString = genres.join().replace(/ /g, '-');

  // set up requestURL to get song recommendations
  requestURL = '/recommendations2?seed_genres=' + genresString + '&target_tempo=' + targetTempo + '&token=' + _token;
  console.log('this is the genreString: ', genresString);
  console.log(targetTempo);
  console.log('here is the first genre ', genres[0]);
  console.log('requestURL: ' + requestURL);

  // Ajax call to get song recommendations
  $.ajax({
    url: requestURL,
    type: 'GET',
    dataType: 'json',
    success: (data) => {
      console.log('You received some data!', data);
      console.log(data);
      const genres = document.getElementById('genres');
      const currentGenres = artistGenres;
      const targetTempo = songTempo;
      console.log('currentGenres: ' + currentGenres);
      console.log('targetTempo: ' + targetTempo);
      console.log('current genre ' + currentGenres[0]);

      $('#tracks').empty();
      $('#songTempo').empty();
      let trackIds = [];
      let trackUris = [];
      if(data.tracks && (currentGenres !== '') && (targetTempo >= 40 && targetTempo <= 200)) {
        if(data.tracks.length > 0) {
          $('#songTempo').text("Your searched song is shown above, and song recommendations are shown below. Hover over a song's album art to see its audio features.");
          data.tracks.forEach((track) => {
            trackIds.push(track.id);
            trackUris.push(track.uri);
          });

          trackUris.forEach((uri) => {
            // writes data to the database:
            database.ref('music/currentTracks/' + uri.substring(14)).set(uri);
          });

          renderTracks(trackIds);
        } else {
          $('#songTempo').text("Your searched song is shown above, but there are no recommendations available. Hover over its album art to see its audio features.");
        }
      } else if (currentGenres === '' && (targetTempo >= 40 && targetTempo <= 200)) {
        $('#tracks').append('<h2>No results. Please enter another song name.</h2>');
      } else if (targetTempo !== '' && (targetTempo < 40 || targetTempo > 200)) {
        $('#tracks').append('<h2>No results. Please enter another song name.</h2>');
      } else {
        $('#tracks').append('<h2>No results. Please enter another song name.</h2>');
        console.log('currentGenres: ' , currentGenres);
        console.log('data.tracks: ' , data.tracks);
        console.log('targetTempo: ' , targetTempo);
      }
    },
  });
}

// change pitch key from number to letter
const pitch_class = {
  '-1': "No key detected",
  '0': "C",
  '1': "C♯, D♭",
  '2': "D",
  '3': "D♯, E♭",
  '4': "E",
  '5': "F",
  '6': "F♯, G♭",
  '7': "G",
  '8': "G♯, A♭",
  '9': "A",
  '10': "A♯, B♭",
  '11': "B"
}

/**
  * @desc Display the searched song with the album art, play, and save functions 
  * @param ids - track IDs
  * @return none
*/
function renderTrack(ids) {
  console.log('in renderTrack with ids: ' + ids);
  $.get('/tracks?ids=' + ids.substring(14) + '&token=' + _token, (tracks) => {
    tracks.forEach((track) => {
      $.get('/track?trackID=' + track.uri.substring(14) + '&token=' + _token, (trackDetails) => {
        let image = track.album.images ? track.album.images[0].url : 'https://upload.wikimedia.org/wikipedia/commons/3/3c/No-album-art.png';
        let trackElement = '<div class="track-element" id="' + track.uri + '"><div><div class="img_wrap"><img class="album-art" src="' + image + '"/><ul class="img_description"><p id="tempo_hidden">BPM: ' + trackDetails.tempo + '</p><p id="key_hidden">Key: ' + pitch_class[trackDetails.key.toString()] + '</p><p id="energy_hidden">Energy: ' + trackDetails.energy + '</p><p id="danceability_hidden">Danceability: ' + trackDetails.danceability + '</p></ul></div><div><p id="track-name">' + track.name + '</p><p id="artist-name">' + track.artists[0].name + '</p></div></div><ul style="list-style: none;"><li><div class="icon_wrap"><img class="play-icon" src="images/play.png" onclick="play(\'' + track.uri + '\');"/><ul class="icon_description" onclick="play(\'' + track.uri + '\');"><p id="play_hidden">Play</p></ul></div></li><li><div class="icon_wrap"><img class="save-song-icon" src="images/save-song.png" onclick="saveSong(\'' + track.uri + '\');"/><ul class="icon_description" onclick="saveSong(\'' + track.uri + '\');"><p id="save_hidden">Save</p></ul></div></li></ul></div></div>';
        console.log('about to exit renderTrack');
        $('#searched-track').append(trackElement);
        console.log('track.uri: ' + track.uri);
        console.log('trackDetails: ');
        console.log(trackDetails);
      });
    });
  });
}

/**
  * @desc Display the list of song recommendations with the album art, play, and save functions 
  * @param ids - track IDs
  * @return none
*/
function renderTracks(ids) {
  console.log('in renderTracks with ids: ' + ids);
  $.get('/tracks?ids=' + ids.join() + '&token=' + _token, (tracks) => {
    tracks.forEach((track) => {
      let searchedTrackID = $('#searched-track .track-element').attr('id').substring(14);
      let trackID = track.uri.substring(14);
      if (trackID != searchedTrackID) {
        $.get('/track?trackID=' + track.uri.substring(14) + '&token=' + _token, (trackDetails) => {
          let image = track.album.images ? track.album.images[0].url : 'https://upload.wikimedia.org/wikipedia/commons/3/3c/No-album-art.png';
          let trackElement = '<div class="track-element" id="' + track.uri + '"><div><img class="remove-icon" src="../images/remove-icon.png" onclick="remove(\'' + track.uri + '\');"/><div class="img_wrap"><img class="album-art" src="' + image + '"/><ul class="img_description"><p id="tempo_hidden">BPM: ' + trackDetails.tempo + '</p><p id="key_hidden">Key: ' + pitch_class[trackDetails.key.toString()] + '</p><p id="energy_hidden">Energy: ' + trackDetails.energy + '</p><p id="danceability_hidden">Danceability: ' + trackDetails.danceability + '</p></ul></div><div><p id="track-name">' + track.name + '</p><p id="artist-name">' + track.artists[0].name + '</p></div></div><ul style="list-style: none;"><li><div class="icon_wrap"><img class="play-icon" src="images/play.png" onclick="play(\'' + track.uri + '\');"/><ul class="icon_description" onclick="play(\'' + track.uri + '\');"><p id="play_hidden">Play</p></ul></div></li><li><div class="icon_wrap"><img class="save-song-icon" src="images/save-song.png" onclick="saveSong(\'' + track.uri + '\');"/><ul class="icon_description" onclick="saveSong(\'' + track.uri + '\');"><p id="save_hidden">Save</p></ul></div></li></ul></div></div>';
          $('#tracks').append(trackElement);
          console.log('track.uri: ' + track.uri);
          console.log('trackDetails: ');
          console.log(trackDetails);
        });
      }
    });
  });
}

/**
  * @desc Save a song to the user's list of saved songs in Firebase
  * @param track - current track to save
  * @return none
*/
function saveSong(track) {
  // get track ID
  let trackID = track.substring(14);
  console.log('trackID: ' + trackID);

  // 'once' reads the value once from the database
  database.ref('savedSongs/' + trackID).once('value', (snapshot) => {
    if (snapshot.exists()) {
      alert('This song has already been saved to your profile.');
    } else {
      // writes data to the database:
      database.ref('savedSongs/' + trackID).set(trackID);
      alert("Song added to your profile!");
    }
  });
}

/**
  * @desc Update the song that is currently playing to a new song
  * @param track - the new song to play
  * @return none
*/
function updateCurrentlyPlaying(track) {
  console.log('in updateCurrentlyPlaying with this track: ' + track);
  let trackElement = document.getElementById(track);
  $('.track-element').removeClass('current-track');
  if(trackElement) {
    trackElement.className += " current-track";
  }
}

/**
  * @desc Play a song
  * @param track - current track to play
  * @return none
*/
function play(track) {
  console.log('Current track playing: ' + track);
  if(playbackSetting != 0) {
    console.log('play requestURL: ' + '/play?tracks=' + track + '&device_id=' + deviceId + '&token=' + _token);
    $.post('/play?tracks=' + track + '&device_id=' + deviceId + '&token=' + _token);
  }
}

/**
  * @desc Pause a song using the Playback Songs function
  * @param none
  * @return none
*/
function pause() {
  $.post('/pause?token=' + _token);
}

/**
  * @desc Remove a song from the current list of song recommendations 
  * @param track - current track to remove
  * @return none
*/
function remove(track) {
  // get track ID
  let trackID = track.substring(14);
  console.log('in remove() with track: ' + trackID);

  // remove the track from Firebase and from frontend
  database.ref('music/currentTracks/' + trackID).remove();
  let element = document.getElementById(track);
  element.outerHTML = "";
  delete element;
  alert("This song has been removed from the list of recommendations.");
}
