
const customer = "Grieg Seafood Rogaland";
const locale = "stjernelaks";
const numOfSensors = 20;
var gotJSON = [];

$( document ).ready(function() {
    $("#locale-title").html(customer + ": " +  locale.charAt(0).toUpperCase() + locale.slice(1));
});

// Create a client instance
var client = new Paho.MQTT.Client("m24.cloudmqtt.com", 36821,"web_" + parseInt(Math.random() * 100, 10));


// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;
var options = {
    useSSL: true,
    userName: "pornkawy",
    password: "ELBK_4cc5nGY",
    onSuccess:onConnect,
    onFailure:doFail
}

// connect the client
client.connect(options);

// called when the client connects
function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    console.log("onConnect");

    for (i=0;i<numOfSensors;i++) {
        client.subscribe("pressure/"+ locale + "/sensor" + i);
        console.log("Subscribed to " + "pressure/"+ locale + "/sensor" + i);
    }
    message = new Paho.MQTT.Message("Hello from " + locale + "!");
    message.destinationName = "pressure/debug";
    client.send(message);
}

function doFail(e){
    console.log(e);
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:"+responseObject.errorMessage);
    }
}

// called when a message arrives
function onMessageArrived(message) {

    console.log("msg arrived");
    let sensorNumber = message.destinationName.match(/\d+/g);
    console.log(message.destinationName);

    console.log(message.payloadString);

    let dataJSON = JSON.parse(message.payloadString);

    console.log(dataJSON);
    gotJSON[sensorNumber] = JSON.parse(message.payloadString);
    gotJSON[sensorNumber].topic = message.destinationName;
    console.log(dataJSON);
    console.log(gotJSON[sensorNumber].reading.val);
    console.log(gotJSON[sensorNumber].reading.time);
    console.log(gotJSON[sensorNumber].topic);

    $("#sensor" + sensorNumber + "_t").html("Avlesningstidspunkt: " +gotJSON[sensorNumber].reading.time);
    $("#sensor" + sensorNumber + "_t2").html("Avlesningstidspunkt: " +gotJSON[sensorNumber].reading.time);
    $(".sensor" + sensorNumber).css("display","flex")
    $("#sensor" + sensorNumber).html("Sensor " + sensorNumber + ": " +gotJSON[sensorNumber].reading.val + " kPa");
    $(".sensor" + sensorNumber).css("display","flex")

    if (gotJSON[sensorNumber].reading.val < 98) {
        $(".sensor" + sensorNumber).css("background-color", "green");
    } else if (gotJSON[sensorNumber].reading.val < 101) {
        $(".sensor" + sensorNumber).css("background-color", "yellow");
    } else {
        $(".sensor" + sensorNumber).css("background-color", "red");
    }


    }
