require('dotenv').config()
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fetch = require('node-fetch');
const { Headers } = fetch;
const fs = require('fs');

// dotenv secrets
// Use postman interceptor (or manually check your cookies) to get these values
const SECRET_uuuserid = process.env.SECRET_uuuserid;
const SECRET_random_uuid = process.env.SECRET_random_uuid;

const SECRET_INGRESSCOOKIE = process.env.INGRESSCOOKIE;
const SECRET_LEETCODE_SESSION = process.env.LEETCODE_SESSION;
const SECRET___cf_bm = process.env.__cf_bm;
const SECRET_crsftoken = process.env.crsftoken;
const SECRET_ip_check = process.env.ip_check;
const ALL_COOKIES = ["INGRESS_COOKIE="+SECRET_INGRESSCOOKIE, "LEETCODE_SESSION="+SECRET_LEETCODE_SESSION, "__cf_bm"+SECRET___cf_bm, "crsftoken="+SECRET_crsftoken, "ip_check="+SECRET_ip_check].join("; ");



const publicFolder = '/public';
const app = express();
const server = http.createServer(app);

app.get('/', (req, res) => {
    res.sendFile(__dirname + publicFolder + '/index.html')
});

app.use(publicFolder, express.static(__dirname + publicFolder));

const port = process.env.PORT || 4000;
server.listen(port);
console.log("Server running on port", port);

const io = new Server(server);
const SOCKET_LIST = {};

const contestStartEpoch = 0;
// const contestStartEpoch = 1721239200; // Enter the starting timestamp of the event


// Naive CSV parsing
function parseCSV(data) {
    const rows = data.split('\n').filter(item => item.length !== 0);
    const result = [];
    const columns = rows[0].split(',');
    for (let i = 1; i < rows.length; i++) {
        const obj = {};
        const row = rows[i].split(','); // WRONG!

        columns.forEach((header, index) => {
            obj[header.trim()] = row[index].trim();
        });

        result.push(obj);
    }
    return result;
}


function readAndNormalizeQuestionData() {
    let questionData;
    try {
        const data = fs.readFileSync('questions.csv', 'utf8');
        questionData = parseCSV(data);
    } catch (err) {
        throw err;
    }

    let i = 0;
    for (const entry of questionData) {
        // Normalize data... Convert to nunmbers and bools, and attach index for client
        i += 1;
        entry.id = i;
        entry["Points"] = Number(entry["Points"]);
        entry["Solved"] = entry["Solved"] == "true";
    }

    return questionData;
}


// Global question data object - accessed by all sockets
const questionData = readAndNormalizeQuestionData();

function getQuestion(questionName) {
    // Linear search - this is not good but there aren't many questions
    for (const q of questionData) {
        if (q["Question"] == questionName) {
            return q;
        }
    }
    return undefined;
}

async function getSubmissionJSON(submissionID) {
    var myHeaders = new Headers();
    myHeaders.append("sec-ch-ua", "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Brave\";v=\"126\"");
    myHeaders.append("sec-ch-ua-mobile", "?0");
    myHeaders.append("authorization", "");
    myHeaders.append("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
    myHeaders.append("content-type", "application/json");
    myHeaders.append("sec-ch-ua-platform-version", "\"6.9.9\"");
    myHeaders.append("uuuserid", SECRET_uuuserid);
    myHeaders.append("random-uuid", SECRET_random_uuid);
    myHeaders.append("x-csrftoken", SECRET_crsftoken);
    myHeaders.append("sec-ch-ua-model", "\"\"");
    myHeaders.append("sec-ch-ua-platform", "\"Linux\"");
    myHeaders.append("Accept", "*/*");
    myHeaders.append("Sec-GPC", "1");
    myHeaders.append("Sec-Fetch-Site", "same-origin");
    myHeaders.append("Sec-Fetch-Mode", "cors");
    myHeaders.append("Sec-Fetch-Dest", "empty");
    myHeaders.append("host", "leetcode.com");
    console.log(ALL_COOKIES);
    myHeaders.append("Cookie", ALL_COOKIES);

    var raw = JSON.stringify({
      "query": "\n    query submissionDetails($submissionId: Int!) {\n  submissionDetails(submissionId: $submissionId) {timestamp\n    statusCode\n  question {\n      titleSlug\n }\n }\n}\n    ",
      "variables": {
        "submissionId": parseInt(submissionID)
      },
      "operationName": "submissionDetails"
    });

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
    };

    try {
        const response = await fetch("https://leetcode.com/graphql/", requestOptions);
        if (!response.ok) {
            console.log(`HTTP error! Status: ${response.status}`);
            return undefined;
        }
        const data = await response.json(); // or response.text() for plain text
        console.log("Response:\n", data);
        return data;
    } catch (error) {
        console.log("Error fetching data:", error);
    }
    return undefined;
}

function writeDataToCSV() {
    const strings = ["Points,Question,Slug,InProgress,Solved"];
    for (const row of questionData) {
        strings.push(row.Points+","+row.Question+","+row.Slug+","+row.InProgress+","+row.Solved);
    }
    const output = strings.join("\n");

    // This is also not the best way to do this... very fragile
    // const epoch = Math.floor(Date.now() / 1000);
    // const backup = `backup_${epoch}.csv`;
    // console.log("Writing", output.length, "bytes to", backup);
    // try {
    //     fs.writeFileSync(backup, output);
    // } catch (err) {
    //     console.error(err);
    // }

    try {
        fs.writeFileSync('questions.csv', output);
    } catch (err) {
        console.error(err);
    }
}

// Input handling for html
function sanitize(string) {
  const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      "/": '&#x2F;',
      ",": '',
  };
  const reg = /[&<>"'/,]/ig;
  return string.replace(reg, (match)=>(map[match]));
}


io.on("connection", socket => {
    SOCKET_LIST[socket.id] = socket


    socket.on('requestAllQuestionData', _ => {
        socket.emit('allQuestionData', questionData);
    });

    socket.on('requestChangeProgress', data => {
        data.newValue = sanitize(data.newValue);
        const question = getQuestion(data.question);
        if (!question) return;
        question["InProgress"] = data.newValue;
        writeDataToCSV();
        io.emit('changeProgress', data);
    });

    socket.on('requestSubmitAnswer', async data => {
        const question = getQuestion(data.question);
        if (!question) return;
        if (question["Solved"]) {
            console.log("Already solved");
            socket.emit('submitAnswerReject', "This question has already been solved!");
            return;
        }

        const matches = data.submissionID.match(/\d+/g);
        if (!matches) {
            console.log("Bad submission link", data.submissionID);
            socket.emit('submitAnswerReject', "Invalid submission link!");
            return;
        }
        const submissionID = matches[matches.length-1];
        console.log(submissionID);
        const res = await getSubmissionJSON(submissionID);
        try {
            console.log(res.data);
            if (!res.data.submissionDetails) {
                socket.emit('submitAnswerReject', "Something went wrong...");
                return;
            }
            const timestamp = res.data.submissionDetails.timestamp;
            const statusCode = res.data.submissionDetails.statusCode;
            const slug = res.data.submissionDetails.question.titleSlug;
            const expectedSlug = question["Slug"];
            if (slug != expectedSlug) {
                console.log("Wrong question", res, slug, expectedSlug);
                socket.emit('submitAnswerReject', "Your submission link is for the wrong question!");
                return;
            }
            if (statusCode != 10) { // Apparently '10' is AC
                console.log("Not AC", res, statusCode);
                socket.emit('submitAnswerReject', "Your submission was not Accepted!");
                return;
            }
            if (timestamp < contestStartEpoch) {
                console.log("Too old", res, timestamp, contestStartEpoch);
                socket.emit('submitAnswerReject', "Your submission is too old!");
                return;
            }
            // After all these checks, accept the submission
        }
        catch (e) {
            console.log("Something went wrong parsing response", e);
            socket.emit('submitAnswerReject', "Something went wrong... " + e);
            return;
        }
        question["Solved"] = true;
        writeDataToCSV();
        console.log("Solved", data);
        socket.emit('submitAnswerAccept', data.question);
    });

    socket.on("disconnect", () => {
        delete SOCKET_LIST[socket.id]
    })
})

