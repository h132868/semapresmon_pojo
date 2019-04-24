const customer = "Grieg Seafood Rogaland";
const locale = "stjernelaks";
const numOfSensors = 20;

const gotJSON = [];
const liveTopics = [];
let liveChart;
let dbChart;


$( document ).ready(function() {
    $("#locale-title").html(customer + ": " +  locale.charAt(0).toUpperCase() + locale.slice(1));
});

//MQTT PART
// Create a dbClient instance
let mqttClient = new Paho.MQTT.Client("m24.cloudmqtt.com", 36821, "web_" + parseInt(Math.random() * 100, 10));

// set callback handlers
mqttClient.onConnectionLost = onConnectionLost;
mqttClient.onMessageArrived = onMessageArrived;
const options = {
    useSSL: true,
    userName: "pornkawy",
    password: "ELBK_4cc5nGY",
    onSuccess: onConnect,
    onFailure: doFail
};

// connect the dbClient
mqttClient.connect(options);

// called when the dbClient connects
function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    console.log("onConnect");

    for (let i=0;i<numOfSensors;i++) {
        mqttClient.subscribe("pressure/"+ locale + "/sensor" + i,0);
        console.log("Subscribed to " + "pressure/"+ locale + "/sensor" + i);
    }
    mqttClient.send("pressure/debug","Hello from " + locale + "!",0,false);
}

function doFail(e){
    console.log(e);
}

// called when the dbClient loses its connection
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:"+responseObject.errorMessage);
    }
}

// called when a message arrives
function onMessageArrived(message) {

    let sensorNumber = message.destinationName.match(/\d+/g);
    gotJSON[sensorNumber] = JSON.parse(message.payloadString);
    gotJSON[sensorNumber].topic = message.destinationName;

    //Write the hover tooltip for the list TODO: make invisible upon hover if no data
    $("#s" + sensorNumber + "-t1")
        .html("Avlesningstidspunkt: " +gotJSON[sensorNumber].time);
    //Write the hover tooltip for the map  TODO: make invisible upon hover if no data
    $("#s" + sensorNumber + "-t2")
        .html("Avlesningstidspunkt: " +gotJSON[sensorNumber].time);
    // Make the list text visible if a message arrives
    $("#s" + sensorNumber).css("visibility","visible")
        .html("Sensor " + sensorNumber + ": " +gotJSON[sensorNumber].val + " kPa");


    if (gotJSON[sensorNumber].val < 98) {
        $(".s" + sensorNumber).css("background-color", "green");
    } else if (gotJSON[sensorNumber].val < 101) {
        $(".s" + sensorNumber).css("background-color", "yellow");
    } else {
        $(".s" + sensorNumber).css("background-color", "red");
    }
    //  LIVE GRAPH PART
    //  Make sure every data topic gets it's unique data series
    let liveChartNo = getTopicIdAndCreateSeries(liveChart,liveTopics,message.destinationName);
    plotData(liveChart, gotJSON[sensorNumber],liveChartNo)
    }

    function getTopicIdAndCreateSeries(chart, topicList, topic) {
        //check if it is a new topic, if not add it to the array
        if (topicList.indexOf(topic) < 0) {

            topicList.push(topic); //add new topic to array
            let y = topicList.indexOf(topic); //get the index no

            //create new data series for the chart
            let newseries = {
                id: y,
                name: topic,
                data: []
            };
            chart.addSeries(newseries); //add the series
        }
        return topicList.indexOf(topic);
    }

function getTopicId(topicList, topic) {
    //check if it is a new topic, if not add it to the array
    if (topicList.indexOf(topic) < 0) {

        topicList.push(topic); //add new topic to array
    }
    return topicList.indexOf(topic);
}


function createSeriesWithData(chart, id, topicList, data) {
        //create new data series for the chart
        let newseries = {
            id: id,
            name: topicList[id],
            data: data[id]
        };
        chart.addSeries(newseries); //add the series
}

function plotData(chart, data, chartNo) {
    let timeGot = new Date(data.time).getTime();
    let valGot = data.val;
    let series = chart.series[chartNo],
        shift = series.data.length > 20; // shift if the series is longer than 20
    // add the point
    chart.series[chartNo].addPoint([timeGot, parseFloat(valGot)], true, shift);
}

   //MONGODB GRAPH PART


$(function(){
    liveChart = Highcharts.chart('highcharts-live-flex', {
        chart: {
            zoomType: 'x'
        },
        title: {
            text: 'Time'
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis: {
            title: {
                text: 'Pressure (kPa)'
            }
        },
    });
});


$(function () {
    let dataSeries = [];
    let topicList = [];
    fetch('https://eu-west-1.aws.webhooks.mongodb-stitch.com/api/client/v2.0/app/semapres-charts-dsioa/service/get-chart-data/incoming_webhook/get-day?secret=AcHpa630chDjUg')
        .then(
        function (response) {
            return response.json();
        }
    ).then(function (jsonData) {
        for (let i = 0; i < jsonData.length; i++) {
            let time = jsonData[i][0].$date.$numberLong;
            let val = jsonData[i][1].$numberDouble;
            let topicId = getTopicId(topicList, jsonData[i][2]);
            if (!Array.isArray(dataSeries[topicId])) {
                dataSeries[topicId] = [];
            }
            dataSeries[topicId].push([parseInt(time),parseFloat(val)]);
        }
        for (let i=0; i<topicList.length;i++) {
            createSeriesWithData(dbChart,i,topicList,dataSeries)
        }
    })
    });

$(function () {
    dbChart = Highcharts.chart('highcharts-dblookup-flex', {
        chart: {
            zoomType: 'x'
        },
        title: {
            text: 'Time'
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis: {
            title: {
                text: 'Pressure (kPa)'
            }
        }
    })
});
