const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const net = require("net");
const fs = require("fs");
const HTTP_PORT = 3000;
const SERVER_SOCKET_PORT = 8080;

const isDev = false;
const startTimeEpoch = (new Date()).getTime();
const batteryOffset = 0.0; //percentage of battery used from previous run
const batteryLifeInSeconds = 1800; 

require("dotenv").config();
const THINGSPEAK_API_KEY = process.env.THINGSPEAK_APIKEY;

if (!!!THINGSPEAK_API_KEY) {
  console.error("THINGSPEAK_APIKEY not found in .env file");
  console.log(
    "Create a .env file with a variable called `THINGSPEAK_APIKEY` and assign it the value of your ThinkSpeak Write API Key"
  );
  process.exit(1);
}

var MovementQueue = [];
var cachedData;

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
};

const writeJSONCache = (path2jsonCache, content) => {
  let data = JSON.stringify(content);
  fs.writeFileSync(path2jsonCache, data);
};

const readSessionCache = (path2sessionCache) => {
  let data = fs.readFileSync(path2sessionCache);
  let jsonData = JSON.parse(data);
  return jsonData;
};

const writeSessionCache = (path2sessionCache, content) => {
  let data = JSON.stringify(content);
  fs.writeFileSync(path2sessionCache, data);
};

const GenerateRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const GenerateRandomFloat = (min, max) => {
  return Math.random() * (max - min) + min;
};

const GenerateRandomLatitude = () => {
  return GenerateRandomFloat(-90, 90);
};

const getCurrentEpochTime = () => {
  return Math.floor(Date.now() / 1000);
};

// today is a dateTime object initialized with the current time
function getFormattedTimeInThingSpeakFormat(today = null) {
  // "2018-04-23 21:36:20 +0200"
  if (!today) {
    today = new Date();
  }

  //should be done better but this works for now
  const offset = "-0300";

  let year = today.getFullYear() % 100;
  let month = today.getMonth().toString().padStart(2, "0");
  let day = today.getDate().toString().padStart(2, "0");

  let hours = today.getHours().toString().padStart(2, "0");
  let minutes = today.getMinutes().toString().padStart(2, "0");
  let seconds = today.getSeconds().toString().padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${offset}`;
}

function formatSensorDataForElectron(sensorData, isCached = false) {
  let pressureData = sensorData["pressure"];
  let temperatureData = sensorData["temperature"];
  let humidityData = sensorData["humidity"];
  let batteryData =  parseInt((1 - (((new Date()).getTime() - startTimeEpoch) / batteryLifeInSeconds/10000) - batteryOffset  ) * 100)
  let gascomposition = sensorData["gascomposition"]; //bool : isSafe
  let gasHazardText = "";

  gascomposition
    ? (gasHazardText = "No hazardous gasses detected, environment SAFE")
    : "Hazardous gasses detected, environment NOT SAFE";

  let dispatchTime = null;

  if (isCached) {
    dispatchTime = sensorData["LastSensorDataReceived"];
    console.log("Taking data from cache");
  } else dispatchTime = getCurrentEpochTime();

  console.assert(
    pressureData != null &&
      temperatureData != null &&
      humidityData != null &&
      batteryData != null,
    "Sensor Data is null",
    sensorData
  );

  var sensor_data_frame = [
    {
      type: "Temperature",
      value: temperatureData,
      "unit-str": "°C",
      "dispatched-at": dispatchTime,
    },
    {
      type: "Pressure",
      value: pressureData,
      "unit-str": "mBar",
      "dispatched-at": dispatchTime,
    },
    {
      type: "Humidity",
      value: humidityData,
      "unit-str": "%",
      "dispatched-at": dispatchTime,
    },
    {
      type: "Battery",
      value: batteryData.toString(),
      "unit-str": "%",
      "dispatched-at": dispatchTime,
    },
    {
      type: "GasHazard",
      value: gasHazardText,
      "unit-str": " ",
      "dispatched-at": dispatchTime,
    },
  ];
  return sensor_data_frame;
}

// for localized testing, don't run in production
function getDummyData() {
  const dummy_sensor_data_frame = [
    {
      type: "Temperature",
      value: GenerateRandomFloat(10, 40),
      "unit-str": "°C",
      "dispatched-at": getCurrentEpochTime(),
    },
    {
      type: "Pressure",
      value: GenerateRandomInt(900, 1100),
      "unit-str": "mBar",
      "dispatched-at": getCurrentEpochTime(),
    },
    {
      type: "Humidity",
      value: GenerateRandomInt(0, 100),
      "unit-str": "%",
      "dispatched-at": getCurrentEpochTime(),
    },
    {
      type: "Battery",
      // value: GenerateRandomInt(0, 100),
      value: parseInt((1- (((new Date()).getTime() - startTimeEpoch) / batteryLifeInSeconds/10000) - batteryOffset  ) * 100).toString(),
      "unit-str": "%",
      "dispatched-at": getCurrentEpochTime(),
    },
    {
      type: "GasHazard",
      value: `This is a mock gas-hazard`,
      "unit-str": "",
      "dispatched-at": getCurrentEpochTime(),
    },
  ];
  return dummy_sensor_data_frame;
}

async function WriteToThingSpeak(data) {
  /*
        In Order
            - Pressure
            - Temperature 
            - Humidity
            - Battery

        Slightly mixed up with respect to order in data
    */

  let timeStr = null;
  console.log("Sending data to thingspeak");

  if (isDev) timeStr = getFormattedTimeInThingSpeakFormat();
  else {
    let _newDate = new Date(data[0]["dispatched-at"] * 1000);
    timeStr = getFormattedTimeInThingSpeakFormat(_newDate);
  }

  let toSend = {
    api_key: THINGSPEAK_API_KEY,
    created_at: timeStr,
    field1: data[1].value,
    field2: data[0].value,
    field3: data[2].value,
    field4: data[3].value,
    latitude: "",
    longitude: "",
    status: "Log From ST-Discovery-L475E-IOT01A",
  };

  const url = "https://api.thingspeak.com/update.json";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toSend),
  });

  var json = await res.json();
  //   console.log();
  json["field5"] = 482;
  console.log(json);
}

/*Sensor Data Handler*/

app.get("/sensor-data", (req, res) => {
  if (isDev) res.json(getDummyData());
  else res.json(formatSensorDataForElectron(cachedData));
});

/*Movement Data Handler*/

app.post("/command", (req, res) => {
  console.log("POST Request Received");
  console.log(req.body);

  const direction = req.body.direction;
  let _ = `Moving: ${direction}`;
  // console.log(_);
  // res.send(_);

  MovementQueue.push(direction);
  res.send("OK");
});

//test endpoint to write to thingspeak
app.get("/test-dummy-data", (req, res) => {
  let dummy_sensor_data = getDummyData();
  WriteToThingSpeak(dummy_sensor_data)
    .then(() => {
      console.log("Logged sensor data to thingspeak");
      res.send("OK");
    })
    .catch((err) => {
      console.error(err);
      res.send("Error");
    });
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

//request is initiated by the client (aka ST-Discovery-L475E-IOT01A)
const server = net.createServer((socket) => {
  console.log("New client connected!"); //this is step - 1, we get a new client
  console.log(
    "Client connected from IP:",
    socket.remoteAddress,
    "Port:",
    socket.remotePort
  );

  var session_data = readSessionCache("session-cache.json");
  writeSessionCache("session-cache.json", {
    ...session_data,
    ClientIP: socket.remoteAddress,
    ClientPort: socket.remotePort,
  });

  // Handle incoming messages from clients
  socket.on("data", (data) => {
    console.log(`Received: ${data}`);

    if (data.toString().startsWith("ACK")) {
      //acknowledgement received
      console.log("ACK received");
      const unixTimeSessionStart = getCurrentEpochTime();
      session_data = readSessionCache("session-cache.json");
      writeSessionCache("session-cache.json", {
        ...session_data,
        StartTime: unixTimeSessionStart,
      }); //at this point ack start ping pong is done
      socket.write("PONG");
      console.log("PONG sent");
    }

    if (data.toString().startsWith("SENSOR-DATA")) {
      const jsonString = data.toString().substring(data.indexOf("{"));
      const unixTimeReceiveSensorData = getCurrentEpochTime();
      try {
        var jsonData = JSON.parse(jsonString);
        jsonData["gascomposition"] = null;
        cachedData = jsonData;

        writeSessionCache("sensor-data-cache.json", {
          LastSensorDataReceived: unixTimeReceiveSensorData,
          ...jsonData,
        });

        if (MovementQueue.length > 0) {
          const direction = MovementQueue.shift();
          console.log(`Sending :: MOVEMENT-${direction}`);
          socket.write(`MOVEMENT-${direction}`);
        } else {
          socket.write("NO-MOVEMENT");
        }
      } catch (SyntaxError) {
        console.log(`Error parsing JSON`);
      }
    }
  });
});

//////////////////////////////////////////////////////////////////////////////////
////////////////////////// ThinkSpeak Layer //////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

const interval15m = 15 * 60000; // 15 minutes
const interval30s = 30 * 1000; // 30 seconds
const interval10s = 10 * 1000; // 30 seconds

setInterval(() => {
  let dataToSend = null;

  if (isDev) dataToSend = getDummyData();
  else {
    const cachedData = readSessionCache("sensor-data-cache.json");
    const sensor_data_frame = formatSensorDataForElectron(cachedData, true);
    dataToSend = sensor_data_frame;
    dataToSend[4].value = 0; //culling string value to 0
  }

  WriteToThingSpeak(dataToSend)
    .then(() => {
      console.log("Logged sensor data to thingspeak");
      console.log(dataToSend);
      console.log("====================================");
    })
    .catch((err) => {
      console.log("Error while logging sensor data to thingspeak");
      console.error(err);
    });
}, interval10s);

//////////////////////////////////////////////////////////////////////////////////
///////////////////////////// Listeners //////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

app.listen(HTTP_PORT, () => {
  console.log(`Server running @ http://localhost:${HTTP_PORT}`);
  if (isDev) console.log("In server side testing mode");
});

server.listen(SERVER_SOCKET_PORT, () => {
  console.log("Socket messages will be received on port 8080");
});
