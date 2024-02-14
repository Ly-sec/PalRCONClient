const net = require('net');

class PalRCONClient {

  static connections = [];

  constructor(serverIP, serverPort, password, options = {}) {
    const { onEnd, onError, onData } = options;

    this.serverIP = serverIP;
    this.serverPort = serverPort;
    this.password = password;
    this.onEnd = onEnd;
    this.onError = onError;
    this.onData = onData;

    this.socket = null;
    this.authenticated = false;
    this.commandQueue = [];
    this.connectionId = `${serverIP}:${serverPort}`;
    this.onEndLogged = false; // New flag to track if onEnd event has been logged

    PalRCONClient.connections.push(this);
  }

  connect() {
    this.socket = net.connect({ port: this.serverPort, host: this.serverIP }, () => {
      //console.log(`Connected to Palworld server at ${this.serverIP}:${this.serverPort}`);

      const size = 14 + this.password.length;
      const handshakePacket = Buffer.alloc(size);
      handshakePacket.writeInt32LE(size, 0);
      handshakePacket.writeInt32LE(0, 4);
      handshakePacket.writeInt32LE(3, 8);
      handshakePacket.write(this.password, 12, 'ascii');

      // Check if the socket is still open before writing
      if (this.socket && !this.socket.destroyed) {
        this.socket.write(handshakePacket);
      } else {
        console.error('Attempted to write to a closed socket during connection.');
      }
    });

    this.socket.on('data', (data) => {
      this.handleData(data);
    });

    this.socket.on('end', () => {
      console.log(`Connection ${this.connectionId} closed.`);
      if (!this.onEndLogged && this.onEnd && typeof this.onEnd === 'function') {
        try {
          this.onEnd();
          this.onEndLogged = true; // Set the flag to true after logging onEnd
        } catch (err) {
          console.error('Error in onEnd handler:', err);
        }
      }
    });

    this.socket.on('error', (err) => {
      console.error(`Socket error in connection ${this.connectionId}:`, err.message);
      if (this.onError && typeof this.onError === 'function') {
        try {
          this.onError(err);
        } catch (err) {
          console.error('Error in onError handler:', err);
        }
      }
    });

    this.socket.on('close', (hadError) => {
      if (hadError) {
        console.error(`Connection ${this.connectionId} closed due to an error.`);
      }

      if (this.onEnd && typeof this.onEnd === 'function') {
        try {
          this.onEndLogged = false; // Reset the flag for the next connection
          this.onEnd();
        } catch (err) {
          console.error('Error in onEnd handler:', err);
        }
      }
    });
  }

  handleData(data) {
    const failedLoginBuffer = Buffer.from([0x0a, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]);
    
    if (Buffer.compare(data, failedLoginBuffer) === 0) {
      // Failed login
      console.log(`Login failed for instance ${this.connectionId}`);
      this.disconnect();  // Disconnect if login failed
    } else {
      // Process other responses
      const size = data.readInt32LE(0);
      const requestId = data.readInt32LE(4);
      const responseType = data.readInt32LE(8);
      const payloadBuffer = data.slice(12);
      const printablePayload = payloadBuffer.toString('utf-8').replace(/[^\x20-\x7E\u{4E00}-\u{9FFF}\u{3040}-\u{309F}\u{30A0}-\u{30FF}\u{AC00}-\u{D7AF}\u{0400}-\u{04FF}]/ug, '');
  
      if (responseType === 2 && requestId === 0) {
        // Successful login
        this.authenticated = true;
        console.log(`Login successful for instance ${this.connectionId}`);
        this.sendQueuedCommands();
      } else {
        // Process other responses
        if (this.onData && typeof this.onData === 'function') {
          this.onData({ size, requestId, responseType, response: printablePayload });
        }
      }
    }
  }  
    

  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      // Check if the socket is connected and authenticated
      if (this.socket && !this.socket.destroyed && this.authenticated) {
        const commandBuffer = Buffer.from(command, 'utf-8');
        const size = 14 + commandBuffer.length;

        const commandPacket = Buffer.alloc(size);
        commandPacket.writeInt32LE(size, 0);
        commandPacket.writeInt32LE(1, 4);
        commandPacket.writeInt32LE(2, 8);
        commandBuffer.copy(commandPacket, 12);

        commandPacket.writeInt16LE(0, size - 2);

        // Send the command
        this.socket.write(commandPacket, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else if (!this.socket || this.socket.destroyed) {
        // If the socket is not connected or destroyed, queue the command and attempt to reconnect
        this.queueCommand(command);
        this.reconnect();
        resolve(); // Resolve immediately for asynchronous compatibility
      } else {
        // If the socket is still connecting, queue the command and wait for the 'connect' event
        this.queueCommand(command);
        this.socket.once('connect', () => {
          // Ensure the socket is authenticated before sending any queued commands
          if (this.authenticated) {
            this.sendQueuedCommands();
          }
          resolve(); // Resolve after connection is established
        });
      }
    });
  }

  reconnect() {
    // Check if a reconnection attempt is already in progress
    if (!this.reconnecting) {
      this.reconnecting = true;

      // Disconnect the current socket
      this.disconnect();

      // Attempt to reconnect after 5 second delay
      setTimeout(() => {
        this.connect();
        this.reconnecting = false;
      }, 5000);
    }
  }

  queueCommand(command) {
    this.commandQueue.push(command);
  }

  sendQueuedCommands() {
    while (this.commandQueue.length > 0) {
      this.sendCommand(this.commandQueue.shift());
    }
  }

  disconnect() {
    console.log(`Disconnecting ${this.connectionId}`);
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
  }

  static async Send(target, command) {
    if (target === 'all') {
      const sendPromises = PalRCONClient.connections.map((instance) => PalRCONClient.Send(instance, command));
      return Promise.all(sendPromises);
    } else {
      const instance = target instanceof PalRCONClient ? target : PalRCONClient.connections.find((client) => client.connectionId === target);
  
      if (instance) {
        if (!instance.authenticated) {
          instance.connect();
        }
        return instance.sendCommand(command);
      } else {
        throw new Error(`Instance with identifier '${target}' not found.`);
      }
    }
  }

  static async Broadcast(target, message) {
    if (target === 'all') {
      const broadcastPromises = PalRCONClient.connections.map((instance) => PalRCONClient.Broadcast(instance, command));
      return Promise.all(broadcastPromises);
    } else {
      const instance = target;
      if (!instance.authenticated) {
        instance.connect();
      }
      const broadcastMessage = `${message.replace(/ /g, "_")}`;
      return instance.sendCommand(`Broadcast ${broadcastMessage}`);
    }
  }

  static async Save(target) {
    if (target === 'all') {
      const savePromises = PalRCONClient.connections.map((instance) => PalRCONClient.Save(instance));
      return Promise.all(savePromises);
    } else {
      const instance = target;
      if (!instance.authenticated) {
        instance.connect();
      }
      return instance.sendCommand("save");
    }
  }

  static async Shutdown(target, time = '1', message = '') {
    if (target === 'all') {
      const shutdownPromise = PalRCONClient.connections.map((instance) => PalRCONClient.Shutdown(instance));
      return Promise.all(shutdownPromise);
    } else {
      const instance = target;
      if (!instance.authenticated) {
        instance.connect();
      }
      const shutdownMessage = `${message.replace(/ /g, "_")}`;
      return instance.sendCommand(`Shutdown ${time} ${shutdownMessage}`);
    }
  }

  static async ShowPlayers(target) {
    if (target === 'all') {
      const showPlayersPromise = PalRCONClient.connections.map((instance) => PalRCONClient.ShowPlayers(instance));
      return Promise.all(showPlayersPromise);
    } else {
      const instance = target;
      if (!instance.authenticated) {
        instance.connect();
      }
      return instance.sendCommand("ShowPlayers");
    }
  }

  static async Kick(target, steamId) {
    if (target === 'all') {
      const kickPromise = PalRCONClient.connections.map((instance) => PalRCONClient.Kick(instance));
      return Promise.all(kickPromise);
    } else {
      const instance = target;
      if (!instance.authenticated) {
        instance.connect();
      }
      return instance.sendCommand(`KickPlayer ${steamId}`);
    }
  }

  static async Ban(target, steamId) {
    if (target === 'all') {
      const banPromise = PalRCONClient.connections.map((instance) => PalRCONClient.Ban(instance));
      return Promise.all(banPromise);
    } else {
      const instance = target;
      if (!instance.authenticated) {
        instance.connect();
      }
      return instance.sendCommand(`BanPlayer ${steamId}`);
    }
  }
}

PalRCONClient.connections = [];

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

module.exports = PalRCONClient;