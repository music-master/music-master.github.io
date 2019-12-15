/** 
 * MusicMaster 
 * COGS 121, Spring 2019
 * June 5, 2019 
 * Final Project
 *
 * Summary. 
 * This file contains the JS code to perform user actions on the Saved Music page.
 *
 * Description.
 * Specifically, this file contains the Spotify API and Firebase credentials to 
 * have our application access Spotify to play music, and display the saved music, 
 * and access Firebase to access saved songs, and other settings
 * in their realtime database.
 *
 * @file   client_saved_music.js.
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
const redirectUri = 'http://localhost:3000/saved_music.html'; // Your redirect uri
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

  // use .on('value', ...) to get notified in real-time whenever anyone
  // on the internet updates your database.
  database.ref('savedSongs/').once('value', (snapshot) => {
    const savedSongs = snapshot.val();
    console.log('savedSongs/ changed:', savedSongs);
    if (savedSongs) {
      console.log('savedSongs exists');
      const savedURIs = Object.keys(savedSongs).join();
      console.log('savedSongs keys: ');
      console.log(savedURIs);
      $('.saved-tracks').empty();
      renderTracks(savedURIs);
    }
  });
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
  * @desc Display the list of saved songs with the album art, play, and save functions 
  * @param savedSongs - list of the user's saved songs
  * @return none
*/
function renderTracks(savedSongs) {
  console.log('in renderTracks');
  console.log('savedSongs: ');
  console.log(savedSongs);
  $.get('/tracks?ids=' + savedSongs + '&token=' + _token, (tracks) => {
    tracks.forEach((track) => {
      $.get('/track?trackID=' + track.uri.substring(14) + '&token=' + _token, (trackDetails) => {
        let image = track.album.images ? track.album.images[0].url : 'https://upload.wikimedia.org/wikipedia/commons/3/3c/No-album-art.png';
        let trackElement = '<div class="track-element" id="' + track.uri + '"><div><img class="remove-icon" src="../images/remove-icon.png" onclick="remove(\'' + track.uri + '\');"/><div class="img_wrap"><img class="album-art" src="' + image + '"/><ul class="img_description"><p id="tempo_hidden">BPM: ' + trackDetails.tempo + '</p><p id="key_hidden">Key: ' + pitch_class[trackDetails.key.toString()] + '</p><p id="energy_hidden">Energy: ' + trackDetails.energy + '</p><p id="danceability_hidden">Danceability: ' + trackDetails.danceability + '</p></ul></div><div><p id="track-name">' + track.name + '</p><p id="artist-name">' + track.artists[0].name + '</p></div></div><ul style="list-style: none;"><li><div class="icon_wrap"><img class="play-icon" src="images/play.png" onclick="play(\'' + track.uri + '\');"/><ul class="icon_description" onclick="play(\'' + track.uri + '\');"><p id="play_hidden">Play</p></ul></div></li></ul></div></div>';
        $('.saved-tracks').append(trackElement);
        console.log('track.uri: ' + track.uri);
        console.log('trackDetails: ');
        console.log(trackDetails);
      });
    })
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
  database.ref('savedSongs/' + trackID).remove();
  let element = document.getElementById(track);
  console.log('element:', element);
  element.outerHTML = "";
  delete element;
  alert("This song has been removed from the list of saved songs.");
}
