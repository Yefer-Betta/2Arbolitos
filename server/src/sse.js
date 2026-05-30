const sseClients = new Map();

export function addSSEClient(clientId, res) {
  sseClients.set(clientId, res);
}

export function removeSSEClient(clientId) {
  sseClients.delete(clientId);
}

export function notifySSEClients(event, data) {
  sseClients.forEach((client, id) => {
    try {
      client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      sseClients.delete(id);
    }
  });
}
