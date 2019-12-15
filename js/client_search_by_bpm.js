/** 
 * MusicMaster 
 * COGS 121, Spring 2019
 * June 5, 2019 
 * Final Project
 *
 * Summary. 
 * This file contains the JS code to perform user actions on the Search by BPM page.
 *
 * Description.
 * Specifically, this file contains the Spotify API and Firebase credentials to 
 * have our application access Spotify to play music, get a list of genres,
 * get a list of song recommendations, and display the recommendations, 
 * and access Firebase to save songs, current song recommendations, and other settings
 * in their realtime database.
 *
 * @file   client_search_by_bpm.js.
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
const redirectUri = 'http://localhost:3000/search_by_bpm.html'; // Your redirect uri
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
genreLimitAlert("off");

/**
  * @desc Initialize Web Playback SDK
  * @param none
  * @return none
*/
function onSpotifyPlayerAPIReady() {

  let player = new Spotify.Player({
    name: 'User',
    getOAuthToken: function(cb) {
      cb(_token)
    },
    volume: 0.8
  });

  player.on('ready', function(data) {
    deviceId = data.device_id;

    // writes data to the database:
    database.ref('settings/browserDeviceID').set(data.device_id);
  });

  player.on('player_state_changed', function(data) {
    console.log('entered player_state_changed');
    if(data) {
      console.log('about to update currently playing song');
      let currentTrack = data.track_window.current_track.uri;
      updateCurrentlyPlaying(currentTrack);
    }
  });

  console.log('connecting player');
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
  * @desc Alert the user if the user chooses more than 5 genres
  * @param state - whether or not the user chooses more than 5 genres
  * @return none
*/
function genreLimitAlert(state) {
  if(state == "on") {
    $('#genreLimitAlert').show();
  } else {
    $('#genreLimitAlert').hide();
  }
}

/**
  * @desc Get the list of genres to display in the modal
  * @param none
  * @return none
*/
function getGenresList() {
  const genresToDisplay = [
    'chicago-house',
    'chill',
    'club',
    'dance',
    'deep-house',
    'detroit-techno',
    'disco',
    'drum-and-bass',
    'dub',
    'dubstep',
    'edm',
    'electro',
    'electronic',
    'hardcore',
    'hardstyle',
    'house',
    'minimal-techno',
    'party',
    'techno',
    'trance'
  ];

  $('#genres-list').empty();
  $.get('/genres?token=' + _token, function(genres) {
    genres.forEach(function(genre) {
      if ($.inArray(genre, genresToDisplay) !== -1) {
        let genreButtonElement = '<label class="btn btn-salmon btn-sm" id="genre-button"><input type="checkbox" value="' + genre + '">' + genre + '</label>';
        $('#genres-list').append(genreButtonElement);
      }
    });
  });

  $('#genres-list').on('change', 'input', function() {
    if($('#genres-list input:checked').length > 5) {
      $(this).parent().removeClass("active");
      this.checked = false;
      genreLimitAlert("on");
    }
    else {
      genreLimitAlert("off");
    }
  });
}

/**
  * @desc Update the list of current selected genres
  * @param none
  * @return none
*/
function updateGenres() {
  // Get selected genres
  let genres = [];
  $('#genres-list input:checked').each(function() {
    genres.push($(this).val());
  });

  $('#current-genres').empty();
  genres.forEach((genre) => {
    let genreElement = '<p id="curGenre">' + genre + '</p>';
    $('#current-genres').append(genreElement);
    console.log('genreElement: ');
    console.log(genreElement);
  });

  let genresString = genres.join();

  // writes data to the database:
  database.ref('genres/currentGenres').set(genresString);

  const genresId = document.getElementById('genres');
  const currentGenres = genresId.getElementsByTagName('span');
  console.log('currentGenres: ' + currentGenres[0].innerHTML);

  $('#tracks').empty();
  $('#hoverDirections').empty();
}

/**
  * @desc Get a list of song recommendations based on the corresponding search parameters
  * @param none
  * @return none
*/
function getRecommendations() {
  // 'once' reads the value once from the database
  database.ref('genres/currentGenres').once('value', (snapshot) => {
    let genresString = snapshot.val();
    requestURL = '/recommendations?seed_genres=' + genresString + '&target_tempo=' + $('#targetTempo').val() + '&token=' + _token;
    console.log('requestURL: ' + requestURL);

    // Ajax call to get song recommendations
    $.ajax({
      url: requestURL,
      type: 'GET',
      dataType: 'json',
      success: (data) => {
        console.log('You received some data!', data);
        const genres = document.getElementById('genres');
        const currentGenres = genres.getElementsByTagName('span');
        const targetTempo = document.getElementById('targetTempo');
        console.log('currentGenres: ' + currentGenres[0].innerHTML);
        console.log('targetTempo: ' + targetTempo.value);

        $('#tracks').empty();
        $('#hoverDirections').empty();
        let trackIds = [];
        let trackUris = [];
        if(data.tracks && (currentGenres[0].innerHTML !== '') && (targetTempo.value >= 40 && targetTempo.value <= 200)) {
          if(data.tracks.length > 0) {
            $('#hoverDirections').text("Here are some song recommendations. Hover over a song's album art to see its audio features.");
            data.tracks.forEach(function(track) {
              trackIds.push(track.id);
              trackUris.push(track.uri);
            });

            trackUris.forEach((uri) => {
              // writes data to the database:
              database.ref('music/currentTracks/' + uri.substring(14)).set(uri);
            });

            renderTracks(trackIds);
          } else {
            $('#tracks').append('<h2>No results. Try a broader search.</h2>')
          }
        }
      },
    });
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
  * @desc Display the list of song recommendations with the album art, play, and save functions 
  * @param ids - track IDs
  * @return none
*/
function renderTracks(ids) {
  $.get('/tracks?ids=' + ids.join() + '&token=' + _token, function(tracks) {
    tracks.forEach(function(track) {
      $.get('/track?trackID=' + track.uri.substring(14) + '&token=' + _token, function(trackDetails) {
        let image = track.album.images ? track.album.images[0].url : 'https://upload.wikimedia.org/wikipedia/commons/3/3c/No-album-art.png';
        let trackElement = '<div class="track-element" id="' + track.uri + '"><div><img class="remove-icon" src="../images/remove-icon.png" onclick="remove(\'' + track.uri + '\');"/><div class="img_wrap"><img class="album-art" src="' + image + '"/><ul class="img_description"><p id="tempo_hidden">BPM: ' + trackDetails.tempo + '</p><p id="key_hidden">Key: ' + pitch_class[trackDetails.key.toString()] + '</p><p id="energy_hidden">Energy: ' + trackDetails.energy + '</p><p id="danceability_hidden">Danceability: ' + trackDetails.danceability + '</p></ul></div><div><p id="track-name">' + track.name + '</p><p id="artist-name">' + track.artists[0].name + '</p></div></div><ul style="list-style: none;"><li><div class="icon_wrap"><img class="play-icon" src="images/play.png" onclick="play(\'' + track.uri + '\');"/><ul class="icon_description" onclick="play(\'' + track.uri + '\');"><p id="play_hidden">Play</p></ul></div></li><li><div class="icon_wrap"><img class="save-song-icon" src="images/save-song.png" onclick="saveSong(\'' + track.uri + '\');"/><ul class="icon_description" onclick="saveSong(\'' + track.uri + '\');"><p id="save_hidden">Save</p></ul></div></li></ul></div></div>';
        $('#tracks').append(trackElement);
        console.log('track.uri: ' + track.uri);
        console.log('trackDetails: ');
        console.log(trackDetails);
      });
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
