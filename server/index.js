import { config } from 'dotenv';
config();

import { WebSocketServer, WebSocket } from 'ws';
import { getClaimedThreads, createClaimedThread, deleteClaimedThread, initDatabase } from './db.js';
import { extractDisplayNameFromEPFLEmail } from './util.js';

initDatabase();

const wss = new WebSocketServer({ port: process.env.PORT || 3000 });

wss.on('connection', async function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', async function message(rawData) {
        const data = JSON.parse(rawData);
        if (data.event === 'connected') {
            console.log('connected', data.data);
        }
        if (data.event === 'claim_thread') {
            console.log('claiming thread', data.data);
            await createClaimedThread(data.data.threadId, data.data.userEmail, extractDisplayNameFromEPFLEmail(data.data.userEmail));
            const claims = await getClaimedThreads();
            wss.clients.forEach(client => {
                console.log('sending update to client');
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        event: 'claims_update',
                        data: claims
                    }));
                }
            });
        }
        if (data.event === 'unclaim_thread') {
            console.log('unclaiming thread', data.data);
            await deleteClaimedThread(data.data.threadId);
            const claims = await getClaimedThreads();
            wss.clients.forEach(client => {
                console.log('sending update to client');
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        event: 'claims_update',
                        data: claims
                    }));
                }
            });
        }
    });

    ws.send(JSON.stringify({
        event: 'claims_update',
        data: await getClaimedThreads()
    }));
});
