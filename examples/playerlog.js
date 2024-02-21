const { PalRCONClient } = require('palrconclient')

const rconClient1 = new PalRCONClient('IP', 25575, 'PASSWORD')

let lastKnownPlayer = null;
let lastKnownSteamID = null;
let firstRun = true;

const handlePlayerChanges = (currentName, currentSteamID) => {
  if (currentName && (!lastKnownPlayer || lastKnownPlayer !== currentName)) {
    if (!firstRun) {
      console.log(`Player joined: ${currentName} (Steam ID: ${currentSteamID})`);
      PalRCONClient.Broadcast(rconClient1, `Player joined: ${currentName}.`);
    }
  }

  if (lastKnownPlayer && (!currentName || lastKnownPlayer !== currentName)) {
    console.log(`Player left: ${lastKnownPlayer} (Steam ID: ${lastKnownSteamID})`);
    PalRCONClient.Broadcast(rconClient1, `Player left: ${lastKnownPlayer}.`);
  }

  lastKnownPlayer = currentName;
  lastKnownSteamID = currentSteamID;
  firstRun = false;
};

const checkConnectionAndShowPlayers = async () => {
  try {
    const isValid = await PalRCONClient.checkConnection(rconClient1);

    if (isValid) {
      const response = await PalRCONClient.ShowPlayers(rconClient1);
      const playerDataAfterSteamID = response.replace(/^.*?steamid/i, '').trim();
      const [name, playerID, steamID] = playerDataAfterSteamID.split(',').map(part => part.trim());
      handlePlayerChanges(name, steamID);
    } else {
      console.error('Connection failed. Please check your connection details.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

checkConnectionAndShowPlayers();

// You can use setInterval if you want to repeatedly check and show players every 5 seconds
setInterval(checkConnectionAndShowPlayers, 5000);