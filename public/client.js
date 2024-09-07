const socket = io();
console.log("Connected to socket", socket);

const errorRed = "#ce1515";
const successGreen = "#2dc214";

function popupMessage(message, color) {
    let popupAlert = document.getElementById('alert');
    popupAlert.style.backgroundColor = color;
    popupAlert.innerText = message;
    popupAlert.style.animation = "fadeInOut 5s";
    const newone = popupAlert.cloneNode(true);
    popupAlert.parentNode.replaceChild(newone, popupAlert);
    popupAlert = newone;
}

let table;
const POINT_TARGET = 400;
function getTotalPoints() {
    const data = table.getData();
    let points = 0;
    for (const row of data) {
        if (row.Solved) {
            points += row.Points;
        }
    }
    return points;
}

let targetWaterLevel = 0;
function checkPointsAndUpdateWater() {
    targetWaterLevel = getTotalPoints() / POINT_TARGET * 100;
}

function changeProgress(formElem) {
    const text = formElem.parentNode.children[0];
    const newValue = text.value;
    const question = formElem.parentNode.parentNode.parentNode.children[2].innerText;
    socket.emit("requestChangeProgress", { question, newValue });
}
socket.on('changeProgress', data => {
    const rows = table.searchRows("Question", "=", data.question);
    const row = rows[0];
    const cells = row.getCells();
    cells[3].setValue(data.newValue);
});

function submitQuestion(formElem) {
    const text = formElem.parentNode.children[0];
    const submissionID = text.value;
    text.value = "";
    const question = formElem.parentNode.parentNode.parentNode.children[2].innerText;
    socket.emit("requestSubmitAnswer", { question, submissionID });
}
socket.on('submitAnswerAccept', question => {
    const rows = table.searchRows("Question", "=", question);
    const row = rows[0];
    const cells = row.getCells();
    cells[4].setValue(true);
    popupMessage("Accepted!", successGreen);
    checkPointsAndUpdateWater();
});
socket.on('submitAnswerReject', error => {
    popupMessage(error, errorRed);
});


window.addEventListener('DOMContentLoaded', _e => {


var canvas = document.getElementById("canvas"),
		ctx = canvas.getContext("2d"),
		aniId;

const numParticles = 10;
var w = canvas.width,
		h = canvas.height,
	 	particles = [],
	 	waterLevel = 0,
		color = "#34A7C1",
		c;

function particle(x, y, d){
	this.x = x;
	this.y = y;
	this.d = d;
	this.respawn = function(){
        const waterHeight = h - (waterLevel/100) * h;
		this.x = Math.random()*(w * 0.8) + (0.1 * w);
		this.y = Math.random()*30 + waterHeight + 75;
		this.d = Math.random()*2 + 5;
	};
}
function init(){
	c = 0;
	particles = [];
	for(var i=0; i < numParticles; i++) {
		var obj = new particle(0,0,0);
		obj.respawn();
		particles.push(obj);
	}
	aniId = window.requestAnimationFrame(draw);
}
function draw(){
	ctx.clearRect(0,0,w,h);
	ctx.fillStyle = color;
	ctx.strokeStyle = color;

	//draw the liquid
	ctx.beginPath();
    const waveAmplitude = h * 0.01;
	const waveHeight = (waveAmplitude * Math.sin(c*1/50));
    const waterHeight = h - (waterLevel/100) * h;
	ctx.moveTo(w,waterHeight);
	ctx.lineTo(w,h);
	ctx.lineTo(0,h);
	ctx.lineTo(0,waterHeight);
	ctx.bezierCurveTo((w/3), waterHeight-waveHeight, (2*w/3), waterHeight+waveHeight, w, waterHeight);
	ctx.fill();

	//draw the bubbles
	for(var i=0; i < numParticles; i++) {
		ctx.beginPath();
		ctx.arc(particles[i].x,particles[i].y,particles[i].d,0,2*Math.PI);
		ctx.stroke();
	}

    if (waterLevel != targetWaterLevel) {
        const diff = targetWaterLevel - waterLevel;
        if (diff <= 0.05) {
            waterLevel = targetWaterLevel;
        }
        else {
            const sign = Math.abs(diff) / diff;
            waterLevel += sign * diff * 0.05;
        }
    }

	ctx.fillStyle = "#000000";
    const barHpercent = 0.1;
    const barY = w*barHpercent;
    const barW = 5;
    ctx.fillRect(w-barY,h/4,w*barHpercent,barW);
    ctx.fillRect(w-barY,2*h/4,w*barHpercent,barW);
    ctx.fillRect(w-barY,3*h/4,w*barHpercent,barW);
    ctx.fillRect(w-barY,h,w*barHpercent,barW);

	update();
	aniId = window.requestAnimationFrame(draw);
}

function update() {
	c++;
	if(100*Math.PI <= c)
		c = 0;
	for(var i=0; i < numParticles; i++) {
		particles[i].x = particles[i].x + Math.random()*2 - 1;
		particles[i].y = particles[i].y - 1;
		particles[i].d = particles[i].d - 0.06;
		if(particles[i].d <= 0)
			particles[i].respawn();
	}
}

function resizeCanvas() {
	//update the size
	w = canvas.width = 100;
	h = canvas.height = window.innerWidth;
	//stop the animation befor restarting it
	window.cancelAnimationFrame(aniId);
	init();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

console.log("Ready!");

socket.emit("requestAllQuestionData");
socket.on("allQuestionData", questionData => {
console.log('received data', questionData.length);

table = new Tabulator("#example-table", {
    data: questionData, //assign data to table
    layout: "fitColumns",
    columns:[ //Define Table Columns
        {title:"Points", field:"Points", width: 100, vertAlign: "middle", hozAlign:"center", formatter: "money"}, // hack to round to 2 decimals
        {title:"Question", field:"Slug", widthGrow: 1, vertAlign: "middle", sorter:"alphanum", formatter:"link", formatterParams:{
                labelField: "Question",
                urlPrefix: "https://leetcode.com/problems/",
                target: "_blank",
            }
        },
        {title:"Submission link", field:"Submit", vertAlign: "middle", hozAlign:"center", width: 200,
            headerTooltip:function(e, cell, onRendered) {
                //e - mouseover event
                //cell - cell component
                //onRendered - onRendered callback registration function
                var el = document.createElement("div");
                el.style.borderRadius = "10px";
                el.innerText = "Your submission link - i.e. https://leetcode.com/problems/two-sum/submissions/1234567890";
                return el;
            },
            formatter: function (cell, formatterParams, onRendered) {
                return `<form style="user-select: none;" onsubmit="return false"><input style="width: 100px;" type="text" maxlength="1024" autocomplete="off"/><button onClick="submitQuestion(this)">Submit</button>`;
            },
        },
        {title:"Claimed by", field:"InProgress", vertAlign: "middle", hozAlign:"center", width: 200,
            formatter: function (cell, formatterParams, onRendered) {
                return `<form style="user-select: none;" onsubmit="return false"><input style="user-select: none; width: 100px;" type="text" maxlength="20" autocomplete="off" value="${cell.getValue()}"/><button onClick="changeProgress(this)">Submit</button>`;
            },
        },
        {title:"Solved", field:"Solved", vertAlign: "middle",  hozAlign:"center",width: 100, formatter:"tickCross"},
    ],
});

table.on("tableBuilt", checkPointsAndUpdateWater);
table.on("rowSelected", row => {
    console.log(row);
});

});


});
