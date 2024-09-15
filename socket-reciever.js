// server.js
const net = require('net');

const serverStates = {
    WAITING_FOR_COMMAND: 'WAITING_FOR_COMMAND',
    WAITING_FOR_DATA: 'WAITING_FOR_DATA',
    CLOSED: 'CLOSED'
}

const server = net.createServer((socket) => {
    var SERVER_STATE = serverStates.WAITING_FOR_COMMAND;
    
    console.log('Square like a rubix cube');
    console.log(socket);
    console.log(JSON.stringify(socket));

    // Send a welcome message to the client
    try {
        socket.write('Welcome to the TCP server!');
    }
    catch (e) {
        console.log('Error sending welcome message');
        console.error(e);
    }

    // Handle incoming messages from clients
    socket.on('data', (data) => {
        if(data.toString().startsWith('JSON-')) {
            console.log('JSON data received');
            const jsonData = JSON.parse(data.toString().substring(5));
            console.log(jsonData);
        }
        else
            console.log(`Received: ${data}`);

        // Echo the received message back to the client
        socket.write(`ACK`);
    });

    // Handle client disconnection
    socket.on('end', () => {
        console.log('Client disconnected.');
    });


});

server.listen(8080, () => {
    console.log('Server is listening on port 8080');
});
