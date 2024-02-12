This is a simple to use RCON client specifically made for the game Palworld.
It is written in NodeJS and uses async functions.

`palrconclient` is quite early in it's developement. Currently it features most rcon commands that Palworld has to offer. Oh did I mention that it also has a command queue? Makes your life much easier when you intend to send multiple commands at once.

Oh, it also supports using multiple rcon connections at once, best used if you have multiple Palworld servers that you need to manage at the same time.

# Usage

`npm i palrconclient`

```js
const { PalRCONClient } = require('palrconclient')

const rconClient1 = new PalRCONClient('IP', 25575, 'PASSWORD', {
    onData: (data) => {
        console.log('Connection 1 data:\n', data.response)
    },
    onEnd: () => {
        console.log('Connection 1 closed.');
    },
    onError: (err) => {
        console.error('Connection 1 error:', err)
    },
});

// Either define which client should be used or use 'all' to send it to all clients.
/**
PalRCONClient.Send(rconClient1, "RCON COMMAND") //Run commands that are not specified (or implemented yet)
PalRCONClient.Broadcast(rconClient1, "Random broadcast text") //Automatically converts spaces to "_"
PalRCONClient.Save(rconClient1) // Saves the server
PalRCONClient.Shutdown(rconClient1, "20", "Shutdown Message") // Shuts the server down after X seconds with message
PalRCONClient.ShowPlayers(rconClient1) // Displays the players playing right now
PalRCONClient.Kick(rconClient1, "SteamId") // Kicks player (steamId)
PalRCONClient.Ban(rconClient1, "SteamId") // Bans player (steamId)
*/
```

As soon as I have more features, I will start editing this readme.
greetings, Lysec <3
