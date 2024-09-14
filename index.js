const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const net = require('net');
const fs = require('fs');

const HTTP_PORT = 3000;
const SERVER_SOCKET_PORT = 8080;

//////////////////////////////////////////////////////////////////////////////////
////////////////////////// HTTP API Layer ////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

app.use(cors());
app.use(bodyParser.json());


/*
    Philosophy:
        * Make it as simple as possible

    Items:
    1. Temperature
    2. Pressure
    3. Humidity
    4. Battery Information
    5. GPS Information

*/

const readJSONCache = (path2jsonCache) => {
    let data = fs.readFileSync(path2jsonCache);
    let jsonData = JSON.parse(data);
    return jsonData;
}

const writeJSONCache = (path2jsonCache, content) => {
    let data = JSON.stringify(content);
    fs.writeFileSync(path2jsonCache, data);
}

const readSessionCache = (path2sessionCache) => {
    let data = fs.readFileSync(path2sessionCache);
    let jsonData = JSON.parse(data);
    return jsonData;
}

const writeSessionCache = (path2sessionCache, content) => {
    let data = JSON.stringify(content);
    fs.writeFileSync(path2sessionCache, data);
}

const GenerateRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const GenerateRandomFloat = (min, max) => {
    return Math.random() * (max - min) + min;
}

const GenerateRandomLatitude = () => {
    return GenerateRandomFloat(-90, 90);
}

const getCurrentEpochTime = () => {
    return Math.floor(Date.now() / 1000);
}

function getDummyData(){
    const dummy_sensor_data_frame = [
        {
            "type": "Temperature",
            "value": GenerateRandomFloat(10, 40) ,
            "unit-str": "°C",
            "dispatched-at": getCurrentEpochTime()
        },
        {
            "type": "Pressure",
            "value": GenerateRandomInt(900, 1100),
            "unit-str": "hPa",
            "dispatched-at": getCurrentEpochTime()
        },
        {
            "type": "Humidity",
            "value": GenerateRandomInt(0, 100),
            "unit-str": "%",
            "dispatched-at": getCurrentEpochTime
        },
        {
            "type": "Battery",
            "value": GenerateRandomInt(0, 100),
            "unit-str": "%",
            "dispatched-at": 1623987600
        }
    ]
    return dummy_sensor_data_frame;    
}

/*Sensor Data Handler*/

app.get('/sensor-data', (req, res) => {
    res.json(getDummyData());
    }

    //send JSON cache
    //res.json(readJSONCache('sensor-data.json'));
);

/*Movement Data Handler*/

app.post('/command', (req, res) => {
    console.log("POST Request Received");
    console.log(req.body);

    const direction = req.body.direction;
    let _ = `Moving: ${direction}`;
    console.log(_);
    // res.send(_);

    net.createConnection()



    //should send a message to STM32 -- figure it out
});

//////////////////////////////////////////////////////////////////////////////////
////////////////////////// Socket Layer //////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

// const STM32_SOCKET_PORT = ???

/* 
    listens for incoming connections for the following 
    1. Ack Ping Pong
    2. Sending Sensor Data Periodically

*/

const server = net.createServer((socket) => {
    console.log('New client connected!'); //this is step - 1, we get a new client
    console.log(socket.address())
    socket.write('Welcome to the TCP server! - Respond with ACK - Ping');
    console.log(socket.remoteAddress)

    // Handle incoming messages from clients
    socket.on('data', (data) => {

        console.log(`Received: ${data}`);

        if(data.toString().startsWith('ACK')) 
        {
            //acknowledgement received
            console.log('ACK received');
            const unixTimeSessionStart = getCurrentEpochTime();
            writeSessionCache('session-cache.json', { "StartTime": unixTimeSessionStart }); //at this point ack start ping pong is done
        }

        if(data.toString().startsWith('SENSOR-DATA')) 
        {
            console.log('Got a new batch of sensor data');
            const unixTimeReceiveSensorData = getCurrentEpochTime();

            //SENSOR-DATA-<JSON-Object>
            try{
                const jsonData = JSON.parse(data.toString().substring(12));
                writeSessionCache('session-cache.json', { "LastSensorDataReceived": unixTimeReceiveSensorData, ...jsonData });
            }
            catch(e){
                console.log('Error parsing JSON data');
                console.error(e);
            }
        }
        
        console.log(`Received: ${data}`);
    });


});

//////////////////////////////////////////////////////////////////////////////////
///////////////////////////// Listeners //////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////


app.listen(HTTP_PORT, () => {
    console.log(`Server running @ http://localhost:${HTTP_PORT}`);
});

server.listen(SERVER_SOCKET_PORT, () => {
    console.log('Socket messages will be received on port 8080');
});
