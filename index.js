const net = require('net');
const { Buffer } = require('buffer');
const crypto = require('crypto');

class PalRCONClient {
    constructor(host, port, password) {
        this.options = {
            host: host,
            port: port,
            password: password,
        };
        this.connected = false;
        this.authed = false;
        this.socket = new net.Socket();
        this.id = crypto.randomInt(2147483647);
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection(this.options.port, this.options.host);
            this.socket.once('error', () => reject(new Error('Connection error')));
            this.socket.once('connect', () => {
                this.connected = true;
                this.id = crypto.randomInt(2147483647);
                this.sendRawCommand(this.options.password, 3)
                    .then((response) => {
                        if (Buffer.isBuffer(response) && response.length >= 4) {
                            const receivedId = response.readUInt32LE(4);
                            if (receivedId === this.id) {
                                this.authed = true;
                                resolve(null);
                            } else {
                                this.disconnect();
                                reject(new Error('Authentication error'));
                            }
                        } else {
                            this.disconnect();
                            reject(new Error('Invalid response format'));
                        }
                    })
                    .catch((error) => reject(error));
            });

            this.socket.on('data', (data) => {
                // Handle incoming data if needed
            });
        });
    }

    async sendRawCommand(data, requestId) {
        return new Promise((resolve, reject) => {
            if (!this.connected) reject(new Error(`Authentication Error: ${this.options.host}:${this.options.port}`));

            const len = Buffer.byteLength(data, 'ascii');
            const buffer = Buffer.alloc(len + 14);
            buffer.writeInt32LE(len + 4, 0);
            buffer.writeInt32LE(this.id, 4);
            buffer.writeInt32LE(requestId, 8);
            buffer.write(data, 12, 'ascii');
            buffer.writeInt16LE(0, 12 + len);
            this.socket.write(buffer);

            let responseData = Buffer.alloc(0);

            const onData = (dataChunk) => {
                responseData = Buffer.concat([responseData, dataChunk]);
                const responseLength = responseData.readUInt32LE(0);

                if (responseLength > 0 && responseData.length >= responseLength) {
                    this.socket.removeListener('data', onData);
                    resolve(responseData);
                }
            };

            this.socket.on('data', onData);

            this.socket.once('error', (error) => {
                this.socket.removeListener('data', onData);
                reject(error);
            });
        });
    }

    static async Send(clientInstance, command) {
        try {
            await clientInstance.connect();
            const response = await clientInstance.sendRawCommand(command, 2);
            return response.subarray(12).toString('utf-8').replace(/\x00|\u0000/g, '');
        } catch (error) {
            throw new Error(` Instance ${clientInstance.options.host}:${clientInstance.options.port}: ${error.message}`);
        } finally {
            clientInstance.disconnect();
        }
    }

    static async ShowPlayers(clientInstance) {
        try {
            await clientInstance.connect();
            const response = await clientInstance.sendRawCommand('ShowPlayers', 2);
            return response.subarray(12).toString('utf-8').replace(/\x00|\u0000/g, '');
        } catch (error) {
            throw new Error(`Error for client at ${clientInstance.options.host}:${clientInstance.options.port}: ${error.message}`);
        } finally {
            clientInstance.disconnect();
        }
    }

    static async Broadcast(clientInstance, message) {
        try {
            await clientInstance.connect();
            let editedMessage = message.replace(/ /g, "_");
            const response = await clientInstance.sendRawCommand(`Broadcast ${editedMessage}`, 2);
            return response.subarray(12).toString('utf-8').replace(/\x00|\u0000/g, '');
        } catch (error) {
            throw new Error(`Error for client at ${clientInstance.options.host}:${clientInstance.options.port}: ${error.message}`);
        } finally {
            clientInstance.disconnect();
        }
    }

    static async Save(clientInstance) {
        try {
            await clientInstance.connect();
            const response = await clientInstance.sendRawCommand('Save', 2);
            return response.subarray(12).toString('utf-8').replace(/\x00|\u0000/g, '');
        } catch (error) {
            throw new Error(`Error for client at ${clientInstance.options.host}:${clientInstance.options.port}: ${error.message}`);
        } finally {
            clientInstance.disconnect();
        }
    }

    static async ShutDown(clientInstance, time, message) {
        try {
            await clientInstance.connect();
            let editedMessage = message.replace(/ /g, "_");
            if (!(/^\d+$/.test(time))) {
                throw new Error('Invalid time format. Time must contain only numbers.');
            }
            const response = await clientInstance.sendRawCommand(`ShutDown ${time} ${editedMessage}`, 2);
            return response.subarray(12).toString('utf-8').replace(/\x00|\u0000/g, '');
        } catch (error) {
            throw new Error(`Error for client at ${clientInstance.options.host}:${clientInstance.options.port}: ${error.message}`);
        } finally {
            clientInstance.disconnect();
        }
    }

    static async Kick(clientInstance, steamId) {
        try {
            await clientInstance.connect();
            if (!(/^\d+$/.test(steamId))) {
                throw new Error('Invalid steamId. steamId must contain only numbers.');
            }
            const response = await clientInstance.sendRawCommand(`KickPlayer ${steamId}`, 2);
            return response.subarray(12).toString('utf-8').replace(/\x00|\u0000/g, '');
        } catch (error) {
            throw new Error(`Error for client at ${clientInstance.options.host}:${clientInstance.options.port}: ${error.message}`);
        } finally {
            clientInstance.disconnect();
        }
    }

    static async Ban(clientInstance, steamId) {
        try {
            await clientInstance.connect();
            if (!(/^\d+$/.test(steamId))) {
                throw new Error('Invalid steamId. steamId must contain only numbers.');
            }
            const response = await clientInstance.sendRawCommand(`BanPlayer ${steamId}`, 2);
            return response.subarray(12).toString('utf-8').replace(/\x00|\u0000/g, '');
        } catch (error) {
            throw new Error(`Error for client at ${clientInstance.options.host}:${clientInstance.options.port}: ${error.message}`);
        } finally {
            clientInstance.disconnect();
        }
    }

    static async checkConnection(clientInstance) {
        try {
            await clientInstance.connect();
            return true;
        } catch (error) {
            return false;
        } finally {
            clientInstance.disconnect();
        }
    }

    disconnect() {
        this.connected = false;
        this.authed = false;
        this.socket.end();
    }
}

module.exports = { PalRCONClient };