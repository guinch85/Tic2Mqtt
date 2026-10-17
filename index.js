let toolkit = require("./utils/toolkit.js");
let teleInfo = require("./utils/teleinfo.js");
let mqtt = require('mqtt');
const util = require("util");

const config = require('./config.json');

let clientMqtt = mqtt.connect('mqtt://' + config.mqtt.serverIp);
clientMqtt.on('connect', function () {
    clientMqtt.publish('Generic', 'Hello broker, here TicModule');
});

let frameEvents = teleInfo("/dev/serial0");

frameEvents.on('frameDecode', function (data) {
    console.log("*** Start event decode ***");
    console.log(util.inspect(data));

    toolkit.edfLastFrame = data;

    let rawADCO = data.ADCO;
    let rawOPTARIF = data.OPTARIF;
    let rawISOUSC = data.ISOUSC;
    let rawHCHC = data.HCHC;
    let rawHCHP = data.HCHP;
    let rawPTEC = data.PTEC;
    let rawIINST = data.IINST;
    let rawIMAX = data.IMAX;
    let rawPAPP = data.PAPP;

    let PTEC = "Heures Pleines";
    if (rawPTEC === "HC..")
        PTEC = "Heures Creuses";

    toolkit.edfInfo = {
        adrCpt: rawADCO,
        idxHC: rawHCHC,
        idxHP: rawHCHP,
        power: rawPAPP,
        intensity: rawIINST,
        PTEC: PTEC
    };

    console.log("*** Start send data to Mqtt Broker ***");
    console.log(JSON.stringify(toolkit.edfInfo));
    clientMqtt.publish(config.mqtt.topic, JSON.stringify(toolkit.edfInfo));
    console.log("*** Data to Mqtt Broker send ***");
});