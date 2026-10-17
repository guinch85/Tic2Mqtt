let serialPort = require('serialport');
let events = require('events');

function teleinfoBck(portCom) {
    // Evénements 'trame' et 'tramedecodee'
    console.log("Start waiting frame");
    let frameEvents = new events.EventEmitter();

    let ReadLine = serialPort.parsers.Readline;

    let port = new serialPort(portCom, {
        baudRate: 1200,
        dataBits: 7,
        parity: 'even',
        stopBits: 1,
    });

    process.on('exit', function () {
        port.close(function (err) {
            console.log('port closed', err);
        });
    });

    let readLineParser = new ReadLine({delimiter: String.fromCharCode(13, 3, 2, 10)});
    let parser = port.pipe(readLineParser); // Caractères séparateurs = fin de trame + début de trame

    parser.on('data', function (data) {
        console.log("********** data ************");
        console.log(data);
        frameEvents.emit('frame', data);
    });

    parser.on('error', function (err) {
        frameEvents.emit('error', err);
    });

    frameEvents.on('frame', function (data) {
        // Decode trame '9 lignes en tarif bleu base'
        let frame = {};
        let arrayOfData = data.split('\r\n');
        for (let i = 0; i < arrayOfData.length; i++) {
            decodeLine(arrayOfData[i], frame, frameEvents);
        }
        // trame incomplete s'il manque la première ligne ADCO
        if (!(frame.ADCO === undefined)) {
            frameEvents.emit('frameDecode', frame);
        }
        else {
            let err = new Error('Frame incomplete');
            frameEvents.emit('error', err);
        }
    });

    return frameEvents;
}


function decodeLine(rawLine, frame, frameEvents) {
    //console.log("decodeligne : " + ligneBrute);
    // Ligne du type "PAPP 00290 ," (Etiquette / Donnée / Checksum)
    let elementsLine = rawLine.split(' ');

    /*
    for (let i = 0; i < elementsLine.length; i++) {
        let element = elementsLine[i];
        console.log("element["+i+"]:"+element);
    }
    */

    if (elementsLine.length === 3) {
        // Spec chk : somme des codes ASCII + ET logique 03Fh + ajout 20 en hexadécimal
        // Résultat toujours un caractère ASCII imprimable allant de 20 à 5F en hexadécimal
        // Checksum calculé sur etiquette+space+données => retirer les 2 derniers caractères
        //console.log("decodeligne3 : " + rawLine);
        let sum = 0;
        let j;
        for (j = 0; j < rawLine.length - 2; j++) {
            sum += rawLine.charCodeAt(j);
        }
        sum = (sum & 63) + 32;
        if (sum === rawLine.charCodeAt(j + 1)) {
            // Checksum ok -> on ajoute la propriété à la trame
            // Conversion en valeur numérique pour certains cas
            switch (elementsLine[0].substr(0, 4)) {
                case 'BASE': // Index Tarif bleu
                case 'HCHC': // Index Heures creuses
                case 'HCHP': // Index Heures pleines
                case 'EJPH': // Index EJP (HN et HPM)
                case 'BBRH': // Index Tempo (HC/HP en jours Blanc, Bleu et Rouge)
                case 'ISOU': // Intensité souscrite
                case 'IINS': // Intensité instantannée (1/2/3 pour triphasé)
                case 'ADPS': // Avertissement de dépassement
                case 'IMAX': // Intensité max appelée (1/2/3 pour triphasé)
                case 'PAPP': // Puissance apparente
                case 'PMAX': // Puissance max triphasée atteinte
                    frame[elementsLine[0]] = Number(elementsLine[1]);
                    break;
                default:
                    frame[elementsLine[0]] = elementsLine[1];
            }
            return true;
        } else {
            console.log('Error checksum : \n' + rawLine + '\n Checksum calculé/reçu : ' + sum + ' / ' + rawLine.charCodeAt(j + 1));
            let err = new Error('Error checksum : \n' + rawLine + '\n Checksum calculé/reçu : ' + sum + ' / ' + rawLine.charCodeAt(j + 1));
            //let err = new Error('Erreur de checksum : \n' + ligneBrute + '\n Checksum calculé/reçu : ' + sum + ' / ');
            frameEvents.emit('error', err);
        }
    }
    if (elementsLine.length === 4 && elementsLine[0].substr(0, 4) === "PTEC") {
        frame[elementsLine[0]] = elementsLine[1];
    }
}

module.exports = teleinfoBck;