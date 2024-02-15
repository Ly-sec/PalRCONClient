
# PalRCONClient
**Your soon to be favorite RCON Client for Palworld!**

This is a very early version of my own RCON client for Palworld.

You can see the features down below.

It is written in NodeJS, using `net`, `buffer` and `crypto`.


## Features

| Features                          | Implemented|
| ---------------------------------| :--------:|
| Multi Connection Support          |         ✔️|
| Custom Functions for Commands     |         ✔️|
| Solid Error Handling              |         ✔️|
| More coming soon                  |           |



## Usage

### Installation
To install this package, please use `npm install palrconclient`.

### Example Code
```js
// Import the PalworldRCONClient class
const { PalRCONClient } = require('palrconclient');

// Create an instance of PalworldRCONClient
const rconClient1 = new PalRCONClient('IP', 25575, 'PASSWORD');
// You can create as many instances as you want / need!

// Check if the credentials are correct
PalRCONClient.checkConnection(rconClient1)
  .then((isValid) => {
    if (isValid) {
        // Use the "/ShowPlayers" command
        PalRCONClient.ShowPlayers(rconClient1)
        // Log the response
        .then((response) => { console.log(response) })
        .catch((error) => console.error('Error:', error.message))
    } else {
      console.error('Connection failed. Please check your connection details.');
    }
  })
  .catch((error) => console.error('Error:', error.message));
```

Currently working commands:


```js
// Checks if the credentials are correct
PalRCONClient.checkConnection(instance)

// Sends RCON Command (maybe I didn't add a new one yet or something)
PalRCONClient.Send(instance, 'RCON_COMMAND')

// Displays all current players on the server
PalRCONClient.ShowPlayers(instance)

// Sends a text to the server
PalRCONClient.Broadcast(instance)

// Saves the server
PalRCONClient.Save(instance)

// Turns the server offline with specified time and text
PalRCONClient.ShutDown(instance, "seconds", "text")

// Kicks a player (steamId)
PalRCONClient.Kick(instance, "steamId")

// Bans a player (steamId)
PalRCONClient.Ban(instance, "steamId")
```


## Support

Please open up an issue if you find any bugs!