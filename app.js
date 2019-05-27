const customer = "Grieg Seafood Rogaland";
const locale = "stjernelaks";
const numOfSensors = 20;

const gotJSON = [];
const liveTopics = [];
let liveChart;
let dbChart24h, dbChart1h, dbChart1M;


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
        mqttClient.subscribe("pressure/"+ locale + "/s" + i,0);
        console.log("Subscribed to " + "pressure/"+ locale + "/s" + i);
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



//graph for last day
function generateDayGraph() {
    console.log("starting fetch day");
    let dataSeries = [];
    let topicList = [];
    fetch('https://eu-west-1.aws.webhooks.mongodb-stitch.com/api/client/v2.0/app/semapres-charts-dsioa/service/get-chart-data/incoming_webhook/get-day?secret=AcHpa630chDjUg')
        .then(
        function (response) {
            console.log("ending fetch day");
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
            createSeriesWithData(dbChart24h,i,topicList,dataSeries)
        }
    })
    console.log("done making graph day");

};

$(function () {
    dbChart24h = Highcharts.chart('highcharts-db-24h', {
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

//graph for last month
function generateMonthGraph() {
    let dataSeries = [];
    let topicList = [];
    console.log("starting fetch month");
    fetch('https://eu-west-1.aws.webhooks.mongodb-stitch.com/api/client/v2.0/app/semapres-charts-dsioa/service/get-chart-data/incoming_webhook/get-month?secret=I-5N9t0m1gUlFYB')
        .then(
            function (response) {
                console.log("ending fetch month");
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
            createSeriesWithData(dbChart1M,i,topicList,dataSeries)
        }
        console.log("done making graph month");
    })
};

$(function () {
    dbChart1M = Highcharts.chart('highcharts-db-1M', {
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


//Graph for last hour
function generateHourGraph() {
    let dataSeries = [];
    let topicList = [];
    console.log("starting fetch hour");
    fetch('https://eu-west-1.aws.webhooks.mongodb-stitch.com/api/client/v2.0/app/semapres-charts-dsioa/service/get-chart-data/incoming_webhook/get-hour?secret=o`P\'Y168thD2l9D')
     .then(
            function (response) {
                console.log("ending fetch hour");
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
            createSeriesWithData(dbChart1h,i,topicList,dataSeries)
        }
    })
    console.log("done making graph hour");
};

$(function () {
    dbChart1h = Highcharts.chart('highcharts-db-1h', {
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

function show(id) {
    document.getElementById(id).style.visibility = "visible";
}
function hide(id) {
    document.getElementById(id).style.visibility = "hidden";
}
function openTab(evt, tabName) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}
