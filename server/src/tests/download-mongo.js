// Pre-download the MongoDB binary for mongodb-memory-server
// Run this once: node src/tests/download-mongo.js

import { MongoMemoryServer } from 'mongodb-memory-server';

console.log('Downloading MongoDB binary for testing (this is a one-time download)...');
console.log('This may take several minutes depending on your connection speed.');

const server = await MongoMemoryServer.create();
console.log('MongoDB binary downloaded and verified successfully.');
console.log(`Instance URI: ${server.getUri()}`);
await server.stop();
console.log('Done. Future test runs will use the cached binary.');
